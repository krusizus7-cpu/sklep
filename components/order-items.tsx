import { money, type OrderHistory } from '@/lib/types';

export function OrderItems({order}: {order: OrderHistory}) {
  return <>
    <ul className="history-items">
      {order.items.map(item => <li key={item.id}><span>{item.name} · {item.size} × {item.quantity}</span><strong>{money(item.priceCents * item.quantity)}</strong></li>)}
      <li><span>Dostawa kurierem</span><strong>{money(order.shipping)}</strong></li>
    </ul>
    {order.trackingNumber && <p>Numer przesyłki <strong>{order.trackingNumber}</strong></p>}
  </>;
}
