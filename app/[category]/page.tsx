import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CatalogListing } from '@/components/catalog-navigation';
import { Cards } from '@/components/cards';
import { CatalogFilters } from '@/components/catalog-filters';
import { categories, catalogBudget, catalogFields, filterLabels, filterOptions, filterProducts, seasonOptions, value, type Category, type Query } from '@/lib/filters';
import { readShop } from '@/lib/store';

type Props = {params: Promise<{category: string}>; searchParams: Promise<Query>};
function categoryOf(slug: string) {
  if (!Object.hasOwn(categories, slug)) notFound();
  return categories[slug as Category];
}
export async function generateMetadata({params}: Props) {
  return {title: categoryOf((await params).category).title};
}
export default async function Catalog({params, searchParams}: Props) {
  const {category} = await params;
  const {title, type} = categoryOf(category);
  const query = await searchParams;
  const shop = readShop();
  const {products} = shop;
  const rates = shop.ordering ? shop.shipping : undefined;
  const budget = catalogBudget(query);
  const inCategory = products.filter(product => !type || product.type === type);
  const selected = filterProducts(products, type, query, rates);
  const path = '/' + category;
  const fields = catalogFields(type);
  const keys = ['q', ...fields, 'budzet'] as const;
  const paramsForFilters = new URLSearchParams();
  for (const key of [...keys, 'sort']) {
    const selectedValue = value(query, key).trim();
    if (selectedValue) paramsForFilters.set(key, selectedValue);
  }
  if (budget && value(query, 'sztuki')) paramsForFilters.set('sztuki', value(query, 'sztuki'));
  const filters = keys.flatMap(key => {
    const selectedValue = paramsForFilters.get(key);
    if (!selectedValue) return [];
    const remaining = new URLSearchParams(paramsForFilters);
    remaining.delete(key);
    if (key === 'budzet') remaining.delete('sztuki');
    return [{key, name: key === 'budzet' ? 'Budżet' : key === 'q' ? 'Szukaj' : filterLabels[key],
      label: key === 'budzet' ? selectedValue + ' zł' + (budget?.valid ? ' · ' + budget.units + ' szt.' : '') : key === 'season' && Object.hasOwn(seasonOptions, selectedValue) ? seasonOptions[selectedValue] : selectedValue,
      href: remaining.size ? `${path}?${remaining}` : path}];
  });
  const suggestions = selected.length ? [] : filters.map(filter => ({...filter,
    count: filterProducts(inCategory, type, {...query, [filter.key]: undefined, sort: undefined}, rates).length
  })).filter(filter => filter.count > 0).sort((a, b) => b.count - a.count);
  return <section className="wrap inner-page">
    <div className="breadcrumb"><Link href="/">Start</Link><span>/</span>{title}</div>
    <div className="catalog-header"><h1>{title}<span>.</span></h1></div>
    <div className="catalog-main next-catalog">
      <form className="panel-form catalog-controls" action={path} key={paramsForFilters.toString()}>
        <div className="catalog-search">
          <label>Szukaj produktu<input type="search" name="q" defaultValue={paramsForFilters.get('q') ?? ''}
            placeholder={type === 'wheels' ? 'Np. 5×112' : 'Np. 225/50 R17'} maxLength={100}/></label>
          <button className="btn btn-red catalog-search-submit" type="submit">Szukaj</button>
        </div>
        <CatalogFilters count={filters.filter(filter => filter.key !== 'q').length}>
          {fields.map(field => <label key={field}>{filterLabels[field]}
            <select name={field} defaultValue={paramsForFilters.get(field) ?? ''}>
              <option value="">Wszystkie</option>
              {filterOptions(inCategory, field).map(option => <option key={option} value={option}>
                {field === 'season' ? seasonOptions[option] : option}
              </option>)}
            </select>
          </label>)}
          <label>Budżet na komplet (zł)<input name="budzet" inputMode="decimal" maxLength={12}
            placeholder="Np. 2000" defaultValue={paramsForFilters.get('budzet') ?? ''}/></label>
          <label>Liczba sztuk w budżecie<select name="sztuki" defaultValue={paramsForFilters.get('sztuki') ?? '4'}>
            {[1, 2, 4].map(n => <option key={n} value={n}>{n} szt.</option>)}
          </select></label>
          <small className="budget-note">{rates ? 'Budżet obejmuje dostawę kurierem.' : 'Cena produktów bez dostawy.'}</small>
          <label>Sortuj<select name="sort" defaultValue={paramsForFilters.get('sort') ?? ''}><option value="">Domyślnie</option><option value="low">Cena rosnąco</option><option value="high">Cena malejąco</option></select></label>
          <button className="btn btn-red" type="submit">Zastosuj</button><Link href={path}>Wyczyść filtry</Link>
        </CatalogFilters>
      </form>
      <div><p className="catalog-result">Wyniki: {selected.length}</p>
        {filters.length > 0 && <ul className="catalog-chips" aria-label="Aktywne filtry">
          {filters.map(filter => <li key={filter.key}>
            <Link href={filter.href} aria-label={`Usuń filtr ${filter.name}: ${filter.label}`}>
              <span>{filter.name}: {filter.label}</span><span aria-hidden="true">×</span>
            </Link>
          </li>)}
        </ul>}
        {budget && !budget.valid && <p role="alert">Podaj dodatnią kwotę w złotych (do dwóch miejsc po przecinku) i wybierz 1, 2 lub 4 sztuki.</p>}
        {selected.length ? <CatalogListing><Cards catalog products={selected} units={budget?.units} rates={rates}/></CatalogListing> : <div className="empty catalog-empty">
          <h2>Brak produktów</h2>
          {suggestions.length > 0 && <>
            <p>Usuń jeden z filtrów, aby zobaczyć pasujące produkty.</p>
            <ul>{suggestions.map(filter => <li key={filter.key}>
              <Link href={filter.href}>Usuń „{filter.name}: {filter.label}” <small>· Wyniki: {filter.count}</small></Link>
            </li>)}</ul>
          </>}
          {!suggestions.length && filters.length > 0 && <p>Spróbuj usunąć kilka filtrów lub zmienić szukaną frazę.</p>}
          {filters.length > 0 && <Link href={path}>Wyczyść wszystkie filtry</Link>}
        </div>}
      </div>
    </div>
  </section>;
}
