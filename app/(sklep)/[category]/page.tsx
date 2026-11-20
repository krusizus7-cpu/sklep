import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Cards } from '@/components/cards';
import { ProductCatalog } from '@/components/product-catalog';
import { isProductCategory } from '@/lib/catalog-query';
import { categories, filterLabels, filterOptions, filterProducts, value, type Category, type Query } from '@/lib/filters';
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
  const {title} = categoryOf(category);
  const query = await searchParams;
  const {products} = readShop();
  if (isProductCategory(category)) return <ProductCatalog category={category} products={products} searchParams={query}/>;
  const selected = filterProducts(products, undefined, query);
  return <section className="wrap inner-page">
    <div className="breadcrumb"><Link href="/">Start</Link><span>/</span>{title}</div>
    <div className="catalog-header"><h1>{title}<span>.</span></h1></div>
    <div className="catalog-main next-catalog">
      <form className="panel-form catalog-controls" action={'/' + category}>
        <label>Szukaj produktu<input type="search" name="q" defaultValue={value(query, 'q')} maxLength={100}/></label>
        <label>{filterLabels.diameter}
          <select name="diameter" defaultValue={value(query, 'diameter')}>
            <option value="">Wszystkie</option>
            {filterOptions(products, 'diameter').map(option => <option key={option} value={option}>{option}</option>)}
          </select>
        </label>
        <label>Sortuj<select name="sort" defaultValue={value(query, 'sort')}><option value="">Domyślnie</option><option value="low">Cena rosnąco</option><option value="high">Cena malejąco</option></select></label>
        <button className="btn btn-red" type="submit">Zastosuj</button><Link href={'/' + category}>Wyczyść filtry</Link>
      </form>
      <div><p className="catalog-result">Wyniki: {selected.length}</p>
        {selected.length ? <Cards catalog products={selected}/> : <div className="empty"><h2>Brak produktów</h2><Link href={'/' + category}>Wyczyść filtry</Link></div>}
      </div>
    </div>
  </section>;
}
