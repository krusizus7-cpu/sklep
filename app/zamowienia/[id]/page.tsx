import { notFound } from 'next/navigation';
import { PaymentStatus } from '@/components/payment-status';
import { currentAccount } from '@/lib/session';
import { runtime } from '@/lib/store';
import { HttpError } from '@/server/orders.mjs';
import type { PaymentView } from '@/lib/types';
export const metadata = {title: 'Status zamówienia', robots: {index: false}};

export default async function StatusPage({params}: {params: Promise<{id: string}>}) {
  const {id} = await params;
  let order: PaymentView;
  try { order = runtime().commerce.status(id, await currentAccount()) as PaymentView; }
  catch (error) {
    if (error instanceof HttpError && error.status === 404) notFound();
    throw error;
  }
  return <section className="wrap inner-page"><div className="page-intro"><h1>Status zamówienia</h1></div><PaymentStatus initial={order}/></section>;
}
