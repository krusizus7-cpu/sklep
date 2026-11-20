import { notFound } from 'next/navigation';
import { AdminMutation } from '@/components/admin-mutation';
import { AdminHeading, AdminPanel, AdminStatus, ProductConcurrency } from '@/components/admin-ui';
import { ProductForm } from '@/components/product-form';
import type { AdminProduct } from '@/lib/admin';
import { changeProductVisibility } from '@/lib/admin-actions';
import { requireAdmin } from '@/lib/session';
import { runtime } from '@/lib/store';
import { stockReasons } from '@/server/admin-data.mjs';

export default async function EditProduct({params, searchParams}: {params: Promise<{id: string}>; searchParams: Promise<{edit?: string}>}) {
  await requireAdmin();
  const {id} = await params;
  const adding = id === 'nowy' && (await searchParams).edit !== '1';
  const product = adding ? undefined : runtime().orders.adminProduct(id) as AdminProduct | undefined;
  if (!adding && !product) notFound();
  const title = product ? product.brand + ' ' + product.name : 'Dodaj produkt';

  return <>
    <AdminHeading title={title} description={product ? product.id + ' · ' + product.size : undefined}
      back={{href: '/admin/produkty', label: 'Produkty'}}/>
    <div className="admin-detail-grid">
      <ProductForm key={product && product.revision + ':' + product.stock} product={product} revision={product?.revision}
        stockReasons={stockReasons}/>
      {product && <AdminPanel title="Widoczność katalogowa" className="admin-card-body">
        <AdminStatus tone={product.archived ? 'neutral' : 'good'}>{product.archived ? 'W archiwum' : 'W katalogu'}</AdminStatus>
        <AdminMutation action={changeProductVisibility}>
          <ProductConcurrency product={product}/>
          <input type="hidden" name="operation" value={product.archived ? 'restore' : 'archive'}/>
          {product.archived
            ? <button className="admin-button" type="submit">Przywróć produkt</button>
            : <details className="admin-confirmation">
              <summary>Archiwizacja produktu</summary>
              <p>Produkt zniknie ze sklepu. Dotychczasowe zamówienia zachowają tę pozycję.</p>
              <button className="admin-button admin-danger" type="submit">Archiwizuj produkt</button>
            </details>}
        </AdminMutation>
      </AdminPanel>}
    </div>
  </>;
}
