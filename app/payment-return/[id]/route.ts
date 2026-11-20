import { orderIdPattern } from '@/server/orders.mjs';

export async function GET(_request: Request, {params}: {params: Promise<{id: string}>}) {
  const {id} = await params;
  if (!orderIdPattern.test(id)) return new Response('Nie znaleziono zamówienia.', {status: 404});
  return new Response(null, {
    status: 303, headers: {Location: '/zamowienia/' + id, 'Cache-Control': 'no-store'}
  });
}
