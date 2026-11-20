import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import test from 'node:test';
import { openAccounts } from '../server/accounts.mjs';
import { createCommerce } from '../server/commerce.mjs';
import { loadShop } from '../server/config.mjs';
import { openOrders } from '../server/orders.mjs';
import { createP24 } from '../server/p24.mjs';

const sku = 'wheel-test-18';
const actor = 'operator-test';
const password = 'przykladowe-dlugie-haslo';
const input = (expectedTotal = 92300) => ({
  requestId: randomUUID(),
  expectedTotal,
  items: [{id: sku, quantity: 1}],
  customer: {name: 'Jan Testowy', email: 'jan@example.com', phone: '500600700',
    street: 'Testowa 1', postcode: '00-001', city: 'Warszawa', termsAccepted: true}
});

function fixture(t) {
  const dir = mkdtempSync(join(tmpdir(), 'bieznik-admin-'));
  t.after(() => rmSync(dir, {recursive: true, force: true}));
  return {dbPath: join(dir, 'shop.sqlite'), shop: loadShop('shop.example.json')};
}

test('archive and stock corrections reject concurrent changes and retain order snapshots', t => {
  const {dbPath, shop} = fixture(t);
  const orders = openOrders(dbPath, shop, 'sandbox');
  t.after(() => orders.close());
  const stale = orders.adminProduct(sku);
  const existing = orders.reserve(input());
  assert.throws(() => orders.setArchived(sku, true, stale.stock, stale.revision, actor), {status: 409});
  const current = orders.adminProduct(sku);
  orders.setArchived(sku, true, current.stock, current.revision, actor);
  assert.equal(orders.catalog().some(item => item.id === sku), false);
  assert.throws(() => orders.reserve(input()), {status: 409});
  assert.equal(orders.get(existing.id).items[0].id, sku);
  const archived = orders.adminProduct(sku);
  orders.setArchived(sku, false, archived.stock, archived.revision, actor);
  const restored = orders.adminProduct(sku);
  orders.correctStock(sku, 2, restored.stock, restored.revision, 'count', actor);
  assert.equal(orders.available(sku), 2);
  assert.throws(() => orders.correctStock(sku, 3, restored.stock, restored.revision, 'count', actor), {status: 409});
  assert.deepEqual(orders.audit({module: 'magazyn'}).map(event => JSON.parse(event.detail)), [
    {previous: restored.stock, quantity: 2, reason: 'count'}
  ]);
});

test('new rates affect public checkout immediately and keep the amount of an existing reservation', t => {
  const {dbPath, shop} = fixture(t);
  const commerce = createCommerce({dbPath, shop, p24: {mode: 'sandbox'}});
  t.after(() => commerce.close());
  const orders = commerce.orders;
  const pending = input();
  const original = orders.reserve(pending);
  const settings = orders.settings();
  orders.saveSetting('shipping', {firstCents: 5000, additionalCents: 300}, settings.revision.shipping, actor);
  assert.equal(commerce.catalog().shipping.firstCents, 5000);
  assert.equal(orders.reserve(pending).total, original.total);
  assert.throws(() => orders.reserve(input()), {status: 409});
  assert.equal(orders.reserve(input(94900)).shipping, 5000);
  assert.throws(() => orders.saveSetting('shipping', settings.shipping, settings.revision.shipping, actor), {status: 409});
});

test('blocking a customer revokes current sessions and prevents login while preserving orders', async t => {
  const {dbPath, shop} = fixture(t);
  const accounts = openAccounts(dbPath);
  const orders = openOrders(dbPath, shop, 'sandbox');
  t.after(() => { accounts.close(); orders.close(); });
  const admin = await accounts.createAdmin('admin@example.com', password);
  const customer = await accounts.create('customer@example.com', password);
  const session = accounts.startSession(customer.id);
  const order = orders.reserve(input(), customer.id);
  accounts.setCustomerBlocked(customer.id, true, admin.id);
  assert.equal(accounts.session(session.token), null);
  assert.equal(await accounts.authenticate(customer.email, password), null);
  assert.equal(accounts.startSession(customer.id), null);
  assert.throws(() => accounts.setCustomerBlocked(admin.id, true, admin.id), {status: 404});
  assert.equal(orders.forAccount(customer.id)[0].id, order.id);
  accounts.setCustomerBlocked(customer.id, false, admin.id);
  assert.equal((await accounts.authenticate(customer.email, password)).id, customer.id);
  assert.equal(accounts.session(session.token), null);
  assert.equal(orders.audit({module: 'uzytkownicy'}).length, 2);
});

test('manual reconciliation protects the reservation before provider verification and audits payment once', async t => {
  const {dbPath, shop} = fixture(t);
  let commerce;
  let releaseVerification;
  let verificationStarted;
  const started = new Promise(resolve => { verificationStarted = resolve; });
  const verification = new Promise(resolve => { releaseVerification = resolve; });
  const t24 = createP24({mode: 'sandbox', merchantId: 123, posId: 124, crc: 'fixture', apiKey: 'fixture'}, async (url, request) => {
    if (url.includes('/transaction/by/sessionId/')) {
      const sessionId = url.split('/').at(-1);
      return Response.json({responseCode: 0, data: {sessionId, amount: 92300, currency: 'PLN', orderId: 42, status: 1}});
    }
    assert.equal(request.method, 'PUT');
    verificationStarted();
    await verification;
    return Response.json({responseCode: 0, data: {status: 'success'}});
  });
  commerce = createCommerce({dbPath, shop, p24: t24});
  t.after(() => commerce.close());
  const order = commerce.orders.reserve(input());
  const db = new DatabaseSync(dbPath);
  db.prepare('UPDATE orders SET createdAt = ? WHERE id = ?').run('2021-01-01T00:00:00.000Z', order.id);
  db.close();
  const first = commerce.reconcile(order.id, actor);
  const repeat = commerce.reconcile(order.id, actor);
  await started;
  try {
    assert.throws(() => commerce.orders.cancelUnpaid(order.id));
  } finally {
    releaseVerification();
  }
  await Promise.all([first, repeat]);
  await commerce.reconcile(order.id, actor);
  assert.equal(commerce.orders.get(order.id).status, 'paid');
  assert.equal(commerce.orders.audit({module: 'platnosci'}).length, 1);
});

test('opening a pre-panel database preserves orders, products, inventory and active accounts', async t => {
  const {dbPath, shop} = fixture(t);
  const db = new DatabaseSync(dbPath);
  db.exec(`
    CREATE TABLE accounts (id TEXT PRIMARY KEY, email TEXT, role TEXT, salt TEXT, passwordHash TEXT);
    INSERT INTO accounts VALUES ('legacy-customer', 'old@example.com', 'customer', 'salt', 'hash');
    CREATE TABLE stock (id TEXT PRIMARY KEY, available INTEGER NOT NULL);
    INSERT INTO stock VALUES ('wheel-test-18', 13);
    CREATE TABLE orders (id TEXT PRIMARY KEY, requestId TEXT UNIQUE, fingerprint TEXT, status TEXT,
      items TEXT, customer TEXT, shipping INTEGER, total INTEGER, termsUrl TEXT, token TEXT,
      tokenAt INTEGER, providerOrderId INTEGER, createdAt TEXT, paidAt TEXT, shippedAt TEXT, trackingNumber TEXT);
    INSERT INTO orders VALUES ('legacy-order', 'request', 'fingerprint', 'paid', '[]', '{}',
      5400, 92300, 'https://example.com/terms', NULL, NULL, 7, '2025-01-01T00:00:00.000Z',
      '2025-01-01T00:00:00.000Z', NULL, NULL);
  `);
  db.close();
  const orders = openOrders(dbPath, shop, 'sandbox');
  const accounts = openAccounts(dbPath);
  t.after(() => { orders.close(); accounts.close(); });
  assert.equal(orders.adminProduct(sku).stock, 13);
  assert.equal(orders.get('legacy-order').total, 92300);
  assert.equal(accounts.adminAccount('legacy-customer').blockedAt, null);
  assert.equal(orders.settings().lowStock, 5);
});

test('analytics uses Warsaw midnight across a clock change and ranks snapshot items from paid orders', async t => {
  const {calendarWindow, summarizeSales} = await import('../server/admin-report.mjs');
  const {dbPath, shop} = fixture(t);
  const orders = openOrders(dbPath, shop, 'sandbox');
  t.after(() => orders.close());
  const db = new DatabaseSync(dbPath);
  const setPaid = db.prepare("UPDATE orders SET paidAt = ?, status = 'paid', shippedAt = ? WHERE id = ?");
  setPaid.run('2025-03-29T22:59:59.999Z', null, orders.reserve(input()).id);
  setPaid.run('2025-03-29T23:00:00.000Z', '2025-03-31T04:00:00.000Z', orders.reserve(input()).id);
  setPaid.run('2025-03-30T21:59:59.999Z', null, orders.reserve(input()).id);
  setPaid.run('2025-03-30T22:00:00.000Z', null, orders.reserve(input()).id);
  orders.reserve(input());
  db.close();
  const range = calendarWindow(1, new Date('2025-03-30T18:00:00.000Z'));
  assert.equal(range.from, '2025-03-29T23:00:00.000Z');
  assert.equal(range.until, '2025-03-30T22:00:00.000Z');
  const report = summarizeSales(orders.paidBetween(range.from, range.until), range.days);
  assert.equal(report.orders, 2);
  assert.equal(report.total, 184600);
  assert.equal(report.items[0].quantity, 2);
});

test('a checkout open on older terms cannot reserve against updated terms', t => {
  const {dbPath, shop} = fixture(t);
  const orders = openOrders(dbPath, shop, 'sandbox');
  t.after(() => orders.close());
  const termsUrl = 'https://example.com/regulamin-v2';
  const oldCheckout = {...input(), expectedTermsUrl: shop.merchant.termsUrl};
  const existing = orders.reserve(oldCheckout);
  orders.saveSetting('merchant', {...shop.merchant, termsUrl}, orders.settings().revision.merchant, actor);
  assert.throws(() => orders.reserve({...input(), expectedTermsUrl: shop.merchant.termsUrl}), {status: 409});
  assert.throws(() => orders.reserve(input()), {status: 409});
  assert.equal(orders.reserve(oldCheckout).termsUrl, shop.merchant.termsUrl);
  assert.equal(orders.reserve({...input(), expectedTermsUrl: termsUrl}).termsUrl, termsUrl);
});

test('adding a SKU does not overwrite stock left by its earlier catalog entry', t => {
  const {dbPath, shop} = fixture(t);
  const orders = openOrders(dbPath, shop, 'sandbox');
  t.after(() => orders.close());
  const db = new DatabaseSync(dbPath);
  db.prepare('INSERT INTO stock VALUES (?, ?)').run('removed-sku', 12);
  db.close();
  assert.throws(() => orders.saveProduct({...shop.products[0], id: 'removed-sku'}, null, null, actor), {status: 409});
  assert.equal(orders.available('removed-sku'), 12);
});

test('editing an existing SKU requires a correction reason when its stock changes', t => {
  const {dbPath, shop} = fixture(t);
  const orders = openOrders(dbPath, shop, 'sandbox');
  t.after(() => orders.close());
  const current = orders.adminProduct(sku);
  const edited = {...shop.products[0], stock: current.stock + 2};
  assert.throws(() => orders.saveProduct(edited, current.stock, current.revision, actor), {status: 400});
  orders.saveProduct(edited, current.stock, current.revision, actor, 'delivery');
  const [event] = orders.audit({module: 'magazyn'});
  assert.equal(JSON.parse(event.detail).reason, 'delivery');
});
