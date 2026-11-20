import { notFound } from 'next/navigation';
import { ProductForm } from '@/components/product-form';
import { requireAdmin } from '@/lib/session';
import { readShop, runtime } from '@/lib/store';

export default async function EditProduct({params, searchParams}: {params: Promise<{id: string}>; searchParams: Promise<{edit?: string}>}) {
  await requireAdmin();
  const {id} = await params;
  const adding = id === 'nowy' && (await searchParams).edit !== '1';
  const product = adding ? undefined : readShop().products.find(item => item.id === id);
  if (!adding && !product) notFound();
  return <><div className="page-intro"><h1>{adding ? 'Dodaj produkt' : 'Edytuj produkt'}</h1></div><ProductForm product={product} revision={adding ? null : runtime().orders.productRevision(id)}/></>;
}
