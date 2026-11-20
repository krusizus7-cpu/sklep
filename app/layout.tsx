import type { Metadata } from 'next';
import Link from 'next/link';
import { BasketProvider, CartLink, LastOrderLink, LegacyNavigation } from '@/components/basket';
import { readShop } from '@/lib/store';
import './next-store.css';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: {default: 'BIEŻNIK — Opony i felgi', template: '%s | BIEŻNIK'},
  icons: {icon: '/assets/wheel-hero.svg'},
  description: 'Dobierz opony i felgi według parametrów. Zamów komplet z dostawą kurierską.'
};

const navigation = [['/opony', 'Opony'], ['/felgi', 'Felgi'], ['/oferta', 'Cała oferta'], ['/poradnik', 'Dobór kół'], ['/ulubione', 'Ulubione'], ['/konto', 'Moje konto']];

export default function Layout({children}: Readonly<{children: React.ReactNode}>) {
  const shop = readShop();
  return <html lang="pl"><head>
    {['fonts', 'styles', 'polish', 'hero-finder', 'storefront'].map(name =>
      <link key={name} rel="stylesheet" href={`/${name}.css`}/>)}
  </head><body>
    <BasketProvider maxUnits={shop.maxUnits} maxPerProduct={shop.maxPerProduct}>
      <LegacyNavigation/>
      <a className="skip" href="#main">Przejdź do treści</a>
      {(!shop.ordering || shop.paymentMode === 'sandbox') && <p className="preview-notice">
        {shop.ordering ? 'Tryb testowy Przelewy24. Zamówienia nie są realizowane.' : 'Tryb podglądu. Sprzedaż jest niedostępna.'}
      </p>}
      <header className="site-header">
        <div className="wrap header-inner">
          <Link href="/" className="brand" aria-label="BIEŻNIK — strona główna">
            <span className="brand-icon" aria-hidden="true"><i/><i/><i/></span>
            <span className="brand-name">BIEŻNIK<span className="brand-period">.</span><small>TYRE &amp; WHEEL STUDIO</small></span>
          </Link>
          <nav className="desktop-nav" aria-label="Nawigacja główna">
            {navigation.map(([href, name]) => <Link key={href} href={href}>{name}</Link>)}
          </nav>
          <div className="header-actions"><CartLink/>
            <details className="nav-details">
              <summary aria-label="Menu">Menu</summary>
              <nav aria-label="Nawigacja mobilna">{navigation.map(([href, name]) => <a key={href} href={href}>{name}</a>)}</nav>
            </details>
          </div>
        </div>
      </header>
      <main id="main" tabIndex={-1}>{children}</main>
      <footer className="footer"><div className="wrap footer-cols storefront-footer">
        <Link href="/" className="brand"><span className="brand-name">BIEŻNIK<span className="brand-period">.</span></span></Link>
        <nav aria-label="Informacje o sklepie"><Link href="/opony">Opony</Link><Link href="/felgi">Felgi</Link><Link href="/poradnik">Dobór kół</Link><LastOrderLink/></nav>
        {shop.ordering && <>
          <div><h3>Sprzedawca</h3><p>{shop.merchant.name} · {shop.merchant.address}{shop.merchant.taxId && ' · NIP ' + shop.merchant.taxId}</p>
            <a href={'mailto:' + shop.merchant.email}>{shop.merchant.email}</a>
            {shop.merchant.phone && <a href={'tel:' + shop.merchant.phone}>{shop.merchant.phone}</a>}
          </div>
          <nav aria-label="Regulamin i prywatność"><a href={shop.merchant.termsUrl}>Regulamin</a><a href={shop.merchant.privacyUrl}>Prywatność</a></nav>
        </>}
      </div></footer>
    </BasketProvider>
  </body></html>;
}
