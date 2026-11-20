import { Favorites } from '@/components/favorites';
import { readShop } from '@/lib/store';
export const metadata = {title: 'Ulubione'};

export default function FavoritesPage() {
  return <section className="wrap inner-page"><div className="page-intro"><h1>Ulubione</h1></div>
    <Favorites products={readShop().products}/>
  </section>;
}
