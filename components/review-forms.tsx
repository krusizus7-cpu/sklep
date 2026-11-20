'use client';

import { useActionState } from 'react';
import { moderateReview, submitReview } from '@/lib/review-actions';

export function ReviewForm({orderId, sku}: {orderId: string; sku: string}) {
  const [state, action, pending] = useActionState(submitReview.bind(null, orderId, sku), {});
  return <form action={action} className="review-form">
    <label>Ocena<select name="rating" defaultValue="" required>
      <option value="" disabled>Wybierz ocenę</option>
      {[5, 4, 3, 2, 1].map(n => <option key={n} value={n}>{n} / 5</option>)}
    </select></label>
    <label>Treść opinii<textarea name="body" required maxLength={2000} rows={3}/></label>
    {state.error && <p role="alert">{state.error}</p>}
    <button className="btn btn-border" disabled={pending}>Wyślij opinię</button>
  </form>;
}

export function ModerateReview({id}: {id: number}) {
  const [state, action, pending] = useActionState(moderateReview.bind(null, id), {});
  return <form action={action} className="account-actions">
    <button name="decision" value="approved" className="btn btn-red" disabled={pending}>Zatwierdź</button>
    <button name="decision" value="rejected" className="btn btn-border" disabled={pending}>Odrzuć</button>
    {state.error && <p role="alert">{state.error}</p>}
  </form>;
}
