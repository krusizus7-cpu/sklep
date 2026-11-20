import { readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { vehicleLabels, wetGripClasses } from '../lib/tire-attributes.mjs';

const string = (value, length = 200) => typeof value === 'string' && value.trim().length > 0 && value.length <= length;
const integer = (value, min, max) => Number.isSafeInteger(value) && value >= min && value <= max;
const assetPath = value => typeof value === 'string' && /^\/assets\/[\w-]+\.(?:webp|png|jpe?g|svg)$/i.test(value);
const httpsUrl = value => {
  if (!string(value, 500)) return false;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password;
  } catch {
    return false;
  }
};

export function loadShop(path, {live = false} = {}) {
  const {merchant, shipping, products} = JSON.parse(readFileSync(path, 'utf8'));
  if (!merchant || !['name', 'address', 'email'].every(field => string(merchant[field])) ||
      !httpsUrl(merchant.termsUrl) || !httpsUrl(merchant.privacyUrl) ||
      (live && (!string(merchant.taxId, 30) || !string(merchant.phone, 30)))) {
    throw new Error('Uzupełnij dane sprzedawcy oraz adresy HTTPS regulaminu i polityki prywatności.');
  }
  if (!shipping || !integer(shipping.firstCents, 0, 100000) || !integer(shipping.additionalCents, 0, 100000)) {
    throw new Error('Uzupełnij koszt pierwszej i kolejnej sztuki w groszach.');
  }
  if (!Array.isArray(products) || products.length === 0) throw new Error('Dodaj produkty do katalogu.');
  const ids = new Set();
  for (const product of products) {
    validateProduct(product, live);
    if (ids.has(product.id)) throw new Error('Powtórzony identyfikator produktu.');
    ids.add(product.id);
  }
  return {merchant, shipping, products};
}

export function validateProduct(product, live = false) {
  if (!product || typeof product.id !== 'string' || !/^[a-zA-Z0-9_-]{1,64}$/.test(product.id) ||
      !['brand', 'name', 'size', 'description'].every(field => string(product[field], 1000)) ||
      !integer(product.diameter, 8, 40) || !integer(product.priceCents, 1, 10000000) ||
      !integer(product.stock, 0, 100000) || !assetPath(product.image) ||
      (live && /\.svg$/i.test(product.image))) throw new Error('Nieprawidłowe lub powtórzone dane produktu.');
  if (product.type === 'tires') {
    if (!integer(product.width, 100, 400) || !integer(product.profile, 15, 95) ||
        !['summer', 'winter', 'allseason'].includes(product.season) ||
        ((live || product.eprelUrl || product.labelImage) &&
          (!httpsUrl(product.eprelUrl) || new URL(product.eprelUrl).hostname !== 'eprel.ec.europa.eu' ||
          !assetPath(product.labelImage) || /\.svg$/i.test(product.labelImage)))) {
      throw new Error('Uzupełnij parametry opony i dane EPREL dla sprzedaży.');
    }
    if ((product.vehicle !== undefined && (typeof product.vehicle !== 'string' || !Object.hasOwn(vehicleLabels, product.vehicle))) ||
        (product.wetGripClass !== undefined && !wetGripClasses.includes(product.wetGripClass)) ||
        (product.bestseller !== undefined && typeof product.bestseller !== 'boolean')) {
      throw new Error('Sprawdź typ pojazdu, klasę przyczepności na mokrym i oznaczenie bestseller.');
    }
  } else if (product.type !== 'wheels' || !['pcd', 'et', 'finish'].every(field => string(product[field], 60))) {
    throw new Error('Uzupełnij parametry felgi.');
  }
  if (live) {
    for (const path of [product.image, product.labelImage].filter(Boolean)) {
      const file = resolve('public', '.' + path);
      if (!statSync(file, {throwIfNoEntry: false})?.isFile()) throw new Error('Brak pliku produktu: ' + path);
    }
  }
}

export function loadRuntime(env = process.env) {
  const mode = env.P24_MODE || 'preview';
  const dbPath = resolve(/* turbopackIgnore: true */ env.BIEZNIK_DB || 'data/shop.sqlite');
  if (mode === 'preview') return {dbPath, shop: null, payment: null};
  if (!['sandbox', 'live'].includes(mode)) throw new Error('Nieprawidłowy P24_MODE.');
  const live = mode === 'live';
  const url = new URL(env.APP_ORIGIN);
  if ((url.protocol !== 'https:' && !(mode === 'sandbox' && url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname))) ||
      url.origin.length > 190 || url.pathname !== '/' || url.search || url.hash || url.username || url.password) {
    throw new Error('APP_ORIGIN musi być publicznym adresem HTTPS sklepu.');
  }
  const merchantId = Number(env.P24_MERCHANT_ID);
  const posId = Number(env.P24_POS_ID || env.P24_MERCHANT_ID);
  if (![merchantId, posId].every(id => integer(id, 1, 2147483647)) || !env.P24_CRC?.trim() || !env.P24_API_KEY?.trim()) {
    throw new Error('Uzupełnij P24_MERCHANT_ID, P24_CRC i P24_API_KEY.');
  }
  return {
    dbPath,
    shop: loadShop(env.BIEZNIK_SHOP || 'data/shop.json', {live}),
    payment: {mode, merchantId, posId, crc: env.P24_CRC, apiKey: env.P24_API_KEY, origin: url.origin}
  };
}
