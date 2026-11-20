'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { statusNames, money, type PaymentView } from '@/lib/types';

export function PaymentStatus({initial}: {initial: PaymentView}) {
  const [order, setOrder] = useState(initial);
  const [attempt, setAttempt] = useState(0);
  const [error, setError] = useState(false);
  useEffect(() => {
    let stale = false;
    let runs = 0;
    let timer: ReturnType<typeof setTimeout>;
    async function check() {
      try {
        const response = await fetch('/api/orders/' + initial.id, {cache: 'no-store'});
        if (!response.ok) throw new Error();
        const updated: PaymentView = await response.json();
        if (stale) return;
        setError(false);
        setOrder(updated);
        if (['registering', 'pending'].includes(updated.status) && ++runs < 15) timer = setTimeout(check, 3000);
      } catch {
        if (!stale) setError(true);
      }
    }
    if (attempt) void check();
    else if (['registering', 'pending'].includes(initial.status)) timer = setTimeout(check, 3000);
    return () => { stale = true; clearTimeout(timer); };
  }, [initial.id, initial.status, attempt]);

  return <div className="panel-form order-status">
    <p>Numer zamówienia <strong>{order.id}</strong></p>
    <p>Kwota {money(order.total)}</p>
    <p role="status">{statusNames[order.status]}</p>
    {order.trackingNumber && <p>Numer przesyłki {order.trackingNumber}</p>}
    {order.status === 'pending' && !order.paymentUrl && <p>Link do płatności wygasł. Po dokonaniu płatności odśwież status lub skontaktuj się ze sklepem.</p>}
    {error && <p role="alert" className="checkout-error">Nie udało się pobrać statusu.</p>}
    <div className="order-actions">
      {order.paymentUrl && <a className="btn btn-red" href={order.paymentUrl}>Przejdź do Przelewy24</a>}
      <button className="btn btn-border" type="button" onClick={() => setAttempt(previous => previous + 1)}>Sprawdź status</button>
      <Link href="/oferta">Wróć do sklepu</Link>
    </div>
  </div>;
}
