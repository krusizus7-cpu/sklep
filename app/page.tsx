import Link from 'next/link';
import { Finder } from '@/components/finder';
import { Cards } from '@/components/cards';
import { Icon } from '@/components/icon';
import { filterOptions, tireFields, wheelFields } from '@/lib/filters';
import { readShop } from '@/lib/store';

const categoryTiles = [
  {slug: 'opony', type: 'tires', title: 'Opony', photo: 'category-tires'},
  {slug: 'felgi', type: 'wheels', title: 'Felgi', photo: 'category-wheels'}
] as const;
const plurals = new Intl.PluralRules('pl');
function productCount(n: number) {
  const suffix = plurals.select(n);
  return n + ' ' + (suffix === 'one' ? 'produkt' : suffix === 'few' ? 'produkty' : 'produktów');
}

export default function Home() {
  const {products} = readShop();
  const options = {
    opony: Object.fromEntries(tireFields.map(field => [field, filterOptions(products.filter(p => p.type === 'tires'), field)])),
    felgi: Object.fromEntries(wheelFields.map(field => [field, filterOptions(products.filter(p => p.type === 'wheels'), field)]))
  };
  return <>
    <section className="hero" aria-labelledby="hero-title">
      <picture className="hero-photo"><source media="(max-width: 640px)" srcSet="/assets/studio-coupe-mobile.webp"/>
        <img src="/assets/studio-coupe.webp" alt="" width="2172" height="724" fetchPriority="high"/>
      </picture>
      <div className="wrap hero-inner">
        <h1 id="hero-title">Dobierz opony<br/>i felgi<span>.</span></h1>
        <p>Znajdź odpowiedni rozmiar do swojego auta.</p>
        <Link className="hero-link" href="/oferta">Przeglądaj ofertę <Icon name="arrow"/></Link>
      </div>
    </section>
    <div className="wrap finder-wrap"><Finder options={options}/></div>
    <section className="wrap categories-section" aria-labelledby="categories-title">
      <div className="section-head"><h2 id="categories-title">Kategorie</h2><Link className="section-link" href="/oferta">Cała oferta <Icon name="arrow"/></Link></div>
      <div className="category-layout">
        {categoryTiles.map(({slug, type, title, photo}) => <Link key={slug} href={'/' + slug} className="category-tile">
          <img src={'/assets/' + photo + '.webp'} alt="" width="880" height="587" loading="lazy"/>
          <div className="category-copy"><h3>{title}</h3><p>{productCount(products.filter(p => p.type === type).length)}</p></div>
          <span className="category-open"><Icon name="arrow"/></span>
        </Link>)}
      </div>
    </section>
    {products.length > 0 && <section className="featured-section wrap" aria-labelledby="featured-title">
      <div className="section-head"><h2 id="featured-title">Wybrane produkty</h2></div>
      <Cards products={products.slice(0, 4)}/>
    </section>}
  </>;
}
