'use client';

import Form from 'next/form';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { catalogParams, isProductCategory, readCatalogParams, type ProductCategory } from '@/lib/catalog-query';
import { CartLink } from './basket';
import { CatalogIcon } from './catalog-icon';

const navigation = [
  ['/opony', 'Opony'], ['/felgi', 'Felgi'], ['/oferta', 'Cała oferta'],
  ['/poradnik', 'Dobór kół'], ['/ulubione', 'Ulubione'], ['/konto', 'Moje konto']
];
const catalogNavigation = navigation.slice(0, -1).map(([href, label]) => [href, href === '/poradnik' ? 'Poradnik' : label]);

function CatalogSearchForm({category, label}: {category: ProductCategory; label: string}) {
  const query = readCatalogParams(category, useSearchParams());
  const hidden = catalogParams(category, {...query, q: undefined});
  return <Form action={'/' + category} onSubmit={event => event.currentTarget.parentElement?.hidePopover()}>
    {Array.from(hidden.entries()).map(([name, value]) => <input type="hidden" key={name + ':' + value} name={name} value={value}/>)}
    <label htmlFor="shop-catalog-header-query">{label}</label>
    <div className="shop-catalog-search-row">
      <input type="search" id="shop-catalog-header-query" name="q" key={query.q} defaultValue={query.q} maxLength={100} placeholder="Marka, model lub rozmiar" autoFocus/>
      <button type="submit">Szukaj</button>
    </div>
  </Form>;
}

export function SiteHeader() {
  const pathname = usePathname();
  const slug = pathname.slice(1);
  const category = isProductCategory(slug) ? slug : null;
  const searchLabel = category === 'felgi' ? 'Szukaj felg' : 'Szukaj opon';
  const links = category ? catalogNavigation : navigation;
  return <header className={'site-header' + (category ? ' shop-catalog-site-header' : '')}>
    <div className="wrap header-inner">
      <Link href="/" className="brand" aria-label="BIEŻNIK — strona główna">
        <span className="brand-icon" aria-hidden="true"><i/><i/><i/></span>
        <span className="brand-name">BIEŻNIK<span className="brand-period">.</span><small>TYRE &amp; WHEEL STUDIO</small></span>
      </Link>
      <nav className="desktop-nav" aria-label="Nawigacja główna">
        {links.map(([href, name]) => <Link key={href} href={href} aria-current={pathname === href ? 'page' : undefined}>{name}</Link>)}
      </nav>
      <div className="header-actions">
        {category && <>
          <button type="button" className="shop-catalog-header-action shop-catalog-search-trigger" aria-label={searchLabel} popoverTarget="shop-catalog-header-search"><CatalogIcon name="search"/></button>
          <div key={category} className="shop-catalog-search-popover" id="shop-catalog-header-search" popover="auto">
            <Suspense><CatalogSearchForm category={category} label={searchLabel}/></Suspense>
          </div>
          <Link className="shop-catalog-header-action" href="/konto" aria-label="Moje konto"><CatalogIcon name="account"/></Link>
        </>}
        <CartLink/>
        <details className="nav-details">
          <summary aria-label="Menu">Menu</summary>
          <nav aria-label="Nawigacja mobilna">{links.map(([href, name]) => <a key={href} href={href} aria-current={pathname === href ? 'page' : undefined}>{name}</a>)}</nav>
        </details>
      </div>
    </div>
  </header>;
}
