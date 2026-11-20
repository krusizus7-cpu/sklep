import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AddProduct } from '@/components/basket';
import { Cards } from '@/components/cards';
import { readShop } from '@/lib/store';
import { attributeValue, categories, filterLabels, filterOptionLabel, type Attribute } from '@/lib/filters';
import { money } from '@/lib/types';

type Props = {params: Promise<{id: string}>};
function lookup(id: string) {
  const shop = readShop();
  const product = shop.products.find(item => item.id === id);
  if (!product) notFound();
  return {shop, product};
}
export async function generateMetadata({params}: Props) {
  const {product} = lookup((await params).id);
  return {title: `${product.brand} ${product.name} ${product.size}`, description: product.description};
}
export default async function ProductPage({params}: Props) {
  const {shop, product} = lookup((await params).id);
  const category = ({tires: 'opony', wheels: 'felgi', hubcaps: 'kolpaki'} as const)[product.type];
  const specs: Attribute[] = product.type === 'tires' ? ['season', 'vehicle', 'tier']
    : product.type === 'wheels' ? ['material', 'style', 'finish', 'vehicle'] : ['diameter'];
  const related = shop.products.filter(item => item.id !== product.id && item.type === product.type).slice(0, 3);
  return <section className="wrap inner-page">
    <div className="breadcrumb"><Link href="/">Start</Link><span>/</span><Link href={'/' + category}>{categories[category].title}</Link><span>/</span>{product.name}</div>
    <div className="product-detail-layout">
      <div className="detail-gallery"><img src={product.image} alt={`${product.brand} ${product.name}`} width="700" height="700"/></div>
      <div className="detail-info"><p className="eyebrow">{product.brand}</p><h1>{product.name}</h1><p className="detail-lead">{product.description}</p>
        <div className="detail-specs"><div><span>Rozmiar</span><strong>{product.size}</strong></div>
          {specs.map(field => {
            const raw = attributeValue(product, field);
            return raw && <div key={field}><span>{filterLabels[field]}</span><strong>{field === 'season' && product.seasonLabel ? product.seasonLabel : filterOptionLabel(field, raw)}</strong></div>;
          })}</div>
        {product.eprelUrl && product.labelImage && <a className="eprel-label" href={product.eprelUrl} target="_blank" rel="noreferrer">
          <img src={product.labelImage} alt="Etykieta UE opony"/>Karta informacyjna w EPREL
        </a>}
        <div className="detail-price-line"><div><strong>{money(product.priceCents)}</strong><small> / szt.</small></div>
          <small>{shop.ordering ? `Dostępne sztuki: ${product.stock}` : 'Katalog podglądowy'}</small></div>
        <AddProduct product={product} detail/>
        <Link className="detail-back" href="/poradnik">Jak sprawdzić zgodność z samochodem?</Link>
      </div>
    </div>
    {related.length > 0 && <section className="related-section"><div className="section-head"><h2>Podobne produkty</h2></div><Cards products={related}/></section>}
  </section>;
}
