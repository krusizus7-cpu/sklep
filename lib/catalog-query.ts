import { filterLabels, seasonOptions, value, vehicleValues, wheelFields, type Query } from './filters';
import { vehicleLabels } from './tire-attributes.mjs';
import type { TireVehicle } from './types';

export const tireSizes = ['width', 'profile', 'diameter'] as const;
export const tireSeasons = ['winter', 'summer', 'allseason'] as const;
const tireFilters = ['season', ...tireSizes] as const;
const sharedFilters = ['brand', 'q', 'sort'] as const;
type SingleFilter = (typeof tireFilters | typeof wheelFields | typeof sharedFilters)[number];
export type CatalogQuery = Partial<Record<SingleFilter, string>> & {vehicle: TireVehicle[]};
export type ProductCategory = 'opony' | 'felgi';

export function isProductCategory(category: string): category is ProductCategory {
  return category === 'opony' || category === 'felgi';
}

function singleFilters(category: ProductCategory) {
  return [...(category === 'opony' ? tireFilters : wheelFields), ...sharedFilters];
}

export function catalogQuery(category: ProductCategory, query: Query): CatalogQuery {
  const normalized: CatalogQuery = {vehicle: category === 'opony' ? vehicleValues(query.vehicle) : []};
  for (const field of category === 'opony' ? tireSizes : ['diameter'] as const) {
    const size = value(query, field);
    if (/^\d{1,3}$/.test(size)) normalized[field] = String(Number(size));
  }
  if (category === 'opony') {
    const season = value(query, 'season');
    if (Object.hasOwn(seasonOptions, season)) normalized.season = season;
  } else {
    for (const field of ['pcd', 'et', 'finish'] as const) {
      const selected = value(query, field);
      if (selected.trim() && selected.length <= 60) normalized[field] = selected;
    }
  }
  const sort = value(query, 'sort');
  if (sort === 'low' || sort === 'high') normalized.sort = sort;
  const brand = value(query, 'brand');
  if (brand.trim() && brand.length <= 1000) normalized.brand = brand;
  const q = value(query, 'q').trim().slice(0, 100);
  if (q) normalized.q = q;
  return normalized;
}

export function readCatalogParams(category: ProductCategory, params: FormData | Pick<URLSearchParams, 'get' | 'getAll'>) {
  const query: Query = {vehicle: params.getAll('vehicle').map(String)};
  for (const field of singleFilters(category)) query[field] = params.getAll(field).length === 1 ? String(params.get(field)) : undefined;
  return catalogQuery(category, query);
}

export function catalogParams(category: ProductCategory, query: CatalogQuery) {
  const params = new URLSearchParams();
  for (const vehicle of query.vehicle) params.append('vehicle', vehicle);
  for (const field of singleFilters(category)) {
    const selected = query[field];
    if (selected) params.set(field, selected);
  }
  return params;
}

export function catalogHref(category: ProductCategory, query: CatalogQuery) {
  const params = catalogParams(category, query).toString();
  return '/' + category + (params ? '?' + params : '');
}

export function catalogFilterChips(category: ProductCategory, query: CatalogQuery) {
  const chips: {label: string; href: string}[] = query.vehicle.map(vehicle => ({
    label: vehicleLabels[vehicle],
    href: catalogHref(category, {...query, vehicle: query.vehicle.filter(selected => selected !== vehicle)})
  }));
  if (query.season) chips.push({label: seasonOptions[query.season], href: catalogHref(category, {...query, season: undefined})});
  for (const field of category === 'opony' ? tireSizes : wheelFields) {
    const label = field === 'pcd' ? 'PCD' : field === 'et' ? 'ET' : filterLabels[field];
    if (query[field]) chips.push({label: `${label} ${query[field]}`, href: catalogHref(category, {...query, [field]: undefined})});
  }
  if (query.brand) chips.push({label: query.brand, href: catalogHref(category, {...query, brand: undefined})});
  if (query.q) chips.push({label: `„${query.q}”`, href: catalogHref(category, {...query, q: undefined})});
  return chips;
}
