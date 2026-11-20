import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Cards } from '@/components/cards';
import { categories, filterLabels, filterOptions, filterProducts, tireFields, wheelFields, seasonOptions, value, type Category, type Query } from '@/lib/filters';
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
  const fields = type === 'tires' ? tireFields : type === 'wheels' ? wheelFields : ['diameter'] as const;
  return <section className="wrap inner-page">
    <div className="breadcrumb"><Link href="/">Start</Link><span>/</span>{title}</div>
    <div className="catalog-header"><h1>{title}<span>.</span></h1></div>
    <div className="catalog-main next-catalog">
      <form className="panel-form catalog-controls" action={'/' + category}>
        <label>Szukaj produktu<input type="search" name="q" defaultValue={value(query, 'q')} maxLength={100}/></label>
        {fields.map(field => <label key={field}>{filterLabels[field]}
          <select name={field} defaultValue={value(query, field)}>
            <option value="">Wszystkie</option>
            {filterOptions(inCategory, field).map(option => <option key={option} value={option}>{seasonOptions[option] ?? option}</option>)}
          </select>
        </label>)}
        <label>Sortuj<select name="sort" defaultValue={value(query, 'sort')}><option value="">Domyślnie</option><option value="low">Cena rosnąco</option><option value="high">Cena malejąco</option></select></label>
        <button className="btn btn-red" type="submit">Zastosuj</button><Link href={'/' + category}>Wyczyść filtry</Link>
      </form>
      <div><p className="catalog-result">Wyniki: {selected.length}</p>
        {selected.length ? <Cards catalog products={selected}/> : <div className="empty"><h2>Brak produktów</h2><Link href={'/' + category}>Wyczyść filtry</Link></div>}
      </div>
    </div>
  </section>;
}
