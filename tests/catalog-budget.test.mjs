import assert from 'node:assert/strict';
import test from 'node:test';
import { filterProducts } from '../lib/filters.ts';

test('budget combines shipping, requested units, stock and other filters in integer cents', () => {
  const tire = {type: 'tires', priceCents: 45900, stock: 4, diameter: 17, name: 'Opona', size: '225/50 R17'};
  const products = [tire, {...tire, stock: 3}, {...tire, diameter: 16}];
  const rates = {firstCents: 2400, additionalCents: 1200};
  const ids = (query, shipping = rates) => filterProducts(products, 'tires', {diameter: '17', ...query}, shipping);
  assert.deepEqual(ids({budzet: '1896,00'}), [tire]);
  assert.deepEqual(ids({budzet: '1895.99'}), []);
  assert.deepEqual(ids({budzet: '954', sztuki: '2'}), products.slice(0, 2));
  assert.deepEqual(ids({budzet: '483', sztuki: '1'}), products.slice(0, 2));
  assert.deepEqual(filterProducts(products, 'tires', {budzet: '1836', diameter: '17'}), [tire]);
  assert.deepEqual(ids({budzet: 'abc'}), []);
  assert.deepEqual(ids({budzet: '2000', sztuki: '3'}), []);
});
