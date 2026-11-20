import type { Product, ShippingRates } from './types';
import { shippingCost } from './shipping.mjs';

export const categories = {
  oferta: {title: 'Cała oferta', type: undefined},
  opony: {title: 'Opony', type: 'tires'},
  felgi: {title: 'Felgi', type: 'wheels'}
} as const;
export type Category = keyof typeof categories;
export type Query = Record<string, string | string[] | undefined>;
export type Attribute = 'width' | 'profile' | 'diameter' | 'season' | 'pcd' | 'et' | 'finish';
export const filterLabels: Record<Attribute, string> = {
  width: 'Szerokość', profile: 'Profil', diameter: 'Średnica', season: 'Sezon',
  pcd: 'Rozstaw śrub (PCD)', et: 'Odsadzenie (ET)', finish: 'Wykończenie'
};
export const tireFields: Attribute[] = ['width', 'profile', 'diameter', 'season'];
export const wheelFields: Attribute[] = ['diameter', 'pcd', 'et', 'finish'];
export const seasonOptions: Record<string, string> = {summer: 'Letnie', winter: 'Zimowe', allseason: 'Całoroczne'};
export const value = (query: Query, key: string) => typeof query[key] === 'string' ? query[key] as string : '';

export function catalogFields(type: Product['type'] | undefined): readonly Attribute[] {
  return type === 'tires' ? tireFields : type === 'wheels' ? wheelFields : ['diameter'];
}

export function filterOptions(products: Product[], field: Attribute) {
  const values = [...new Set(products.map(product => product[field]).filter(attribute => attribute !== undefined))];
  return values.map(String).sort((a, b) => a.localeCompare(b, 'pl', {numeric: true}));
}

function normalizeSearch(text: string) {
  return text.toLocaleLowerCase('pl')
    .replace(/(\d)\s*\/\s*(?=\d)/g, '$1/')
    .replace(/\b(\d+\/\d+)\s*(z?r)\s*(?=\d)/g, '$1$2')
    .replace(/(\dj?)\s*[x×]\s*(?=\d)/g, '$1x')
    .replace(/\bet\s*(?=-?\d)/g, 'et')
    .replace(/\s+/g, ' ').trim();
}

export function catalogBudget(query: Query) {
  const amount = value(query, 'budzet').trim();
  if (!amount) return null;
  const units = value(query, 'sztuki') || '4';
  const match = /^(\d{1,9})(?:[.,](\d{1,2}))?$/.exec(amount);
  const cents = match ? Number(match[1]) * 100 + Number((match[2] ?? '').padEnd(2, '0')) : 0;
  return {cents, units: Number(units), valid: cents > 0 && ['1', '2', '4'].includes(units)};
}

export function setPrice(product: Product, units: number, rates?: ShippingRates) {
  return product.priceCents * units + (rates ? shippingCost(rates, units) : 0);
}

export function filterProducts(products: Product[], type: Product['type'] | undefined, query: Query, rates?: ShippingRates) {
  const budget = catalogBudget(query);
  const q = normalizeSearch(value(query, 'q'));
  const filters = catalogFields(type).map(field => [field, value(query, field).trim()] as const).filter(([, selected]) => selected);
  const filtered = products.filter(product => {
    if (type && type !== product.type) return false;
    if (budget && (!budget.valid || product.stock < budget.units || setPrice(product, budget.units, rates) > budget.cents)) return false;
    if (filters.some(([field, selected]) => String(product[field]) !== selected)) return false;
    return !q || normalizeSearch([product.brand, product.name, product.size, product.seasonLabel, product.finish, product.pcd]
      .filter(Boolean).join(' ')).includes(q);
  });
  const sort = value(query, 'sort').trim();
  if (sort === 'low') filtered.sort((a, b) => a.priceCents - b.priceCents);
  if (sort === 'high') filtered.sort((a, b) => b.priceCents - a.priceCents);
  return filtered;
}
