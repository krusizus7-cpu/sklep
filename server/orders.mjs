import { createHash, randomUUID } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { validateMerchant, validateProduct, validateShipping } from './config.mjs';
import { openAudit, revisionOf, stockReasons, writeTransaction } from './admin-data.mjs';

export const orderIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const maxUnits = 40;
export const maxPerProduct = 20;
export const orderPageSize = 50;
const adminOrderFilters = new Map([
  ['all', '1 = 1'],
  ['awaiting', "status IN ('registering', 'pending')"],
  ['confirmed', "status = 'paid'"],
  ['shipped', "status = 'paid' AND shippedAt IS NOT NULL"],
  ['paid', "status = 'paid' AND shippedAt IS NULL"],
  ['pending', "status = 'pending'"],
  ['registering', "status = 'registering'"],
  ['cancelled', "status = 'cancelled'"]
]);

export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function parseOrder(input) {
  if (!input || typeof input.requestId !== 'string' || !orderIdPattern.test(input.requestId) ||
      !Array.isArray(input.items) || !input.items.length || input.items.length > maxUnits ||
      !Number.isSafeInteger(input.expectedTotal) || input.expectedTotal <= 0 ||
      (input.expectedTermsUrl !== undefined &&
        (typeof input.expectedTermsUrl !== 'string' || input.expectedTermsUrl.length > 500))) {
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
  return {requestId: input.requestId.toLowerCase(), expectedTotal: input.expectedTotal, expectedTermsUrl: input.expectedTermsUrl,
    items, units, customer, fingerprint};
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
    CREATE TABLE IF NOT EXISTS catalogEdits (
      id TEXT PRIMARY KEY,
      item TEXT NOT NULL
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
      trackingNumber TEXT,
      accountId TEXT
    );
  `);
  db.prepare("INSERT OR IGNORE INTO metadata VALUES ('mode', ?)").run(mode);
  if (db.prepare("SELECT value FROM metadata WHERE key = 'mode'").get().value !== mode) {
    db.close();
    throw new Error('Użyj osobnych baz danych dla sandboxa i sprzedaży.');
  }
  db.exec(`
    CREATE TABLE IF NOT EXISTS archivedProducts (id TEXT PRIMARY KEY);
    CREATE TABLE IF NOT EXISTS shopSettings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
  `);
  const baseProducts = new Map(shop.products.map(product => [product.id, product]));
  const edits = db.prepare('SELECT id, item FROM catalogEdits ORDER BY id');
  const edit = db.prepare('SELECT item FROM catalogEdits WHERE id = ?');
  const isArchived = db.prepare('SELECT 1 FROM archivedProducts WHERE id = ?');
  const readSettings = db.prepare('SELECT key, value FROM shopSettings');
  const audit = openAudit(db);
  const transaction = action => writeTransaction(db, action);
  function settings() {
    const values = {
      merchant: shop.merchant ?? null,
      shipping: shop.shipping ?? {firstCents: 0, additionalCents: 0},
      lowStock: 5
    };
    for (const row of readSettings.all()) {
      if (Object.hasOwn(values, row.key)) values[row.key] = JSON.parse(row.value);
    }
    return {...values, revision: {
      merchant: revisionOf(values.merchant), shipping: revisionOf(values.shipping), lowStock: revisionOf(values.lowStock)
    }};
  }
  function catalog() {
    return [...new Map([...baseProducts, ...edits.all().map(row => [row.id, JSON.parse(row.item)])]).values()];
  }
  function productById(id) {
    const row = edit.get(id);
    return row ? JSON.parse(row.item) : baseProducts.get(id);
  }
  const seedStock = db.prepare('INSERT OR IGNORE INTO stock VALUES (?, ?)');
  const readStock = db.prepare('SELECT available FROM stock WHERE id = ?');
  const selectOrder = db.prepare('SELECT * FROM orders WHERE id = ?');
  const byRequest = db.prepare('SELECT * FROM orders WHERE requestId = ?');
  function adminProduct(product) {
    const archived = Boolean(isArchived.get(product.id));
    return {
      ...product, archived, stock: readStock.get(product.id)?.available ?? 0,
      revision: revisionOf([product, archived])
    };
  }

  function checkProduct(id, expectedStock, expectedRevision) {
    const product = productById(id);
    const current = product && adminProduct(product);
    if ((readStock.get(id)?.available ?? null) !== expectedStock || (current?.revision ?? null) !== expectedRevision) {
      throw new HttpError(409, 'Produkt lub dostępność zmieniły się. Odśwież formularz.');
    }
    return current;
  }

  transaction(() => {
    if (!db.prepare('PRAGMA table_info(orders)').all().some(column => column.name === 'accountId')) {
      db.exec('ALTER TABLE orders ADD COLUMN accountId TEXT');
    }
    db.exec('CREATE INDEX IF NOT EXISTS ordersByAccount ON orders(accountId, createdAt)');
    db.exec("CREATE INDEX IF NOT EXISTS ordersByPaidAt ON orders(paidAt) WHERE status = 'paid'");
    db.exec('CREATE INDEX IF NOT EXISTS ordersByStatus ON orders(status, createdAt, id)');
    for (const product of catalog()) seedStock.run(product.id, product.stock);
  });

  return {
    available: id => readStock.get(id)?.available ?? 0,
    get: id => unpack(selectOrder.get(id)),
    catalog: () => catalog().filter(product => !isArchived.get(product.id))
      .map(product => ({...product, stock: readStock.get(product.id)?.available ?? 0})),
    adminCatalog: () => catalog().map(adminProduct),
    adminProduct(id) {
      const product = productById(id);
      return product && adminProduct(product);
    },
    audit: audit.list,
    settings,
    saveSetting(section, value, expectedRevision, actor) {
      if (section === 'merchant') validateMerchant(value, mode === 'live');
      else if (section === 'shipping') validateShipping(value);
      else if (section !== 'lowStock' || !Number.isSafeInteger(value) || value < 1 || value > 100000) {
        throw new HttpError(400, 'Wprowadź próg od 1 do 100 000 sztuk.');
      }
      transaction(() => {
        const current = settings();
        if (current.revision[section] !== expectedRevision) throw new HttpError(409, 'Ustawienia zmieniły się. Odśwież formularz.');
        if (revisionOf(value) === expectedRevision) return;
        db.prepare('INSERT INTO shopSettings VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value')
          .run(section, JSON.stringify(value));
        audit.write(actor, 'ustawienia', 'settingsSaved', section);
      });
    },
    forAccount(accountId, offset = 0) {
      return db.prepare('SELECT id, status, items, shipping, total, createdAt, paidAt, shippedAt, trackingNumber FROM orders WHERE accountId = ? ORDER BY createdAt DESC, id DESC LIMIT ? OFFSET ?')
        .all(accountId, orderPageSize + 1, offset).map(row => ({ ...row, items: JSON.parse(row.items) }));
    },
    /** @param {string | null} [actor] */
    saveProduct(product, expectedStock, expectedRevision, actor = null, reason = '') {
      validateProduct(product, mode === 'live');
      transaction(() => {
        const current = checkProduct(product.id, expectedStock, expectedRevision);
        const adjustsStock = current && current.stock !== product.stock;
        if (adjustsStock && !Object.hasOwn(stockReasons, reason)) {
          throw new HttpError(400, 'Wybierz powód korekty stanu.');
        }
        db.prepare('INSERT INTO catalogEdits VALUES (?, ?) ON CONFLICT(id) DO UPDATE SET item = excluded.item')
          .run(product.id, JSON.stringify(product));
        db.prepare('INSERT INTO stock VALUES (?, ?) ON CONFLICT(id) DO UPDATE SET available = excluded.available')
          .run(product.id, product.stock);
        audit.write(actor, 'produkty', current ? 'productUpdated' : 'productCreated', product.id);
        if (adjustsStock) {
          audit.write(actor, 'magazyn', 'stockCorrected', product.id,
            {previous: current.stock, quantity: product.stock, reason});
        }
      });
    },
    setArchived(id, archived, expectedStock, expectedRevision, actor) {
      transaction(() => {
        const current = checkProduct(id, expectedStock, expectedRevision);
        if (!current) throw new HttpError(404, 'Nie znaleziono produktu.');
        if (current.archived === archived) return;
        if (archived) db.prepare('INSERT INTO archivedProducts VALUES (?)').run(id);
        else db.prepare('DELETE FROM archivedProducts WHERE id = ?').run(id);
        audit.write(actor, 'produkty', archived ? 'productArchived' : 'productRestored', id);
      });
    },
    correctStock(id, quantity, expectedStock, expectedRevision, reason, actor) {
      if (!Number.isSafeInteger(quantity) || quantity < 0 || quantity > 100000 || !Object.hasOwn(stockReasons, reason)) {
        throw new HttpError(400, 'Podaj poprawny stan i powód korekty.');
      }
      transaction(() => {
        const current = checkProduct(id, expectedStock, expectedRevision);
        if (!current) throw new HttpError(404, 'Nie znaleziono produktu.');
        if (quantity === current.stock) return;
        db.prepare('UPDATE stock SET available = ? WHERE id = ?').run(quantity, id);
        audit.write(actor, 'magazyn', 'stockCorrected', id, {previous: current.stock, quantity, reason});
      });
    },
    adminOrders(status, offset = 0, search = '', limit = orderPageSize + 1) {
      const where = adminOrderFilters.get(status);
      if (!where) return [];
      return db.prepare('SELECT id, status, total, createdAt, paidAt, shippedAt, providerOrderId FROM orders WHERE (' + where +
        ") AND id LIKE ? ESCAPE '\\' ORDER BY createdAt DESC, id DESC LIMIT ? OFFSET ?")
        .all(search.replace(/[\\%_]/g, '\\$&') + '%', limit, offset);
    },
    countOrders(status) {
      const where = adminOrderFilters.get(status);
      return where ? Number(db.prepare('SELECT count(*) AS total FROM orders WHERE ' + where).get().total) : 0;
    },
    paidBetween(from, until) {
      return db.prepare("SELECT paidAt, total, items FROM orders WHERE status = 'paid' AND paidAt >= ? AND paidAt < ? ORDER BY paidAt DESC, id DESC")
        .all(from, until);
    },
    /** @param {any} input @param {string | null} accountId */
    reserve(input, accountId = null) {
      const order = parseOrder(input);
      return transaction(() => {
        const existing = unpack(byRequest.get(order.requestId));
        if (existing) {
          if (existing.fingerprint !== order.fingerprint || existing.accountId !== accountId) throw new HttpError(409, 'Dane zamówienia się zmieniły.');
          return existing;
        }
        const snapshots = [];
        let subtotal = 0;
        for (const [id, quantity] of order.items) {
          const product = productById(id);
          if (!product || isArchived.get(id) || (readStock.get(id)?.available ?? 0) < quantity) {
            throw new HttpError(409, 'Brakuje wybranej liczby sztuk. Sprawdź dostępność w katalogu.');
          }
          snapshots.push({id, quantity, priceCents: product.priceCents, name: product.brand + ' ' + product.name, size: product.size});
          subtotal += product.priceCents * quantity;
        }
        const {shipping: rates, merchant} = settings();
        // Older clients may omit this field while the configured default is still in use.
        if ((order.expectedTermsUrl ?? shop.merchant.termsUrl) !== merchant.termsUrl) {
          throw new HttpError(409, 'Regulamin sklepu się zmienił. Odśwież zamówienie i zapoznaj się z aktualnym regulaminem.');
        }
        const shipping = rates.firstCents + (order.units - 1) * rates.additionalCents;
        const total = subtotal + shipping;
        if (total !== order.expectedTotal) throw new HttpError(409, 'Cena lub koszt dostawy się zmieniły. Sprawdź podsumowanie.');
        const id = randomUUID();
        db.prepare(`INSERT INTO orders (id, requestId, fingerprint, status, items, customer, shipping, total, termsUrl, createdAt, accountId)
          VALUES (?, ?, ?, 'registering', ?, ?, ?, ?, ?, ?, ?)`).run(id, order.requestId, order.fingerprint,
          JSON.stringify(snapshots), JSON.stringify(order.customer), shipping, total, merchant.termsUrl, new Date().toISOString(), accountId);
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
        if (!order || order.status === 'cancelled' || (order.providerOrderId && order.providerOrderId !== providerOrderId)) {
          throw new HttpError(409, 'Zamówienie nie odpowiada tej płatności.');
        }
        const found = db.prepare('SELECT id FROM orders WHERE providerOrderId = ?').get(providerOrderId);
        if (found && found.id !== id) throw new HttpError(409, 'Płatność jest już przypisana.');
        db.prepare('UPDATE orders SET providerOrderId = ? WHERE id = ?').run(providerOrderId, id);
      });
    },
    markPaid(id, providerOrderId, actor = null) {
      transaction(() => {
        const order = selectOrder.get(id);
        if (!order || order.providerOrderId !== providerOrderId || order.status === 'cancelled') {
          throw new HttpError(409, 'Zamówienie nie odpowiada tej płatności.');
        }
        if (order.status === 'paid') return;
        db.prepare("UPDATE orders SET status = 'paid', paidAt = COALESCE(paidAt, ?), token = NULL WHERE id = ?")
          .run(new Date().toISOString(), id);
        audit.write(actor, 'platnosci', 'paymentReconciled', id);
      });
    },
    list(status) {
      return db.prepare('SELECT id, status, total, providerOrderId, createdAt, paidAt, shippedAt FROM orders WHERE status = ? ORDER BY createdAt DESC').all(status);
    },
    /** @param {string | null} [actor] */
    markShipped(id, trackingNumber, actor = null) {
      transaction(() => {
        const result = db.prepare("UPDATE orders SET shippedAt = ?, trackingNumber = ? WHERE id = ? AND status = 'paid' AND shippedAt IS NULL")
          .run(new Date().toISOString(), trackingNumber, id);
        if (!result.changes) throw new Error('Wysyłkę można zapisać tylko raz, dla opłaconego zamówienia.');
        audit.write(actor, 'zamowienia', 'orderShipped', id);
      });
    },
    setStock(id, quantity) {
      if (!productById(id) || !Number.isSafeInteger(quantity) || quantity < 0 || quantity > 100000) throw new Error('Nieprawidłowy SKU lub stan.');
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
