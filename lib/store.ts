import { resolve } from 'node:path';
import { accountDbPath, openAccounts } from '@/server/accounts.mjs';
import { loadRuntime } from '@/server/config.mjs';
import { createCommerce } from '@/server/commerce.mjs';
import { createP24 } from '@/server/p24.mjs';
import { maxPerProduct, maxUnits, openOrders } from '@/server/orders.mjs';
import { previewProducts } from './preview';
import type { Shop } from './types';

function createRuntime() {
  const {shop, dbPath, payment} = loadRuntime();
  const accountPath = accountDbPath();
  if (payment && accountPath === resolve(/* turbopackIgnore: true */ process.env.BIEZNIK_PREVIEW_DB || 'data/preview.sqlite')) {
    throw new Error('Użyj oddzielnej bazy do podglądu i płatności.');
  }
  const commerce = createCommerce({shop, dbPath, p24: payment && createP24(payment)});
  const orders = commerce.orders ?? openOrders(accountPath, {products: previewProducts}, 'preview');
  const accounts = openAccounts(accountPath);
  return {commerce, accounts, orders, payment};
}

const processCache = globalThis as typeof globalThis & {bieznikRuntime?: ReturnType<typeof createRuntime>};
export function runtime() {
  return processCache.bieznikRuntime ??= createRuntime();
}

export function readShop(): Shop {
  const {commerce, orders} = runtime();
  const catalog = commerce.catalog() as unknown as Shop;
  if (catalog.ordering) return catalog;
  return {
    ordering: false, maxPerProduct, maxUnits,
    products: orders.catalog().map(product => ({
      ...product,
      seasonLabel: {summer: 'Letnia', winter: 'Zimowa', allseason: 'Całoroczna'}[product.season as 'summer' | 'winter' | 'allseason']
    }))
  };
}
