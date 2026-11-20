import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createShopServer } from '../server.mjs';
import { createP24 } from '../server/p24.mjs';

const merchant = {
  mode: 'sandbox', merchantId: 123, posId: 124, crc: 'fixture-crc', apiKey: 'fixture-key',
  origin: 'http://localhost:8000'
};
const product = {
  id: 'w1', type: 'wheels', brand: 'Test', name: '8J', size: '8J × 18 · 5×112 · ET45',
  diameter: 18, pcd: '5x112', et: '45', finish: 'Silver', priceCents: 12345,
  stock: 4, image: '/assets/wheel-silver.svg', description: 'Produkt testowy'
};
const shop = {
  shipping: { firstCents: 2000, additionalCents: 500 },
  merchant: { name: 'Sprzedawca testowy', address: 'Testowa 1, 00-001 Warszawa', email: 'test@example.com',
    termsUrl: 'https://example.com/regulamin', privacyUrl: 'https://example.com/prywatnosc' },
  products: [product]
};
const customer = {
  name: 'Jan Testowy', email: 'jan@example.com', phone: '+48 500 600 700',
  street: 'Testowa 4/2', postcode: '00-001', city: 'Warszawa', termsAccepted: true
};
const orderInput = (quantity = 2) => ({
  requestId: randomUUID(), items: [{id: 'w1', quantity}], customer, expectedTotal: 12345 * quantity + 2000 + (quantity - 1) * 500
});
const hash = value => createHash('sha384').update(JSON.stringify(value)).digest('hex');

async function start(t, {enabled = true, failingFirst = false, verifiedRemotely = false} = {}) {
  const directory = mkdtempSync(join(tmpdir(), 'bieznik-api-'));
  const calls = [];
  const p24 = createP24(merchant, async (url, options) => {
    const payload = options.body ? JSON.parse(options.body) : null;
    calls.push({url: new URL(url).pathname, payload, auth: options.headers.Authorization});
    if (failingFirst && calls.length === 1) return Response.json({}, {status: 503});
    if (verifiedRemotely && url.endsWith('/verify')) return Response.json({}, {status: 409});
    if (verifiedRemotely && url.includes('/by/sessionId/')) {
      const {sessionId, amount, currency} = calls[0].payload;
      return Response.json({data: {sessionId, amount, currency, orderId: 76234, status: 2}, responseCode: 0});
    }
    return Response.json({data: url.endsWith('/register') ? {token: 'fixture-token'} : {status: 'success'}, responseCode: 0});
  });
  const server = createShopServer({shop: enabled ? shop : null, dbPath: join(directory, 'shop.sqlite'), p24: enabled ? p24 : null});
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(async () => {
    await new Promise(resolve => server.close(resolve));
    rmSync(directory, {recursive: true, force: true});
  });
  const base = 'http://127.0.0.1:' + server.address().port;
  return {
    calls,
    async get(path) { return fetch(base + path); },
    async post(path, payload) {
      const result = await fetch(base + path, {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(payload)});
      const text = await result.text();
      return {status: result.status, body: text ? JSON.parse(text) : null};
    }
  };
}

function notification(sessionId, amount) {
  const data = {
    merchantId: merchant.merchantId, posId: merchant.posId, sessionId, amount,
    originAmount: amount, currency: 'PLN', orderId: 76234, methodId: 154, statement: 'P24-TEST'
  };
  return {...data, sign: hash({...data, crc: merchant.crc})};
}

test('orders use trusted totals, reserve stock, and expose no customer information', async t => {
  const api = await start(t);
  const input = orderInput();
  assert.equal((await api.post('/api/orders', {...input, expectedTotal: 1})).status, 409);
  assert.equal((await api.post('/api/orders', {...input, items: [{id: 'w1', quantity: 0}]})).status, 400);
  assert.equal((await api.post('/api/orders', {...input, items: [...input.items, ...input.items]})).status, 400);
  assert.equal(api.calls.length, 0);

  const result = await api.post('/api/orders', input);
  assert.equal(result.status, 201);
  assert.equal(result.body.total, 27190);
  assert.equal(result.body.status, 'pending');
  assert.equal(result.body.paymentUrl, 'https://sandbox.przelewy24.pl/trnRequest/fixture-token');
  assert.equal(api.calls[0].url, '/api/v1/transaction/register');
  const {sessionId, sign, amount, currency, urlStatus, urlReturn} = api.calls[0].payload;
  assert.equal(sign, hash({sessionId, merchantId: merchant.merchantId, amount, currency, crc: merchant.crc}));
  assert.equal(api.calls[0].auth, 'Basic ' + Buffer.from('124:fixture-key').toString('base64'));
  assert.equal(urlStatus, merchant.origin + '/api/payments/p24/notify');
  assert.equal(urlReturn, merchant.origin + '/payment-return/' + result.body.id);

  const duplicate = await api.post('/api/orders', input);
  assert.equal(duplicate.body.id, result.body.id);
  assert.equal(api.calls.length, 1);
  assert.equal((await api.post('/api/orders', {...input, customer: {...customer, city: 'Kraków'}})).status, 409);
  assert.equal((await api.post('/api/orders', orderInput(3))).status, 409);
  const status = await (await api.get('/api/orders/' + result.body.id)).json();
  assert.equal(status.status, 'pending');
  assert.equal(JSON.stringify(status).includes(customer.email), false);
  assert.equal((await api.get('/data/shop.sqlite')).status, 404);
});

test('only verified notifications settle the order and repeats are idempotent', async t => {
  const api = await start(t);
  const {body: order} = await api.post('/api/orders', orderInput());
  const {sessionId, amount} = api.calls[0].payload;
  const signed = notification(sessionId, amount);
  const endpoint = '/api/payments/p24/notify';
  assert.equal((await api.post(endpoint, {...signed, sign: '0'.repeat(96)})).status, 400);
  assert.equal((await api.post(endpoint, notification(sessionId, amount + 1))).status, 409);
  assert.equal(api.calls.length, 1);
  assert.equal((await api.post(endpoint, signed)).status, 200);
  assert.equal(api.calls[1].url, '/api/v1/transaction/verify');
  const {orderId, currency} = signed;
  assert.equal(api.calls[1].payload.sign, hash({sessionId, orderId, amount, currency, crc: merchant.crc}));
  assert.equal((await api.post(endpoint, signed)).status, 200);
  assert.equal(api.calls.length, 2);
  const status = await (await api.get('/api/orders/' + order.id)).json();
  assert.equal(status.status, 'paid');
  assert.equal(status.paymentUrl, undefined);
});

test('registration retry keeps the same session and reserves stock once', async t => {
  const api = await start(t, {failingFirst: true});
  const input = orderInput(4);
  assert.equal((await api.post('/api/orders', input)).status, 502);
  assert.equal((await api.post('/api/orders', orderInput(1))).status, 409);
  assert.equal((await api.post('/api/orders', input)).status, 201);
  assert.equal(api.calls[0].payload.sessionId, api.calls[1].payload.sessionId);
});

test('simultaneous submissions cannot reserve the same stock', async t => {
  const api = await start(t);
  const results = await Promise.all([api.post('/api/orders', orderInput(3)), api.post('/api/orders', orderInput(3))]);
  assert.deepEqual(results.map(result => result.status).sort(), [201, 409]);
  assert.equal(api.calls.length, 1);
});

test('preview mode cannot create orders', async t => {
  const api = await start(t, {enabled: false});
  assert.equal((await api.post('/api/orders', orderInput())).status, 503);
  assert.equal((await (await api.get('/api/shop')).json()).ordering, false);
  assert.equal(api.calls.length, 0);
});

test('a retried callback can recover a payment already verified by Przelewy24', async t => {
  const api = await start(t, {verifiedRemotely: true});
  const {body: order} = await api.post('/api/orders', orderInput());
  const {sessionId, amount} = api.calls[0].payload;
  const result = await api.post('/api/payments/p24/notify', notification(sessionId, amount));
  assert.equal(result.status, 200);
  assert.equal(api.calls[2].url, '/api/v1/transaction/by/sessionId/' + sessionId);
  const status = await (await api.get('/api/orders/' + order.id)).json();
  assert.equal(status.status, 'paid');
});
