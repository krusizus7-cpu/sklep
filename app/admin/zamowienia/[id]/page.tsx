import { notFound } from 'next/navigation';
import { OrderItems } from '@/components/order-items';
import { ShippingForm } from '@/components/shipping-form';
import { orderIdPattern } from '@/server/orders.mjs';
import { requireAdmin } from '@/lib/session';
import { runtime } from '@/lib/store';
import { date, money, statusNames, type OrderDetails } from '@/lib/types';

export default async function AdminOrder({params}: {params: Promise<{id: string}>}) {
  await requireAdmin();
  const {id} = await params;
  if (!orderIdPattern.test(id)) notFound();
  const order = runtime().orders.get(id) as unknown as OrderDetails | undefined;
  if (!order) notFound();
  return <>
    <div className="page-intro"><h1>Szczegóły zamówienia</h1><p>{order.id}</p></div>
    <div className="admin-order">
      <div className="panel-form"><h2>{statusNames[order.shippedAt ? 'shipped' : order.status]}</h2>
        <p>{date(order.createdAt)}</p><OrderItems order={order}/><strong>Razem {money(order.total)}</strong></div>
      <div className="panel-form"><h2>Adres dostawy</h2><address>{order.customer.name}<br/>{order.customer.street}<br/>
        {order.customer.postcode} {order.customer.city}<br/>{order.customer.email}<br/>{order.customer.phone}</address></div>
    </div>
    {order.status === 'paid' && !order.shippedAt && <ShippingForm id={order.id}/>}
  </>;
}
