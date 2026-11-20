import { createHash, randomBytes, randomUUID, scrypt, timingSafeEqual } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { promisify } from 'node:util';

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
  `);
  const select = db.prepare('SELECT * FROM accounts WHERE email = ?');

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
    async authenticate(email, password) {
      email = normalized(email);
      if (!validEmail(email) || Buffer.byteLength(password) > 128) return null;
      const account = select.get(email);
      const hash = Buffer.from(await derive(password, account?.salt || '0'.repeat(32), 64));
      if (!timingSafeEqual(hash, Buffer.from(account?.passwordHash || '0'.repeat(128), 'hex')) || !account) return null;
      return {id: account.id, email: account.email, role: account.role};
    },
    startSession(accountId) {
      const token = randomBytes(32).toString('base64url');
      const now = Math.floor(Date.now() / 1000);
      db.prepare('DELETE FROM accountSessions WHERE expiresAt <= ?').run(now);
      db.prepare('INSERT INTO accountSessions VALUES (?, ?, ?)').run(digestToken(token), accountId, now + sessionAge);
      return {token, maxAge: sessionAge};
    },
    session(token) {
      if (!/^[\w-]{43}$/.test(token ?? '')) return null;
      const account = db.prepare(`SELECT accounts.id, accounts.email, accounts.role FROM accountSessions
        JOIN accounts ON accounts.id = accountSessions.accountId
        WHERE accountSessions.hash = ? AND accountSessions.expiresAt > ?`)
        .get(digestToken(token), Math.floor(Date.now() / 1000));
      return account ? {...account} : null;
    },
    endSession(token) {
      if (token) db.prepare('DELETE FROM accountSessions WHERE hash = ?').run(digestToken(token));
    },
    close: () => db.close()
  };
}
