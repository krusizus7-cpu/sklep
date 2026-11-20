'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { Product } from '@/lib/types';

type BasketState = {items: Record<string, number>; favorites: string[]};
const empty: BasketState = {items: {}, favorites: []};
const key = 'bieznik.basket.v1';

function useBasketState(maxUnits: number, maxPerProduct: number) {
  const [data, setData] = useState(empty);
  const [ready, setReady] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    try {
      const saved = localStorage.getItem(key);
      if (saved) {
        const parsed = JSON.parse(saved);
        const validId = (id: unknown): id is string => typeof id === 'string' && /^[\w-]{1,64}$/.test(id);
        setData({
          items: Object.fromEntries(Object.entries(parsed.items ?? {}).filter((entry): entry is [string, number] => {
            const [id, count] = entry;
            return validId(id) && typeof count === 'number' && Number.isInteger(count) && count > 0 && count <= maxPerProduct;
          }
          )),
          favorites: Array.isArray(parsed.favorites) ? parsed.favorites.filter(validId) : []
        });
      } else {
        const legacy: [string, number][] = JSON.parse(sessionStorage.getItem('bieznik.cart') ?? '[]');
        setData({...empty, items: Object.fromEntries(legacy.filter(([id, n]) =>
          /^[\w-]{1,64}$/.test(id) && Number.isInteger(n) && n > 0 && n <= maxPerProduct
        ))});
      }
    } catch {
      setData(empty);
    }
    setReady(true);
  }, [maxPerProduct]);

  useEffect(() => {
    if (!ready) return;
    try { localStorage.setItem(key, JSON.stringify(data)); } catch { /* storage is optional */ }
  }, [data, ready]);

  const count = Object.values(data.items).reduce((sum, quantity) => sum + quantity, 0);
  const quantityFor = (id: string) => Object.hasOwn(data.items, id) ? data.items[id] : 0;
  function setQuantity(product: Product, quantity: number) {
    const previous = quantityFor(product.id);
    if (quantity > previous && (quantity > Math.min(product.stock, maxPerProduct) || count - previous + quantity > maxUnits)) {
      setMessage('Osiągnięto limit dostępnych sztuk.');
      return;
    }
    const items = {...data.items, [product.id]: quantity};
    if (quantity <= 0) delete items[product.id];
    setData({...data, items});
    setMessage(quantity > previous ? 'Dodano do koszyka.' : '');
  }
  function remove(id: string) {
    const items = {...data.items};
    delete items[id];
    setData({...data, items});
  }
  function favorite(id: string) {
    setData({...data, favorites: data.favorites.includes(id) ? data.favorites.filter(item => item !== id) : [...data.favorites, id]});
  }
  function clear() {
    const updated = {...data, items: {}};
    try { localStorage.setItem(key, JSON.stringify(updated)); } catch { /* storage is optional */ }
    setData(updated);
  }
  return {...data, ready, count, message, quantityFor, setQuantity, remove, favorite, clear};
}

const BasketContext = createContext<ReturnType<typeof useBasketState> | null>(null);
export function BasketProvider({children, maxUnits, maxPerProduct}: {children: ReactNode; maxUnits: number; maxPerProduct: number}) {
  return <BasketContext.Provider value={useBasketState(maxUnits, maxPerProduct)}>{children}</BasketContext.Provider>;
}
export function useBasket() {
  const basket = useContext(BasketContext);
  if (!basket) throw new Error('BasketProvider is missing.');
  return basket;
}
export function CartLink() {
  const {count, message} = useBasket();
  return <><Link href="/koszyk" className="cart-button basket-link" aria-label={`Koszyk, sztuk: ${count}`}>
    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 4h2l2.2 11.2h11.5l2-8.2H6.2"/><circle cx="9" cy="20" r="1.2"/><circle cx="18" cy="20" r="1.2"/></svg>
    <span>Koszyk</span><span className="cart-number">{count}</span>
  </Link><span className="visually-hidden" role="status">{message}</span></>;
}
export function AddProduct({product, detail = false}: {product: Product; detail?: boolean}) {
  const basket = useBasket();
  if (!product.stock) return <span className="stock-label">Niedostępny</span>;
  return <button type="button" className={detail ? 'btn btn-red' : 'product-add'} disabled={!basket.ready}
    aria-label={'Dodaj do koszyka: ' + product.name}
    onClick={() => basket.setQuantity(product, basket.quantityFor(product.id) + 1)}>
    {detail ? 'Dodaj do koszyka' : '+'}
  </button>;
}
export function FavoriteButton({id}: {id: string}) {
  const basket = useBasket();
  const saved = basket.favorites.includes(id);
  return <button type="button" className={'wish-btn' + (saved ? ' saved' : '')} disabled={!basket.ready}
    aria-label={saved ? 'Usuń z ulubionych' : 'Dodaj do ulubionych'} aria-pressed={saved} onClick={() => basket.favorite(id)}>
    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.8 8.8c0 5.5-8.8 11-8.8 11s-8.8-5.5-8.8-11a5 5 0 0 1 8.8-3.1 5 5 0 0 1 8.8 3.1Z"/></svg>
  </button>;
}

const orderId = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function LastOrderLink() {
  const [id, setId] = useState<string | null>(null);
  useEffect(() => {
    try {
      const last = sessionStorage.getItem('bieznik.order');
      if (last && orderId.test(last)) setId(last);
    } catch { /* storage is optional */ }
  }, []);
  return id && <Link href={'/zamowienia/' + id} prefetch={false}>Status ostatniego zamówienia</Link>;
}

export function LegacyNavigation() {
  const router = useRouter();
  useEffect(() => {
    function followLegacyLink() {
      if (location.pathname !== '/' || !location.hash.startsWith('#/')) return;
      const [section, id] = location.hash.slice(2).split('/');
      const routes: Record<string, string> = {
        cart: '/koszyk', checkout: '/zamowienie', guide: '/poradnik', favorites: '/ulubione'
      };
      const categories: Record<string, string> = {tires: '/opony', wheels: '/felgi', all: '/oferta'};
      if (section === 'order' && orderId.test(id ?? '')) router.replace('/zamowienia/' + id);
      else if (section === 'product' && /^[\w-]{1,64}$/.test(id ?? '')) router.replace('/produkt/' + id);
      else if (section === 'catalog' && Object.hasOwn(categories, id)) router.replace(categories[id]);
      else if (Object.hasOwn(routes, section)) router.replace(routes[section]);
    }
    followLegacyLink();
    window.addEventListener('hashchange', followLegacyLink);
    return () => window.removeEventListener('hashchange', followLegacyLink);
  }, [router]);
  return null;
}
