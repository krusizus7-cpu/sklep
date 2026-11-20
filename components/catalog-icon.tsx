import type { ReactNode } from 'react';

const paths = {
  filters: <><path d="M3 6h18M3 12h18M3 18h18"/><path d="M8 3v6m8 0v6M9 15v6"/></>,
  chevron: <path d="m6 9 6 6 6-6"/>,
  close: <path d="m6 6 12 12M18 6 6 18"/>,
  search: <><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4.5 4.5"/></>,
  account: <><circle cx="12" cy="7" r="4"/><path d="M3.5 22v-2a6 6 0 0 1 6-6h5a6 6 0 0 1 6 6v2Z"/></>,
  cart: <><path d="M3 4h2l2.2 11.2h11.5l2-8.2H6.2"/><circle cx="9" cy="20" r="1.2"/><circle cx="18" cy="20" r="1.2"/></>,
  car: <><path d="m4 11 2.5-5h11l2.5 5M4 11h16l1.5 2v4h-3m-13 0h-3v-4L4 11Zm6 6h4"/><circle cx="7.5" cy="17" r="2"/><circle cx="16.5" cy="17" r="2"/></>,
  finish: <><path d="M12 3 3 8l9 5 9-5-9-5ZM3 12l9 5 9-5M3 16l9 5 9-5"/></>,
  grip: <><path d="M20 7.5c0 4.7-3.6 7.5-8 7.5s-8-2.8-8-7.5c0-2.1.7-3.3 1.5-4.5l2.5 1.3m8 0 2.5-1.3c.8 1.2 1.5 2.4 1.5 4.5ZM5 20l4-2m1 3 4-2m1 2 4-2"/><path d="M12 3c1.3 1.6 2.1 2.5 2.1 3.6a2.1 2.1 0 0 1-4.2 0c0-1.1.8-2 2.1-3.6Z"/></>,
  summer: <><circle cx="12" cy="12" r="4"/><path d="M12 2v3m0 14v3M2 12h3m14 0h3M5 5l2 2m10 10 2 2M5 19l2-2M17 7l2-2"/></>,
  winter: <path d="M12 2v20M3.3 7l17.4 10M3.3 17 20.7 7M9 4l3 3 3-3M9 20l3-3 3 3M4 10l4-1-1-4m13 9-4 1 1 4M4 14l4 1-1 4m13-9-4-1 1-4"/>,
  allseason: <><path d="M20 4C11 4 5 8 5 14a5 5 0 0 0 5 5c6 0 10-6 10-15Z"/><path d="M4 20 15 9"/></>
} satisfies Record<string, ReactNode>;

export function CatalogIcon({name}: {name: keyof typeof paths}) {
  return <svg className="shop-catalog-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}
