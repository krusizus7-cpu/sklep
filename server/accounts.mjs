import { createHash, randomBytes, randomUUID, scrypt, timingSafeEqual } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { promisify } from 'node:util';
import { openAudit, writeTransaction } from './admin-data.mjs';
import { HttpError } from './orders.mjs';

const derive = promisify(scrypt);
const sessionAge = 14 * 24 * 60 * 60;
const digestToken = token => createHash('sha256').update(token).digest('hex');
const normalized = email => email.trim().toLowerCase();
const validEmail = email => email.length <= 50 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

export function accountDbPath(env = process.env) {
  return env.P24_MODE && env.P24_MODE !== 'preview'
    ? resolve(/* turbopackIgnore: true */ env.BIEZNIK_DB || 'data/shop.sqlite')
    : resolve(/* turbopackIgnore: true */ env.BIEZNIK_PREVIEW_DB || 'data/preview.sqlite');
}

export function openAccounts(path) {
  mkdirSync(dirname(path), {recursive: true, mode: 0o700});
  const db = new DatabaseSync(path);
  db.exec(`
    PRAGMA busy_timeout = 5000;
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS accounts (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      role TEXT NOT NULL CHECK (role IN ('customer', 'admin')),
      salt TEXT NOT NULL,
      passwordHash TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS accountSessions (
      hash TEXT PRIMARY KEY,
      accountId TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
      expiresAt INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS accountSessionsExpiry ON accountSessions(expiresAt);
    CREATE INDEX IF NOT EXISTS accountSessionsByAccount ON accountSessions(accountId);
    CREATE TABLE IF NOT EXISTS blockedCustomers (
      accountId TEXT PRIMARY KEY REFERENCES accounts(id) ON DELETE CASCADE,
      blockedAt TEXT NOT NULL
    );
  `);
  const audit = openAudit(db);
  const select = db.prepare(`SELECT accounts.*, blockedCustomers.blockedAt FROM accounts
    LEFT JOIN blockedCustomers ON blockedCustomers.accountId = accounts.id WHERE email = ?`);
  const accountList = `SELECT accounts.id, email, role, blockedAt FROM accounts
    LEFT JOIN blockedCustomers ON blockedCustomers.accountId = accounts.id`;
  const adminAccount = db.prepare(accountList + ' WHERE accounts.id = ?');

  async function create(email, password, role) {
    email = normalized(email);
    if (!validEmail(email) || password.length < 12 || Buffer.byteLength(password) > 128) {
      throw new Error('Podaj poprawny e-mail i hasło od 12 do 128 znaków (maks. 128 bajtów).');
    }
    const salt = randomBytes(16).toString('hex');
    const passwordHash = Buffer.from(await derive(password, salt, 64)).toString('hex');
    const id = randomUUID();
    const result = db.prepare('INSERT OR IGNORE INTO accounts VALUES (?, ?, ?, ?, ?)').run(id, email, role, salt, passwordHash);
    if (!result.changes) throw new Error('Nie udało się utworzyć konta dla tego adresu.');
    return {id, email, role};
  }

  return {
    create: (email, password) => create(email, password, 'customer'),
    createAdmin: (email, password) => create(email, password, 'admin'),
    adminAccounts(search = '', filter = 'all', offset = 0, limit = 26) {
      const status = filter === 'blocked' ? ' AND blockedAt IS NOT NULL' : filter === 'active' ? ' AND blockedAt IS NULL' : '';
      return db.prepare(accountList + ' WHERE instr(email, ?) > 0' + status + ' ORDER BY email, accounts.id LIMIT ? OFFSET ?')
        .all(normalized(search), limit, offset);
    },
    adminAccount: id => adminAccount.get(id),
    setCustomerBlocked(id, blocked, actor) {
      writeTransaction(db, () => {
        const account = adminAccount.get(id);
        if (account?.role !== 'customer') throw new HttpError(404, 'Nie znaleziono konta klienta.');
        if (Boolean(account.blockedAt) === blocked) return;
        if (blocked) {
          db.prepare('INSERT INTO blockedCustomers VALUES (?, ?)').run(id, new Date().toISOString());
          db.prepare('DELETE FROM accountSessions WHERE accountId = ?').run(id);
        } else {
          db.prepare('DELETE FROM blockedCustomers WHERE accountId = ?').run(id);
        }
        audit.write(actor, 'uzytkownicy', blocked ? 'customerBlocked' : 'customerUnblocked', id);
      });
    },
    async authenticate(email, password) {
      email = normalized(email);
      if (!validEmail(email) || Buffer.byteLength(password) > 128) return null;
      const account = select.get(email);
      const hash = Buffer.from(await derive(password, account?.salt || '0'.repeat(32), 64));
      if (!timingSafeEqual(hash, Buffer.from(account?.passwordHash || '0'.repeat(128), 'hex')) || !account || account.blockedAt) return null;
      return {id: account.id, email: account.email, role: account.role};
    },
    startSession(accountId) {
      const token = randomBytes(32).toString('base64url');
      const now = Math.floor(Date.now() / 1000);
      db.prepare('DELETE FROM accountSessions WHERE expiresAt <= ?').run(now);
      const result = db.prepare(`INSERT INTO accountSessions
        SELECT ?, id, ? FROM accounts WHERE id = ? AND id NOT IN (SELECT accountId FROM blockedCustomers)`)
        .run(digestToken(token), now + sessionAge, accountId);
      if (!result.changes) return null;
      return {token, maxAge: sessionAge};
    },
    session(token) {
      if (!/^[\w-]{43}$/.test(token ?? '')) return null;
      const account = db.prepare(`SELECT accounts.id, accounts.email, accounts.role FROM accountSessions
        JOIN accounts ON accounts.id = accountSessions.accountId
        WHERE accountSessions.hash = ? AND accountSessions.expiresAt > ?
        AND accounts.id NOT IN (SELECT accountId FROM blockedCustomers)`)
        .get(digestToken(token), Math.floor(Date.now() / 1000));
      return account ? {...account} : null;
    },
    endSession(token) {
      if (token) db.prepare('DELETE FROM accountSessions WHERE hash = ?').run(digestToken(token));
    },
    close: () => db.close()
  };
}
