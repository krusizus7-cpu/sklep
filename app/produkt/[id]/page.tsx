import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Cards } from '@/components/cards';
import { ProductPurchase } from '@/components/product-purchase';
import { readShop, runtime } from '@/lib/store';
import { date, type Review } from '@/lib/types';
import { ProductDetail } from '@/components/product-detail';
import { CatalogReturn } from '@/components/catalog-navigation';

type Props = {params: Promise<{id: string}>};
function lookup(id: string) {
  const shop = readShop();
  const product = shop.products.find(item => item.id === id);
  if (!product) notFound();
  return {shop, product};
}
export async function generateMetadata({params}: Props) {
  const {product} = lookup((await params).id);
  return {title: `${product.brand} ${product.name} ${product.size}`, description: product.description};
}
export default async function ProductPage({params}: Props) {
  const {shop, product} = lookup((await params).id);
  const tire = product.type === 'tires';
  const reviews = runtime().orders.publishedReviews(product.id) as unknown as Review[];
  const average = reviews.length ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length : 0;
  const related = shop.products.filter(item => item.id !== product.id && item.type === product.type).slice(0, 3);
  return <section className="wrap inner-page">
    <div className="breadcrumb"><Link href="/">Start</Link><span>/</span><Link href={tire ? '/opony' : '/felgi'}>{tire ? 'Opony' : 'Felgi'}</Link><span>/</span>{product.name}</div>
    <CatalogReturn product={product.id} category={tire ? '/opony' : '/felgi'}/>
    <ProductDetail product={product} ordering={shop.ordering}>
      <ProductPurchase key={product.id} product={product} rates={shop.ordering ? shop.shipping : undefined}/>
      <Link className="detail-back" href="/poradnik">Jak sprawdzić zgodność z samochodem?</Link>
    </ProductDetail>
    <section className="product-reviews"><h2>Opinie kupujących</h2>
      {reviews.length ? <>
        <p>Średnia {average.toLocaleString('pl-PL', {maximumFractionDigits: 1})} / 5 · Liczba opinii: {reviews.length}</p>
        {reviews.map(review => <article className="review-card" key={review.id}>
          <strong>{review.rating} / 5</strong> · <span>Potwierdzony zakup</span> · <time dateTime={review.createdAt}>{date(review.createdAt)}</time>
          <p className="review-body">{review.body}</p>
        </article>)}
      </> : <p>Ten produkt czeka na pierwszą opinię.</p>}
    </section>
    {related.length > 0 && <section className="related-section"><div className="section-head"><h2>Podobne produkty</h2></div><Cards products={related}/></section>}
  </section>;
}
