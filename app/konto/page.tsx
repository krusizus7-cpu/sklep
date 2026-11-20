import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Pagination, pageNumber } from '@/components/pagination';
import { orderPageSize } from '@/server/orders.mjs';
import { OrderItems } from '@/components/order-items';
import { logout } from '@/lib/auth-actions';
import { currentAccount } from '@/lib/session';
import { runtime } from '@/lib/store';
import { date, money, statusNames, type OrderHistory } from '@/lib/types';
export const metadata = {title: 'Moje konto', robots: {index: false}};

export default async function AccountPage({searchParams}: {searchParams: Promise<{strona?: string}>}) {
  const account = await currentAccount();
  if (!account) redirect('/logowanie');
  const page = pageNumber((await searchParams).strona);
  const rows = runtime().orders.forAccount(account.id, (page - 1) * orderPageSize) as unknown as OrderHistory[];
  const orders = rows.slice(0, orderPageSize);
  return <section className="wrap inner-page">
    <div className="page-intro"><h1>Moje konto</h1><p>{account.email}</p></div>
    <div className="account-actions">
      {account.role === 'admin' && <Link href="/admin" className="btn btn-border">Panel administracyjny</Link>}
      <form action={logout}><button className="btn btn-border">Wyloguj się</button></form>
    </div>
    <h2>Historia zamówień</h2>
    {orders.length === 0 && <p>Nie masz jeszcze zamówień. <Link href="/oferta">Przejdź do oferty</Link>.</p>}
    <div className="history-list">{orders.map(order => <details className="panel-form" key={order.id}>
      <summary><span>{date(order.createdAt)}</span><span>{statusNames[order.shippedAt ? 'shipped' : order.status]}</span><strong>{money(order.total)}</strong></summary>
      <OrderItems order={order}/>
      <Link href={'/zamowienia/' + order.id}>Zobacz status zamówienia</Link>
    </details>)}</div>
    <Pagination page={page} path="/konto" hasMore={rows.length > orderPageSize}/>
  </section>;
}
