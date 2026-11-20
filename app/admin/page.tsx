import Link from 'next/link';
import { RevenueChart, shortDay } from '@/components/admin-chart';
import { AdminIcon, type AdminIconName } from '@/components/admin-icons';
import { AdminEmpty, AdminHeading, AdminOrderTable, AdminPanel, ProductIdentity, StockBadge } from '@/components/admin-ui';
import { stockStatus, type AdminOrderRow, type AdminProduct } from '@/lib/admin';
import { requireAdmin } from '@/lib/session';
import { runtime } from '@/lib/store';
import { money } from '@/lib/types';
import { calendarWindow, summarizeSales } from '@/server/admin-report.mjs';

function Metric({label, value, detail, href, icon}: {
  label: string; value: React.ReactNode; detail: string; href: string; icon: AdminIconName;
}) {
  return <Link className="admin-metric-link" href={href}>
    <span className="admin-metric-head"><span>{label}</span><AdminIcon name={icon} size={19}/></span>
    <strong className="admin-numbers">{value}</strong>
    <span className="admin-metric-foot">{detail}<AdminIcon name="arrow" size={15}/></span>
  </Link>;
}

export default async function Admin() {
  await requireAdmin();
  const {orders, payment} = runtime();
  const {days, from, until} = calendarWindow(30);
  const report = summarizeSales(orders.paidBetween(from, until), days);
  const {lowStock} = orders.settings();
  const active = (orders.adminCatalog() as AdminProduct[]).filter(product => !product.archived);
  const low = active.filter(product => stockStatus(product.stock, lowStock) === 'low').length;
  const alerts = active.filter(product => product.stock <= lowStock)
    .sort((a, b) => a.stock - b.stock || a.id.localeCompare(b.id)).slice(0, 5);
  const queue = orders.adminOrders('paid', 0, '', 5) as unknown as AdminOrderRow[];

  return <>
    <AdminHeading title="Przegląd sklepu"
      description={payment ? 'Sprzedaż, zamówienia i dostępność produktów.' : 'Tryb podglądu. Sprzedaż jest niedostępna.'}
      action={<Link className="admin-button admin-primary" href="/admin/produkty/nowy"><AdminIcon name="plus" size={17}/> Dodaj produkt</Link>}/>
    <div className="admin-metrics">
      <Metric label="Wpływy brutto" value={money(report.total)} detail="Ostatnie 30 dni" href="/admin/analityka" icon="analytics"/>
      <Metric label="Do wysłania" value={orders.countOrders('paid')} detail="Opłacone zamówienia" href="/admin/zamowienia" icon="orders"/>
      <Metric label="Oczekujące płatności" value={orders.countOrders('awaiting')} detail="Przelewy24" href="/admin/platnosci" icon="payments"/>
      <Metric label="Niski stan magazynu" value={low} detail={'Od 1 do ' + lowStock + ' szt. na SKU'} href="/admin/magazyn?stan=low" icon="warehouse"/>
    </div>
    <div className="admin-dashboard-grid">
      <AdminPanel title="Wpływy ze sprzedaży" action={<span className="admin-muted">{shortDay(days[0])} – {shortDay(days[29])}</span>}>
        <p className="admin-chart-number admin-numbers">{money(report.total)}</p>
        <RevenueChart days={report.days}/>
      </AdminPanel>
      <AdminPanel title="Dostępność produktów" action={<Link className="admin-panel-link" href="/admin/magazyn">Magazyn <AdminIcon name="chevron" size={15}/></Link>}>
        {alerts.length ? <ul className="admin-stock-alerts">{alerts.map(product => <li key={product.id}>
          <ProductIdentity product={product} href={'/admin/magazyn/' + product.id}/>
          <span className="admin-stock-alert-state"><StockBadge stock={product.stock} threshold={lowStock}/>
            <span className="admin-numbers">{product.stock} szt.</span></span>
        </li>)}</ul> : <AdminEmpty message="Brak produktów z niskim lub zerowym stanem."/>}
      </AdminPanel>
    </div>
    <AdminPanel title="Zamówienia do wysłania" action={<Link className="admin-panel-link" href="/admin/zamowienia">
      Obsłuż zamówienia <AdminIcon name="chevron" size={15}/></Link>}>
      {queue.length ? <AdminOrderTable orders={queue}/> : <AdminEmpty message="Brak opłaconych zamówień do wysłania."/>}
    </AdminPanel>
  </>;
}
