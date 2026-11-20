import type { Metadata } from 'next';
import './next-store.css';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: {default: 'BIEŻNIK — Opony i felgi', template: '%s | BIEŻNIK'},
  icons: {icon: '/assets/wheel-hero.svg'},
  description: 'Dobierz opony i felgi według parametrów. Zamów komplet z dostawą kurierską.'
};

export default function Layout({children}: {children: React.ReactNode}) {
  return <html lang="pl">
    <head>{['fonts', 'styles', 'polish', 'hero-finder', 'storefront'].map(name =>
      <link key={name} rel="stylesheet" href={`/${name}.css`}/>)}</head>
    <body>{children}</body>
  </html>;
}
