import Link from 'next/link';
import { seasonOptions } from '@/lib/filters';
import { vehicleLabels } from '@/lib/tire-attributes.mjs';
import { money, type Product } from '@/lib/types';
import { AddProduct, FavoriteButton } from './basket';
import { CatalogIcon } from './catalog-icon';

export function CatalogCards({products}: {products: Product[]}) {
  return <div className="shop-catalog-grid">
    {products.map((product, index) => {
      const href = '/produkt/' + product.id;
      return <article className="shop-catalog-card" key={product.id}>
        <div className="shop-catalog-card-media">
          <Link href={href} aria-label={`Zobacz ${product.brand} ${product.name}`}>
            <img src={product.image} alt="" width={520} height={360} loading={index < 2 ? 'eager' : 'lazy'} decoding="async"/>
          </Link>
          {product.bestseller && <span className="shop-catalog-badge">Bestseller</span>}
        </div>
        <div className="shop-catalog-card-body">
          <p className="shop-catalog-brand">{product.brand}</p>
          <div className="shop-catalog-card-heading">
            <div>
              <h3><Link href={href}>{product.name}</Link></h3>
              <p className="shop-catalog-spec">{product.size}</p>
            </div>
            <p className="shop-catalog-price"><strong>{money(product.priceCents)}</strong><small>/ szt.</small></p>
          </div>
          <ul className="shop-catalog-attributes">
            {product.season && <li><CatalogIcon name={product.season}/>{seasonOptions[product.season]}</li>}
            {product.vehicle && <li><CatalogIcon name="car"/>{vehicleLabels[product.vehicle]}</li>}
            {product.wetGripClass && <li><CatalogIcon name="grip"/>Przyczepność na mokrym {product.wetGripClass}</li>}
            {product.finish && <li><CatalogIcon name="finish"/>Wykończenie: {product.finish}</li>}
          </ul>
          <div className="shop-catalog-card-actions">
            <FavoriteButton id={product.id}/>
            <AddProduct product={product} catalogCard/>
          </div>
        </div>
      </article>;
    })}
  </div>;
}
