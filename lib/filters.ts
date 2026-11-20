import type { Product } from './types';
import { materialLabels, productStyle, productTier, styleLabels, tierLabels, vehicleLabels } from './assortment.mjs';

export const categories = {
  oferta: {title: 'Cała oferta', type: undefined},
  opony: {title: 'Opony', type: 'tires'},
  felgi: {title: 'Felgi', type: 'wheels'},
  kolpaki: {title: 'Kołpaki', type: 'hubcaps'}
} as const;
export type Category = keyof typeof categories;
export type Query = Record<string, string | string[] | undefined>;
export const filterLabels = {
  width: 'Szerokość', profile: 'Profil', diameter: 'Średnica', season: 'Sezon',
  pcd: 'Rozstaw śrub (PCD)', et: 'Odsadzenie (ET)', finish: 'Wykończenie',
  brand: 'Marka', vehicle: 'Typ pojazdu', tier: 'Klasa opony', material: 'Materiał felgi', style: 'Styl alufelgi'
};
export type Attribute = keyof typeof filterLabels;
export const tireFields = ['width', 'profile', 'diameter', 'season'] as const;
export const wheelFields = ['diameter', 'pcd', 'et', 'finish'] as const;
const seasonLabels = {summer: 'Letnie', winter: 'Zimowe', allseason: 'Całoroczne'};
const optionLabels: Record<string, Record<string, string>> = {
  season: seasonLabels, vehicle: vehicleLabels, tier: tierLabels, material: materialLabels,
  style: styleLabels, sort: {low: 'Cena rosnąco', high: 'Cena malejąco'}
};
export function catalogFields(type?: Product['type']): Attribute[] {
  if (type === 'tires') return ['season', 'vehicle', 'tier', 'brand', 'width', 'profile', 'diameter'];
  if (type === 'wheels') return ['material', 'style', 'vehicle', 'brand', ...wheelFields];
  return ['diameter', 'brand'];
}
export function filterOptionLabel(field: string, raw: string) {
  const labels = Object.hasOwn(optionLabels, field) ? optionLabels[field] : undefined;
  if (labels && Object.hasOwn(labels, raw)) return labels[raw];
  if (field === 'diameter') return raw + '″';
  if (field === 'width') return raw + ' mm';
  return raw;
}

export const value = (query: Query, key: string) => typeof query[key] === 'string' ? query[key] as string : '';

export function attributeValue(product: Product, field: Attribute): string {
  if (field === 'tier') return productTier(product) ?? '';
  if (field === 'style') return productStyle(product) ?? '';
  return String(product[field] ?? '');
}
export function filterOptions(products: Product[], field: Attribute) {
  const values = products.map(product => attributeValue(product, field)).filter(Boolean);
  return [...new Set(values)].sort((a, b) => a.localeCompare(b, 'pl', {numeric: true}));
}

export function filterProducts(products: Product[], type: Product['type'] | undefined, query: Query) {
  const q = value(query, 'q').trim().toLocaleLowerCase('pl');
  const fields = catalogFields(type);
  const filtered = products.filter(product => {
    if (type && type !== product.type) return false;
    if (fields.some(field => value(query, field) && attributeValue(product, field) !== value(query, field))) return false;
    return !q || [product.brand, product.name, product.size, product.seasonLabel, product.finish]
      .filter(Boolean).join(' ').toLocaleLowerCase('pl').includes(q);
  });
  const sort = value(query, 'sort');
  if (sort === 'low') filtered.sort((a, b) => a.priceCents - b.priceCents);
  if (sort === 'high') filtered.sort((a, b) => a.priceCents - b.priceCents);
  return filtered;
}
