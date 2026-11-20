import Link from 'next/link';
import { Pagination, pageNumber } from '@/components/pagination';
import { orderPageSize } from '@/server/orders.mjs';
import { requireAdmin } from '@/lib/session';
import { runtime } from '@/lib/store';
import { date, money, statusNames, type OrderStatus, type OrderSummary } from '@/lib/types';

const tabs = ['paid', 'shipped', 'pending', 'registering', 'cancelled'] as const;
export default async function AdminOrders({searchParams}: {searchParams: Promise<{status?: string; strona?: string}>}) {
  await requireAdmin();
  const {status: query, strona} = await searchParams;
  const page = pageNumber(strona);
  const status: OrderStatus = tabs.find(tab => tab === query) ?? 'paid';
  const rows = runtime().orders.adminOrders(status, (page - 1) * orderPageSize) as unknown as OrderSummary[];
  const orders = rows.slice(0, orderPageSize);
  return <>
    <div className="page-intro"><h1>Zamówienia</h1></div>
    <nav className="admin-tabs" aria-label="Status zamówienia">{tabs.map(tab =>
      <Link key={tab} href={'/admin/zamowienia?status=' + tab} aria-current={status === tab ? 'page' : undefined}>{statusNames[tab]}</Link>
    )}</nav>
    {orders.length ? <div className="table-scroll"><table><caption className="visually-hidden">Zamówienia</caption>
      <thead><tr><th scope="col">Numer zamówienia</th><th scope="col">Data</th><th scope="col">Kwota brutto</th></tr></thead>
      <tbody>{orders.map(order => <tr key={order.id}><th scope="row"><Link href={'/admin/zamowienia/' + order.id}>{order.id}</Link></th>
        <td>{date(order.createdAt)}</td><td>{money(order.total)}</td></tr>)}</tbody>
    </table></div> : <p>Brak zamówień o tym statusie.</p>}
    <Pagination page={page} path="/admin/zamowienia" query={{status}} hasMore={rows.length > orderPageSize}/>
  </>;
}
