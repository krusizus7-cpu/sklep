import Link from 'next/link';
import { requireAdmin } from '@/lib/session';
import { readShop } from '@/lib/store';

export default async function Admin() {
  await requireAdmin();
  const shop = readShop();
  return <section>
    <div className="page-intro"><h1>Panel administracyjny</h1><p>{shop.ordering ? 'Tryb płatności ' + shop.paymentMode : 'Tryb podglądu'}</p></div>
    <div className="account-actions"><Link className="btn btn-red" href="/admin/produkty">Zarządzaj produktami</Link>
      <Link className="btn btn-border" href="/admin/zamowienia">Obsłuż zamówienia</Link></div>
  </section>;
}
