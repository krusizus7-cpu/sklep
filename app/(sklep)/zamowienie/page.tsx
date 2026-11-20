import { Checkout } from '@/components/checkout';
import { currentAccount } from '@/lib/session';
import { readShop } from '@/lib/store';
export const metadata = {title: 'Zamówienie', robots: {index: false}};

export default async function CheckoutPage() {
  return <section className="wrap inner-page"><div className="page-intro"><h1>Zamówienie</h1></div>
    <Checkout shop={readShop()} checkout email={(await currentAccount())?.email}/>
  </section>;
}
