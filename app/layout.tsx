import type { Metadata } from 'next';
import Link from 'next/link';
import { BasketProvider, LastOrderLink, LegacyNavigation } from '@/components/basket';
import { readShop } from '@/lib/store';
import { Brand } from '@/components/brand';
import { Header } from '@/components/header';
import { Icon } from '@/components/icon';
import './next-store.css';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: {default: 'BIEŻNIK — Opony i felgi', template: '%s | BIEŻNIK'},
  icons: {icon: '/assets/wheel-hero.svg'},
  description: 'Dobierz opony i felgi według parametrów. Zamów komplet z dostawą kurierską.'
};

export default function Layout({children}: Readonly<{children: React.ReactNode}>) {
  const shop = readShop();
  return <html lang="pl"><head>
    <link rel="stylesheet" href="/fonts.css"/>
  </head><body>
    <BasketProvider maxUnits={shop.maxUnits} maxPerProduct={shop.maxPerProduct}>
      <LegacyNavigation/>
      <a className="skip" href="#main">Przejdź do treści</a>
      {(!shop.ordering || shop.paymentMode === 'sandbox') && <p className="preview-notice"><Icon name="info"/>
        {shop.ordering ? 'Tryb testowy Przelewy24. Zamówienia nie są realizowane.' : 'Tryb podglądu. Sprzedaż jest niedostępna.'}
      </p>}
      <Header/>
      <main id="main" tabIndex={-1}>{children}</main>
      <footer className="footer"><div className="wrap footer-cols storefront-footer">
        <Brand/>
        <nav aria-label="Informacje o sklepie"><Link href="/opony">Opony</Link><Link href="/felgi">Felgi</Link><Link href="/kolpaki">Kołpaki</Link><Link href="/poradnik">Dobór kół</Link><LastOrderLink/></nav>
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
