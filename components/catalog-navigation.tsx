'use client';

import Link from 'next/link';
import { createContext, useContext, useLayoutEffect, useRef, useState, type MouseEvent, type ReactNode } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

type Visit = {url: string; product: string; y: number; offset: number};
let opening: Visit | null = null;

function isVisit(value: unknown): value is Visit {
  if (!value || typeof value !== 'object') return false;
  const visit = value as Partial<Visit>;
  return typeof visit.url === 'string' && /^\/(opony|felgi|oferta)(\?|$)/.test(visit.url) &&
    typeof visit.product === 'string' && /^[\w-]{1,64}$/.test(visit.product) &&
    Number.isFinite(visit.y) && Number.isFinite(visit.offset);
}

export function CatalogListing({children}: {children: ReactNode}) {
  const root = useRef<HTMLDivElement>(null);
  const [last, setLast] = useState('');
  const path = usePathname();
  const params = useSearchParams().toString();
  useLayoutEffect(() => {
    opening = null;
    const visit = history.state?.catalogVisit;
    if (!isVisit(visit) || visit.url !== location.pathname + location.search) {
      setLast('');
      return;
    }
    const card = root.current?.querySelector<HTMLElement>(`[data-product-id="${visit.product}"]`);
    if (!card) { setLast(''); return; }
    setLast(visit.product);
    const frame = requestAnimationFrame(() => {
      // Use the tile's viewport offset even if the refreshed list changed height.
      const target = window.scrollY + card.getBoundingClientRect().top - visit.offset;
      window.scrollTo({top: Number.isFinite(target) ? target : visit.y, behavior: 'instant'});
    });
    return () => cancelAnimationFrame(frame);
  }, [path, params]);

  function remember(event: MouseEvent<HTMLDivElement>) {
    if (event.button || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if (!(event.target instanceof Element)) return;
    const link = event.target.closest<HTMLAnchorElement>('a');
    const card = link?.closest<HTMLElement>('[data-product-id]');
    const product = card?.dataset.productId;
    if (!product || !card || link?.pathname !== '/produkt/' + product) return;
    opening = {url: location.pathname + location.search, product, y: scrollY, offset: card.getBoundingClientRect().top};
    history.replaceState({...history.state, catalogVisit: opening}, '');
    setLast(product);
  }
  return <div ref={root} onClickCapture={remember}>
    <LastViewedContext.Provider value={last}>{children}</LastViewedContext.Provider>
  </div>;
}

const LastViewedContext = createContext('');
export function LastViewed({id}: {id: string}) {
  return useContext(LastViewedContext) === id ? <small className="last-viewed">Ostatnio oglądany</small> : null;
}

export function CatalogReturn({product, category}: {product: string; category: string}) {
  const [visit, setVisit] = useState<Visit | null>(null);
  const router = useRouter();
  useLayoutEffect(() => {
    const origin = opening?.product === product ? opening : history.state?.productOrigin;
    opening = null;
    if (isVisit(origin) && origin.product === product) {
      history.replaceState({...history.state, productOrigin: origin}, '');
      setVisit(origin);
    } else setVisit(null);
  }, [product]);
  return visit
    ? <Link className="return-link" href={visit.url} onNavigate={e => { e.preventDefault(); router.back(); }}>← Wróć do wyników</Link>
    : <Link className="return-link" href={category}>← Wróć do kategorii</Link>;
}
