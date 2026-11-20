'use client';

import Link from 'next/link';
import type { Product } from '@/lib/types';
import { Cards } from './cards';
import { useBasket } from './basket';

export function Favorites({products}: {products: Product[]}) {
  const {ready, favorites} = useBasket();
  if (!ready) return <p>Wczytywanie ulubionych…</p>;
  const selected = products.filter(product => favorites.includes(product.id));
  return selected.length ? <Cards products={selected}/> : <div className="empty"><h2>Brak ulubionych produktów</h2><p>Użyj serca przy produkcie, aby zapisać go na później.</p><Link className="btn btn-border" href="/oferta">Zobacz ofertę</Link></div>;
}
