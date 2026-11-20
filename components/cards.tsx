import Link from 'next/link';
import { money, type Product } from '@/lib/types';
import { AddProduct, FavoriteButton } from './basket';

export function Cards({products, catalog = false}: {products: Product[]; catalog?: boolean}) {
  return <div className={`products-grid${catalog ? ' catalog-grid' : ''}`}>
    {products.map(product => <article className="product-card" key={product.id}>
      <div className="product-media">
        <Link href={'/produkt/' + product.id} aria-label={`Zobacz ${product.brand} ${product.name}`}>
          <img src={product.image} alt="" width="700" height="700" loading="lazy" decoding="async"/>
        </Link>
        <FavoriteButton id={product.id}/>
      </div>
      <div className="product-body">
        <p className="product-brand">{product.brand}</p>
        <h3 className="product-title"><Link href={'/produkt/' + product.id}>{product.name}</Link></h3>
        <p className="product-spec">{product.size}{product.seasonLabel && ' · ' + product.seasonLabel}</p>
        <div className="product-price-row">
          <div className="price"><strong>{money(product.priceCents)}</strong><small>za sztukę</small></div>
          <AddProduct product={product}/>
        </div>
      </div>
    </article>)}
  </div>;
}
