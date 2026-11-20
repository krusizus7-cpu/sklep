import type { ReactNode } from 'react';
import { money, type Product } from '@/lib/types';

export function ProductDetail({product, ordering, children}: {product: Product; ordering: boolean; children: ReactNode}) {
  const tire = product.type === 'tires';
  return <div className="product-detail-layout">
      <div className="detail-gallery">{product.image ? <img src={product.image} alt={`${product.brand} ${product.name}`} width="700" height="700"/> : <span>Brak zdjęcia</span>}</div>
      <div className="detail-info"><p className="eyebrow">{product.brand}</p><h1>{product.name}</h1><p className="detail-lead">{product.description}</p>
        <div className="detail-specs"><div><span>Rozmiar</span><strong>{product.size}</strong></div>
          <div><span>{tire ? 'Sezon' : 'Wykończenie'}</span><strong>{tire ? product.seasonLabel : product.finish}</strong></div></div>
        {product.eprelUrl && product.labelImage && <a className="eprel-label" href={product.eprelUrl} target="_blank" rel="noreferrer">
          <img src={product.labelImage} alt="Etykieta UE opony"/>Karta informacyjna w EPREL
        </a>}
        <div className="detail-price-line"><div><strong>{Number.isFinite(product.priceCents) ? money(product.priceCents) : "—"}</strong><small> / szt.</small></div>
          <small>{ordering ? `Dostępne sztuki: ${Number.isFinite(product.stock) ? product.stock : '—'}` : 'Katalog podglądowy'}</small></div>
        {children}
      </div>
    </div>;
}
