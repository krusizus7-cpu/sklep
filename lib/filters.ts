import type { Product } from './types';

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

export function filterOptions(products: Product[], field: Attribute) {
  const values = [...new Set(products.map(product => product[field]).filter(attribute => attribute !== undefined))];
  return values.map(String).sort((a, b) => a.localeCompare(b, 'pl', {numeric: true}));
}

export function filterProducts(products: Product[], type: Product['type'] | undefined, query: Query) {
  const q = value(query, 'q').trim().toLocaleLowerCase('pl');
  const fields = type === 'tires' ? tireFields : type === 'wheels' ? wheelFields : ['diameter'] as const;
  const filtered = products.filter(product => {
    if (type && type !== product.type) return false;
    if (fields.some(field => value(query, field) && String(product[field]) !== value(query, field))) return false;
    return !q || [product.brand, product.name, product.size, product.seasonLabel, product.finish]
      .filter(Boolean).join(' ').toLocaleLowerCase('pl').includes(q);
  });
  const sort = value(query, 'sort');
  if (sort === 'low') filtered.sort((a, b) => a.priceCents - b.priceCents);
  if (sort === 'high') filtered.sort((a, b) => b.priceCents - a.priceCents);
  return filtered;
}
