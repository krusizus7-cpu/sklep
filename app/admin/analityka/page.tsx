import Link from 'next/link';
import { RevenueChart, shortDay } from '@/components/admin-chart';
import { AdminEmpty, AdminHeading, AdminPanel } from '@/components/admin-ui';
import { adminProductHref, queryValue, type AdminQuery } from '@/lib/admin';
import { requireAdmin } from '@/lib/session';
import { runtime } from '@/lib/store';
import { money } from '@/lib/types';
import { calendarWindow, summarizeSales } from '@/server/admin-report.mjs';

const periods = [7, 30, 90];

export default async function AdminAnalytics({searchParams}: {searchParams: Promise<AdminQuery>}) {
  await requireAdmin();
  const query = await searchParams;
  const period = periods.find(days => String(days) === queryValue(query, 'dni')) ?? 30;
  const {days, from, until} = calendarWindow(period);
  const orders = runtime().orders;
  const report = summarizeSales(orders.paidBetween(from, until), days);

  return <>
    <AdminHeading title="Analityka" description="Sprzedaż według dnia opłacenia zamówienia, w czasie polskim."
      action={<nav className="admin-periods" aria-label="Zakres danych">
        {periods.map(value => <Link key={value} href={'/admin/analityka?dni=' + value}
          aria-current={period === value ? 'page' : undefined}>{value} dni</Link>)}
      </nav>}/>
    <dl className="admin-metrics">
      <div><dt>Wpływy brutto z dostawą</dt><dd>{money(report.total)}</dd></div>
      <div><dt>Opłacone zamówienia</dt><dd>{report.orders}</dd></div>
      <div><dt>Średnia wartość zamówienia</dt><dd>{money(report.average)}</dd></div>
      <div><dt>Sprzedane sztuki</dt><dd>{report.quantity}</dd></div>
    </dl>
    <div className="admin-column">
      <AdminPanel title="Dzienne wpływy" action={<span className="admin-muted">{shortDay(days[0])} – {shortDay(days[days.length - 1])}</span>}>
        <RevenueChart days={report.days}/>
      </AdminPanel>
      <AdminPanel title="Najczęściej kupowane produkty">
        {report.items.length ? <div className="admin-table-scroll" tabIndex={0} role="region" aria-label="Ranking sprzedaży">
          <table className="admin-table">
            <caption className="visually-hidden">Ranking SKU według liczby sprzedanych sztuk</caption>
            <thead><tr><th scope="col">Produkt</th><th scope="col">SKU</th>
              <th scope="col" className="admin-align-right">Sprzedane szt.</th></tr></thead>
            <tbody>{report.items.slice(0, 10).map(item => <tr key={item.id}>
              <th scope="row">{orders.adminProduct(item.id)
                ? <Link className="admin-table-link" href={adminProductHref(item.id)}>{item.name}</Link> : item.name}</th>
              <td className="admin-id">{item.id}</td><td className="admin-align-right admin-numbers">{item.quantity}</td>
            </tr>)}</tbody>
          </table>
        </div> : <AdminEmpty message="Brak sprzedanych produktów w tym okresie."/>}
      </AdminPanel>
    </div>
  </>;
}
