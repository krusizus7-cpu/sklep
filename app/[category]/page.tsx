import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CatalogFilters } from '@/components/catalog-filters';
import { Cards } from '@/components/cards';
import { Icon } from '@/components/icon';
import { categories, filterLabels, filterOptions, filterProducts, catalogFields, type Attribute, filterOptionLabel, value, type Category, type Query } from '@/lib/filters';
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
  const {products} = readShop();
  const inCategory = products.filter(product => !type || product.type === type);
  const selected = filterProducts(products, type, query);
  const fields = catalogFields(type);
  const technical = new Set<Attribute>(['width', 'profile', 'diameter', 'pcd', 'et', 'finish']);
  const dimensions = fields.filter(field => technical.has(field));
  function renderField(field: Attribute) {
    const current = value(query, field);
    const options = filterOptions(inCategory, field);
    if (current && !options.includes(current)) options.push(current);
    if (!options.length) return null;
    return <label key={field}>{filterLabels[field]}
      <select name={field} defaultValue={current}>
        <option value="">Wszystkie</option>
        {options.map(option => <option key={option} value={option}>{filterOptionLabel(field, option)}</option>)}
      </select>
    </label>;
  }
  const controls = [
    {key: 'q', label: 'Szukaj'},
    ...fields.map(field => ({key: field, label: filterLabels[field]})),
    {key: 'sort', label: 'Sortowanie'}
  ];
  const active = controls.filter(({key}) => value(query, key));
  const path = '/' + category;
  function without(key: string) {
    const params = new URLSearchParams(active.filter(control => control.key !== key).map(control => [control.key, value(query, control.key)]));
    return params.size ? path + '?' + params.toString() : path;
  }

  return <section className="wrap inner-page">
    <div className="breadcrumb"><Link href="/">Start</Link><span>/</span>{title}</div>
    <div className="catalog-header"><h1>{title}<span>.</span></h1>
      {type === 'tires' && <Link href="/poradnik#marki-opon" className="section-link"><Icon name="book"/>Klasy i marki opon</Link>}
      {type === 'wheels' && <Link href="/poradnik#rodzaje-felg" className="section-link"><Icon name="book"/>Rodzaje i marki felg</Link>}
      {type === 'hubcaps' && <p>Kołpaki samochodowe na felgi o średnicy od 13 do 17 cali.</p>}
    </div>
    {!inCategory.length ? <div className="empty">
      <h2>Brak produktów w tej kategorii</h2>
      {type && <Link className="btn btn-border" href="/oferta">Przejdź do całej oferty</Link>}
    </div> : <div className="catalog-main">
      <CatalogFilters key={JSON.stringify([category, query])} count={active.length}>
        <form className="panel-form catalog-controls" action={path} noValidate>
          <h2>Filtry i sortowanie</h2>
          <label>Szukaj produktu<input placeholder="Marka lub model" type="search" name="q" defaultValue={value(query, 'q')} maxLength={100}/></label>
          {fields.filter(field => !technical.has(field)).map(renderField)}
          {dimensions.length > 1 ? <details className="technical-fields" open={dimensions.some(field => value(query, field))}>
            <summary>Wymiary i parametry</summary><div>{dimensions.map(renderField)}</div>
          </details> : dimensions.map(renderField)}
          <label>Sortuj<select name="sort" defaultValue={value(query, 'sort')}>
            <option value="">Domyślnie</option><option value="low">Cena rosnąco</option><option value="high">Cena malejąco</option>
          </select></label>
          <button className="btn btn-red" type="submit">Zastosuj</button>
          {active.length > 0 && <Link href={path}>Wyczyść filtry</Link>}
        </form>
      </CatalogFilters>
      <div>
        <div className="catalog-result">
          <p>Wyniki: {selected.length}</p>
          {active.map(({key, label}) => {
            const raw = value(query, key);
            const display = filterOptionLabel(key, raw);
            return <Link key={key} className="filter-chip" href={without(key)} aria-label={`Usuń filtr — ${label}: ${display}`}>
              <span>{label}: {display}</span><Icon name="close"/>
            </Link>;
          })}
        </div>
        {selected.length ? <Cards catalog products={selected}/> : <div className="empty">
          <h2>Brak produktów</h2>
          {active.length > 0 ? <>
            <p>Zmień parametry lub usuń filtry, aby zobaczyć więcej modeli.</p>
            <Link className="btn btn-border" href={path}>Wyczyść filtry</Link>
          </> : category !== 'oferta' && <Link className="btn btn-border" href="/oferta">Przejdź do całej oferty</Link>}
        </div>}
      </div>
    </div>}
  </section>;
}
