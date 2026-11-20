'use client';

import { useActionState } from 'react';
import { shipOrder } from '@/lib/admin-actions';

export function ShippingForm({id}: {id: string}) {
  const [state, action, pending] = useActionState(shipOrder, {});
  return <form className="shipping-form panel-form" action={action}>
    <input type="hidden" name="id" value={id}/>
    <label>Numer listu przewozowego<input name="trackingNumber" autoComplete="off" minLength={3} maxLength={80} required/></label>
    {state.error && <p className="checkout-error" role="alert">{state.error}</p>}
    <button className="btn btn-red" disabled={pending}>{pending ? 'Zapisywanie…' : 'Oznacz jako wysłane'}</button>
  </form>;
}
