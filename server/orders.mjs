import { createHash, randomUUID } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

export const orderIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const maxUnits = 40;
export const maxPerProduct = 20;

export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function parseOrder(input) {
  if (!input || typeof input.requestId !== 'string' || !orderIdPattern.test(input.requestId) ||
      !Array.isArray(input.items) || !input.items.length || input.items.length > maxUnits ||
      !Number.isSafeInteger(input.expectedTotal) || input.expectedTotal <= 0) {
    throw new HttpError(400, 'Nieprawidłowe dane zamówienia.');
  }
  const items = new Map();
  let units = 0;
  for (const item of input.items) {
    if (!item || typeof item.id !== 'string' || !/^[\w-]{1,64}$/.test(item.id) ||
        !Number.isSafeInteger(item.quantity) || item.quantity < 1 || item.quantity > maxPerProduct ||
        items.has(item.id)) {
      throw new HttpError(400, 'Sprawdź produkty i liczbę sztuk w koszyku.');
    }
    units += item.quantity;
    items.set(item.id, item.quantity);
  }
  if (units > maxUnits) throw new HttpError(400, 'W jednym zamówieniu możesz kupić do 40 sztuk.');

  const customer = {};
  for (const [field, max] of Object.entries({name: 120, email: 50, phone: 24, street: 160, postcode: 6, city: 100})) {
    const value = input.customer?.[field];
    if (typeof value !== 'string' || !value.trim() || value.length > max || /[\u0000-\u001f\u007f]/.test(value)) {
      throw new HttpError(400, 'Sprawdź dane kontaktowe i adres dostawy.');
    }
    customer[field] = value.trim();
  }
  const digits = customer.phone.replace(/\D/g, '').length;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email) ||
      !/^\+?[0-9 ()-]+$/.test(customer.phone) || digits < 7 || digits > 15 ||
      !/^\d{2}-\d{3}$/.test(customer.postcode) || input.customer.termsAccepted !== true) {
    throw new HttpError(400, 'Sprawdź adres e-mail, telefon, kod pocztowy i akceptację regulaminu.');
  }
  const sortedItems = [...items].sort(([a], [b]) => a.localeCompare(b, 'en'));
  const fingerprint = createHash('sha256').update(JSON.stringify([sortedItems, input.expectedTotal, customer])).digest('hex');
  return {requestId: input.requestId.toLowerCase(), expectedTotal: input.expectedTotal, items, units, customer, fingerprint};
}

const unpack = row => row && {
  ...row, items: JSON.parse(row.items), customer: JSON.parse(row.customer)
};

export function openOrders(dbPath, shop, mode) {
  mkdirSync(dirname(dbPath), {recursive: true, mode: 0o700});
  const db = new DatabaseSync(dbPath);
  db.exec(`
    PRAGMA busy_timeout = 5000;
    PRAGMA journal_mode = WAL;
    PRAGMA synchronous = FULL;
    CREATE TABLE IF NOT EXISTS metadata (key TEXT PRIMARY KEY, value TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS stock (
      id TEXT PRIMARY KEY,
      available INTEGER NOT NULL CHECK (available >= 0)
    );
    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      requestId TEXT NOT NULL UNIQUE,
      fingerprint TEXT NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('registering', 'pending', 'paid', 'cancelled')),
      items TEXT NOT NULL,
      customer TEXT NOT NULL,
      shipping INTEGER NOT NULL,
      total INTEGER NOT NULL,
      termsUrl TEXT NOT NULL,
      token TEXT,
      tokenAt INTEGER,
      providerOrderId INTEGER UNIQUE,
      createdAt TEXT NOT NULL,
      paidAt TEXT,
      shippedAt TEXT,
      trackingNumber TEXT
    );
  `);
  db.prepare("INSERT OR IGNORE INTO metadata VALUES ('mode', ?)").run(mode);
  if (db.prepare("SELECT value FROM metadata WHERE key = 'mode'").get().value !== mode) {
    db.close();
    throw new Error('Użyj osobnych baz danych dla sandboxa i sprzedaży.');
  }
  const products = new Map(shop.products.map(product => [product.id, product]));
  const seedStock = db.prepare('INSERT OR IGNORE INTO stock VALUES (?, ?)');
  const readStock = db.prepare('SELECT available FROM stock WHERE id = ?');
  const selectOrder = db.prepare('SELECT * FROM orders WHERE id = ?');
  const byRequest = db.prepare('SELECT * FROM orders WHERE requestId = ?');
  function transaction(action) {
    db.exec('BEGIN IMMEDIATE');
    try {
      const result = action();
      db.exec('COMMIT');
      return result;
    } catch (error) {
      db.exec('ROLLBACK');
      throw error;
    }
  }

  transaction(() => {
    for (const product of products.values()) seedStock.run(product.id, product.stock);
  });

  return {
    available: id => readStock.get(id)?.available ?? 0,
    get: id => unpack(selectOrder.get(id)),
    reserve(input) {
      const order = parseOrder(input);
      return transaction(() => {
        const existing = unpack(byRequest.get(order.requestId));
        if (existing) {
          if (existing.fingerprint !== order.fingerprint) throw new HttpError(409, 'Dane zamówienia się zmieniły.');
          return existing;
        }
        const snapshots = [];
        let subtotal = 0;
        for (const [id, quantity] of order.items) {
          const product = products.get(id);
          if (!product || (readStock.get(id)?.available ?? 0) < quantity) {
            throw new HttpError(409, 'Brakuje wybranej liczby sztuk. Sprawdź dostępność w katalogu.');
          }
          snapshots.push({id, quantity, priceCents: product.priceCents, name: product.brand + ' ' + product.name, size: product.size});
          subtotal += product.priceCents * quantity;
        }
        const shipping = shop.shipping.firstCents + (order.units - 1) * shop.shipping.additionalCents;
        const total = subtotal + shipping;
        if (total !== order.expectedTotal) throw new HttpError(409, 'Cena lub koszt dostawy się zmieniły. Sprawdź podsumowanie.');
        const id = randomUUID();
        db.prepare(`INSERT INTO orders (id, requestId, fingerprint, status, items, customer, shipping, total, termsUrl, createdAt)
          VALUES (?, ?, ?, 'registering', ?, ?, ?, ?, ?, ?)`).run(id, order.requestId, order.fingerprint,
          JSON.stringify(snapshots), JSON.stringify(order.customer), shipping, total, shop.merchant.termsUrl, new Date().toISOString());
        const reserveStock = db.prepare('UPDATE stock SET available = available - ? WHERE id = ?');
        for (const [product, quantity] of order.items) reserveStock.run(quantity, product);
        return unpack(selectOrder.get(id));
      });
    },
    register(id, token, tokenAt) {
      db.prepare("UPDATE orders SET token = ?, tokenAt = ?, status = 'pending' WHERE id = ? AND status = 'registering'").run(token, tokenAt, id);
      return unpack(selectOrder.get(id));
    },
    recordNotification(id, providerOrderId) {
      return transaction(() => {
        const order = selectOrder.get(id);
        if (order.status === 'cancelled' || (order.providerOrderId && order.providerOrderId !== providerOrderId)) {
          throw new HttpError(409, 'Zamówienie nie odpowiada tej płatności.');
        }
        const found = db.prepare('SELECT id FROM orders WHERE providerOrderId = ?').get(providerOrderId);
        if (found && found.id !== id) throw new HttpError(409, 'Płatność jest już przypisana.');
        db.prepare('UPDATE orders SET providerOrderId = ? WHERE id = ?').run(providerOrderId, id);
      });
    },
    markPaid(id, providerOrderId) {
      const result = db.prepare(`UPDATE orders SET status = 'paid', paidAt = COALESCE(paidAt, ?), token = NULL
        WHERE id = ? AND providerOrderId = ? AND status != 'cancelled'`).run(new Date().toISOString(), id, providerOrderId);
      if (!result.changes) throw new HttpError(409, 'Zamówienie nie odpowiada tej płatności.');
    },
    list(status) {
      return db.prepare('SELECT id, status, total, providerOrderId, createdAt, paidAt, shippedAt FROM orders WHERE status = ? ORDER BY createdAt DESC').all(status);
    },
    markShipped(id, trackingNumber) {
      const result = db.prepare("UPDATE orders SET shippedAt = ?, trackingNumber = ? WHERE id = ? AND status = 'paid' AND shippedAt IS NULL")
        .run(new Date().toISOString(), trackingNumber, id);
      if (!result.changes) throw new Error('Wysyłkę można zapisać tylko raz, dla opłaconego zamówienia.');
    },
    setStock(id, quantity) {
      if (!products.has(id) || !Number.isSafeInteger(quantity) || quantity < 0 || quantity > 100000) throw new Error('Nieprawidłowy SKU lub stan.');
      db.prepare('UPDATE stock SET available = ? WHERE id = ?').run(quantity, id);
    },
    cancelUnpaid(id) {
      transaction(() => {
        const order = unpack(selectOrder.get(id));
        if (!order || !['registering', 'pending'].includes(order.status) || order.providerOrderId ||
            Date.parse(order.createdAt) > Date.now() - 30 * 60 * 1000) {
          throw new Error('Można zwolnić tylko rezerwację starszą niż 30 minut bez zgłoszonej płatności.');
        }
        db.prepare("UPDATE orders SET status = 'cancelled', token = NULL WHERE id = ?").run(id);
        const restore = db.prepare('UPDATE stock SET available = available + ? WHERE id = ?');
        for (const item of order.items) restore.run(item.quantity, item.id);
      });
    },
    close: () => db.close()
  };
}
