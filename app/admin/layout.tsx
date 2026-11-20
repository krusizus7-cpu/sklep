import Link from 'next/link';
import { requireAdmin } from '@/lib/session';
export const metadata = {title: 'Panel administracyjny', robots: {index: false}};

export default async function AdminLayout({children}: {children: React.ReactNode}) {
  await requireAdmin();
  return <section className="wrap inner-page">
    <nav className="admin-nav" aria-label="Panel administracyjny">
      <Link href="/admin">Przegląd</Link><Link href="/admin/produkty">Produkty i magazyn</Link>
      <Link href="/admin/zamowienia">Zamówienia</Link><Link href="/konto">Moje konto</Link>
    </nav>
    {children}
  </section>;
}
