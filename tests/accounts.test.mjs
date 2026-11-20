import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createCommerce } from '../server/commerce.mjs';
import { openAccounts } from '../server/accounts.mjs';
import { loadShop } from '../server/config.mjs';
import { openOrders } from '../server/orders.mjs';
import { randomUUID } from 'node:crypto';

test('sessions are revocable, roles are fixed, and history follows the checkout account', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'bieznik-accounts-'));
  const dbPath = join(dir, 'test.sqlite');
  const accounts = openAccounts(dbPath);
  const shop = loadShop('shop.example.json');
  const orders = openOrders(dbPath, shop, 'sandbox');
  const commerce = createCommerce({shop, dbPath, p24: {mode: 'sandbox'}});
  try {
    const password = 'przykladowe-dlugie-haslo';
    const customer = await accounts.create('Kupujacy@example.com', password);
    const other = await accounts.create('inny@example.com', password);
    const admin = await accounts.createAdmin('admin@example.com', password);
    assert.equal(customer.role, 'customer');
    assert.equal(admin.role, 'admin');
    assert.equal(await accounts.authenticate('kupujacy@example.com', 'wrong'), null);
    assert.equal((await accounts.authenticate('kupujacy@example.com', password)).id, customer.id);
    const {token} = accounts.startSession(customer.id);
    assert.deepEqual(accounts.session(token), customer);
    accounts.endSession(token);
    assert.equal(accounts.session(token), null);

    const payload = {
      requestId: randomUUID(), expectedTotal: 92300, items: [{id: 'wheel-test-18', quantity: 1}],
      customer: {name:'Jan Testowy', email: other.email, phone:'500600700', street:'Testowa 1',
        postcode:'00-001', city:'Warszawa', termsAccepted:true}
    };
    const owned = orders.reserve(payload, customer.id);
    assert.throws(() => orders.reserve(payload, other.id), {status:409});
    orders.reserve({...payload, requestId:randomUUID()});
    assert.deepEqual(orders.forAccount(customer.id).map(order => order.id), [owned.id]);
    assert.deepEqual(orders.forAccount(other.id), []);
    assert.throws(() => commerce.status(owned.id), {status: 404});
    assert.throws(() => commerce.status(owned.id, other), {status: 404});
    assert.equal(commerce.status(owned.id, customer).id, owned.id);
    assert.equal(commerce.status(owned.id, admin).id, owned.id);
  } finally {
    commerce.close();
    orders.close();
    accounts.close();
    rmSync(dir, {recursive:true, force:true});
  }
});
