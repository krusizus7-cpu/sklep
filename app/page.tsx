import Link from 'next/link';
import { Finder } from '@/components/finder';
import { Cards } from '@/components/cards';
import { filterOptions, tireFields, wheelFields } from '@/lib/filters';
import { readShop } from '@/lib/store';

export default function Home() {
  const {products} = readShop();
  const options = {
    opony: Object.fromEntries(tireFields.map(field => [field, filterOptions(products.filter(p => p.type === 'tires'), field)])),
    felgi: Object.fromEntries(wheelFields.map(field => [field, filterOptions(products.filter(p => p.type === 'wheels'), field)]))
  };
  return <>
    <div className="hero-wrap">
      <section className="hero wrap" aria-labelledby="heroTitle">
        <div className="hero-atmo"/>
        <div className="hero-left">
          <p className="eyebrow red-eyebrow"><span className="line-mark"/> Opony i felgi samochodowe</p>
          <div className="hero-finder"><div className="hero-finder-heading"><h1 id="heroTitle">Dobierz opony i felgi<span>.</span></h1></div><Finder options={options}/></div>
          <div className="hero-after"><a href="#categories">Przeglądaj ofertę <span aria-hidden="true">→</span></a></div>
        </div>
        <div className="hero-right" aria-hidden="true"><div className="hero-ring ring-one"/><div className="hero-ring ring-two"/><div className="hero-red-glow"/>
          <div className="wheel-shadow"/><img className="hero-wheel" src="/assets/wheel-hero.svg" alt="" width="700" height="700" fetchPriority="high"/>
        </div>
      </section>
    </div>
    <section id="categories" className="categories-section wrap" aria-labelledby="categoriesTitle">
      <div className="section-head"><h2 id="categoriesTitle">Przeglądaj według kategorii</h2></div>
      <div className="category-layout">
        {[['opony', 'Opony', 'tire-sport', 'tires'], ['felgi', 'Felgi', 'wheel-satin', 'wheels']].map(([href, name, image, type]) =>
          <Link href={'/' + href} key={href} className={'category-card cat-' + type}>
            <div className="cat-art"><img src={`/assets/${image}.svg`} alt="" loading="lazy" width="700" height="700"/></div>
            <div className="cat-copy"><h3>{name}</h3><div className="cat-explore">Zobacz ofertę <span aria-hidden="true">→</span></div></div>
          </Link>
        )}
      </div>
    </section>
    <section className="featured-section wrap" aria-labelledby="featuredTitle">
      <div className="section-head featured-heading"><h2 id="featuredTitle">Wybrane produkty</h2><Link href="/oferta" className="section-all">Cała oferta <span aria-hidden="true">→</span></Link></div>
      <Cards products={products.slice(0, 4)}/>
    </section>
  </>;
}
