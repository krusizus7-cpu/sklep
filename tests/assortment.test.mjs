import test from 'node:test';
import assert from 'node:assert/strict';
import { loadShop, validateProduct } from '../server/config.mjs';
import { productTier, productStyle, tireBrands, wheelBrands } from '../lib/assortment.mjs';
import { filterOptions, filterProducts } from '../lib/filters.ts';

const [wheel] = loadShop('shop.example.json').products;
const tire = { ...wheel, type: 'tires', brand: 'YOKOHAMA', season: 'summer', width: 225, profile: 50, vehicle: 'passenger' };
const hubcap = {
  type: 'hubcaps', id: 'cap', name: 'Test', brand: 'Test', size: '16″', diameter: 16,
  priceCents: 8000, stock: 2, image: '/assets/test.webp', description: 'Test'
};

test('brand defaults respect the shop classification, product overrides and wheel material', () => {
  for (const [tier, brands] of Object.entries(tireBrands)) {
    for (const brand of brands) assert.equal(productTier({...tire, brand}), tier);
  }
  for (const [style, brands] of Object.entries(wheelBrands)) {
    for (const brand of brands) assert.equal(productStyle({...wheel, material: 'alloy', brand}), style);
  }
  assert.equal(productTier({...tire, brand: 'Debica'}), 'economy');
  assert.equal(productTier({...tire, brand: 'NOKIAN'}), 'premium');
  assert.equal(productTier({...tire, tier: 'mid'}), 'mid');
  assert.equal(productTier({...tire, brand: 'Nieznana'}), undefined);
  assert.equal(productStyle({...wheel, brand: 'BBS', material: 'steel'}), undefined);
  assert.equal(productStyle({...wheel, brand: 'BBS'}), undefined);
  assert.equal(productStyle({...wheel, brand: 'BBS', material: 'alloy', style: 'classic'}), 'classic');
});

test('catalog filters combine attributes and preserve products without classifications', () => {
  const alloy = {...wheel, brand: 'BBS', material: 'alloy'};
  const products = [tire, alloy, wheel, hubcap];
  assert.deepEqual(filterProducts(products, 'tires', {tier: 'premium', vehicle: 'passenger', season: 'summer'}), [tire]);
  assert.deepEqual(filterProducts(products, 'tires', {tier: 'mid'}), []);
  assert.deepEqual(filterProducts(products, 'wheels', {style: 'sport', material: 'alloy'}), [alloy]);
  assert.deepEqual(filterOptions([alloy, wheel], 'material'), ['alloy']);
  assert.deepEqual(filterProducts(products, 'wheels', {}), [alloy, wheel]);
  assert.deepEqual(filterProducts(products, 'hubcaps', {diameter: '16'}), [hubcap]);
});

test('old catalog entries and new accessory or wheel attributes validate against the right product type', () => {
  for (const product of [wheel, tire, {...wheel, material: 'steel', vehicle: 'van', finish: 'Czarne'},
    {...hubcap, diameter: 13}, {...hubcap, diameter: 17}]) {
    assert.doesNotThrow(() => validateProduct(product));
  }
  for (const product of [{...hubcap, diameter: 12}, {...hubcap, diameter: 18}, {...hubcap, tier: 'mid'},
    {...tire, tier: 'unknown'}, {...tire, vehicle: 'unknown'}, {...wheel, material: 'steel', style: 'sport'}]) {
    assert.throws(() => validateProduct(product));
  }
});
