import { notFound } from 'next/navigation';
import { AdminMutation } from '@/components/admin-mutation';
import { AdminHeading, AdminPanel, ProductConcurrency, StockBadge } from '@/components/admin-ui';
import type { AdminProduct } from '@/lib/admin';
import { correctStock } from '@/lib/admin-actions';
import { requireAdmin } from '@/lib/session';
import { runtime } from '@/lib/store';
import { stockReasons } from '@/server/admin-data.mjs';

export default async function AdminStockCorrection({params}: {params: Promise<{id: string}>}) {
  await requireAdmin();
  const {id} = await params;
  const store = runtime().orders;
  const product = store.adminProduct(id) as AdminProduct | undefined;
  if (!product || product.archived) notFound();
  return <>
    <AdminHeading title="Korekta stanu" description={product.brand + ' ' + product.name + ' · ' + id}
      back={{href: '/admin/magazyn', label: 'Magazyn'}}/>
    <AdminPanel title="Dostępność" className="admin-form-panel admin-card-body">
      <p className="admin-stock-reading"><strong className="admin-numbers">{product.stock} szt.</strong>
        <StockBadge stock={product.stock} threshold={store.settings().lowStock}/></p>
      <AdminMutation action={correctStock}>
        <ProductConcurrency product={product}/>
        <p>Podaj liczbę sztuk dostępną do sprzedaży po odjęciu rezerwacji.</p>
        <div className="admin-field-grid" key={product.revision + ':' + product.stock}>
          <label>Nowy stan dostępny<input name="quantity" type="number" min={0} max={100000} defaultValue={product.stock} required/></label>
          <label>Powód korekty<select name="reason" defaultValue="" required>
            <option value="" disabled>Wybierz powód</option>
            {Object.entries(stockReasons).map(([value, label]) => <option value={value} key={value}>{label}</option>)}
          </select></label>
        </div>
        <button className="admin-button admin-primary" type="submit">Zapisz korektę</button>
      </AdminMutation>
    </AdminPanel>
  </>;
}
