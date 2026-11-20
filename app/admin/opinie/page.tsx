import { ModerateReview } from '@/components/review-forms';
import { requireAdmin } from '@/lib/session';
import { runtime } from '@/lib/store';
import { date, type Review } from '@/lib/types';

export default async function ReviewQueue() {
  await requireAdmin();
  const reviews = runtime().orders.pendingReviews() as unknown as (Review & {sku: string})[];
  return <><h1>Opinie do zatwierdzenia</h1>
    {!reviews.length && <p>Brak opinii oczekujących na zatwierdzenie.</p>}
    {reviews.map(review => <article className="review-card" key={review.id}>
      <h2>{review.sku}</h2><p>{review.rating} / 5 · {date(review.createdAt)}</p>
      <p className="review-body">{review.body}</p><ModerateReview id={review.id}/>
    </article>)}
  </>;
}
