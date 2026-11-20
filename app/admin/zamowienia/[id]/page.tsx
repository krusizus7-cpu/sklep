import { notFound } from 'next/navigation';
import { AdminMutation } from '@/components/admin-mutation';
import { AdminHeading, AdminPanel, OrderBadge } from '@/components/admin-ui';
import { OrderItems } from '@/components/order-items';
import { ShippingForm } from '@/components/shipping-form';
import { orderIdPattern } from '@/server/orders.mjs';
import { reconcilePayment } from '@/lib/admin-actions';
import { displayOrderStatus } from '@/lib/admin';
import { requireAdmin } from '@/lib/session';
import { runtime } from '@/lib/store';
import { date, money, statusNames, type OrderDetails } from '@/lib/types';

export default async function AdminOrder({params}: {params: Promise<{id: string}>}) {
  await requireAdmin();
  const {id} = await params;
  if (!orderIdPattern.test(id)) notFound();
  const {orders, payment} = runtime();
  const order = orders.get(id) as unknown as (OrderDetails & {paidAt: string | null; providerOrderId: number | null}) | undefined;
  if (!order) notFound();
  const status = displayOrderStatus(order);
  const pending = order.status === 'pending' || order.status === 'registering';
  return <>
    <AdminHeading title="Szczegóły zamówienia" description={order.id}
      back={{href: '/admin/zamowienia', label: 'Zamówienia'}} action={<OrderBadge status={status}/>}/>
    <div className="admin-detail-grid">
      <AdminPanel title="Pozycje zamówienia" className="admin-card-body">
        <OrderItems order={order}/>
        <p className="admin-order-total"><span>Razem brutto</span><strong className="admin-numbers">{money(order.total)}</strong></p>
      </AdminPanel>
      <div className="admin-column">
        <AdminPanel title="Adres dostawy" className="admin-card-body">
          <address>{order.customer.name}<br/>{order.customer.street}<br/>{order.customer.postcode} {order.customer.city}<br/>
            <a href={'mailto:' + order.customer.email}>{order.customer.email}</a><br/>
            <a href={'tel:' + order.customer.phone}>{order.customer.phone}</a>
          </address>
        </AdminPanel>
        <AdminPanel title="Płatność" className="admin-card-body">
          <dl className="admin-facts">
            <div><dt>Status płatności</dt><dd><OrderBadge status={order.status}/></dd></div>
            <div><dt>Transakcja Przelewy24</dt><dd className="admin-numbers">{order.providerOrderId ?? '—'}</dd></div>
          </dl>
          {payment && <AdminMutation action={reconcilePayment}>
            <input type="hidden" name="id" value={id}/>
            {pending && <button className="admin-button" type="submit">Sprawdź w Przelewy24</button>}
          </AdminMutation>}
        </AdminPanel>
      </div>
      <AdminPanel title="Historia zamówienia" className="admin-card-body">
        <ol className="admin-order-timeline">
          <li><span>Złożono zamówienie</span><time dateTime={order.createdAt}>{date(order.createdAt)}</time></li>
          {order.paidAt && <li><span>Potwierdzono płatność</span><time dateTime={order.paidAt}>{date(order.paidAt)}</time></li>}
          {order.shippedAt && <li><span>Nadano przesyłkę</span><time dateTime={order.shippedAt}>{date(order.shippedAt)}</time></li>}
        </ol>
      </AdminPanel>
      <AdminPanel title={order.shippedAt ? statusNames.shipped : 'Wysyłka'} className="admin-card-body">
        {order.shippedAt ? <dl className="admin-facts"><div><dt>Numer listu przewozowego</dt><dd>{order.trackingNumber}</dd></div></dl>
          : order.status === 'paid' ? <ShippingForm id={id}/>
            : <p>Wysyłkę można zapisać po potwierdzeniu płatności.</p>}
      </AdminPanel>
    </div>
  </>;
}
