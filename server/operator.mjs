import { resolve } from 'node:path';
import { loadRuntime, loadShop } from './config.mjs';
import { createP24 } from './p24.mjs';
import { reconcileOrder } from './commerce.mjs';
import { openOrders, orderIdPattern } from './orders.mjs';

process.umask(0o077);
const [command, value, arg] = process.argv.slice(2);
const mode = process.env.P24_MODE;
const states = ['pending', 'registering', 'paid', 'cancelled'];

async function run() {
  if (!['sandbox', 'live'].includes(mode)) throw new Error('Ustaw P24_MODE na sandbox lub live.');
  if (command === 'test-access') {
    if (!await createP24(loadRuntime().payment).testAccess()) throw new Error('Przelewy24 nie potwierdziło dostępu.');
    console.log('Przelewy24 potwierdziło dostęp.');
    return;
  }
  const shop = loadShop(process.env.BIEZNIK_SHOP || 'data/shop.json', {live: mode === 'live'});
  const store = openOrders(resolve(process.env.BIEZNIK_DB || 'data/shop.sqlite'), shop, mode);
  try {
    if (command === 'list' && states.includes(value || 'paid')) {
      console.table(store.list(value || 'paid'));
    } else if (command === 'show' && orderIdPattern.test(value ?? '')) {
      const order = store.get(value);
      if (!order) throw new Error('Nie znaleziono zamówienia.');
      const {requestId, fingerprint, token, tokenAt, ...details} = order;
      console.log(JSON.stringify(details, null, 2));
    } else if (command === 'stock' && value && /^\d+$/.test(arg ?? '')) {
      store.setStock(value, Number(arg));
      console.log('Zapisano liczbę sztuk dostępnych do sprzedaży.');
    } else if (command === 'ship' && orderIdPattern.test(value ?? '') && /^[\w -]{3,80}$/.test(arg ?? '')) {
      store.markShipped(value, arg.trim());
      console.log('Zapisano wysyłkę.');
    } else if (command === 'reconcile' && orderIdPattern.test(value ?? '')) {
      const p24 = createP24(loadRuntime().payment);
      await reconcileOrder(store, p24, value);
      console.log('Potwierdzono płatność w Przelewy24.');
    } else if (command === 'cancel' && orderIdPattern.test(value ?? '') && arg === '--confirmed-unpaid') {
      store.cancelUnpaid(value);
      console.log('Zwolniono rezerwację.');
    } else {
      throw new Error('Polecenia: test-access, list [status], show <id>, stock <sku> <ilość>, ship <id> <numer-listu>, reconcile <id>, cancel <id> --confirmed-unpaid');
    }
  } finally {
    store.close();
  }
}

try {
  await run();
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
