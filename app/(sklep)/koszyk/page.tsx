import { Checkout } from '@/components/checkout';
import { readShop } from '@/lib/store';
export const metadata = {title: 'Koszyk', robots: {index: false}};

export default function CartPage() {
  return <section className="wrap inner-page"><div className="page-intro"><h1>Koszyk</h1></div><Checkout shop={readShop()}/></section>;
}
