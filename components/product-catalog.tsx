import Link from 'next/link';
import { categories, filterOptions, filterProducts, wheelFields, type Query } from '@/lib/filters';
import { catalogQuery, tireSeasons, tireSizes, type ProductCategory } from '@/lib/catalog-query';
import { vehicleLabels } from '@/lib/tire-attributes.mjs';
import type { Product } from '@/lib/types';
import { CatalogCards } from './catalog-cards';
import { CatalogFilters } from './catalog-filters';

export function ProductCatalog({category, products, searchParams}: {category: ProductCategory; products: Product[]; searchParams: Query}) {
  const {title, type} = categories[category];
  const tires = type === 'tires';
  const query = catalogQuery(category, searchParams);
  const inCategory = products.filter(product => product.type === type);
  const selected = filterProducts(inCategory, type, query);
  const matchingVehicle = tires ? filterProducts(inCategory, type, {...query, vehicle: [], sort: undefined}) : [];
  const matchingSeason = tires ? filterProducts(inCategory, type, {...query, season: undefined, sort: undefined}) : [];
  const vehicleCounts = Object.fromEntries(Object.keys(vehicleLabels).map(vehicle =>
    [vehicle, matchingVehicle.filter(product => product.vehicle === vehicle).length]));
  const seasonCounts = Object.fromEntries(tireSeasons.map(season =>
    [season, matchingSeason.filter(product => product.season === season).length]));
  const options = {
    ...Object.fromEntries((tires ? tireSizes : wheelFields).map(field => [field, filterOptions(inCategory, field)])),
    brand: [...new Set(inCategory.map(product => product.brand))].sort((a, b) => a.localeCompare(b, 'pl'))
  };

  return <section className={`shop-catalog shop-catalog--${category}`}>
    <div className="shop-catalog-hero">
      <div className="shop-catalog-hero-content">
        <nav aria-label="Ścieżka nawigacji"><Link href="/">Strona główna</Link><span aria-hidden="true">›</span><span aria-current="page">{title}</span></nav>
        <h1>{title}</h1>
        <p>{tires ? 'Szeroki wybór opon do aut osobowych, SUV i dostawczych.' : 'Dobierz felgi według średnicy, rozstawu śrub i odsadzenia.'}</p>
      </div>
    </div>
    <CatalogFilters key={category} category={category} query={query} options={options} vehicleCounts={vehicleCounts} seasonCounts={seasonCounts} count={selected.length}>
      {selected.length ? <CatalogCards products={selected}/> : <div className="shop-catalog-empty">
        <h3>Brak produktów</h3>
        <p>Zmień lub wyczyść filtry, aby zobaczyć więcej {tires ? 'opon' : 'felg'}.</p>
        <Link href={'/' + category} scroll={false}>Wyczyść filtry</Link>
      </div>}
    </CatalogFilters>
  </section>;
}
