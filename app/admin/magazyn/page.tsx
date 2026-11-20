import Link from 'next/link';
import { AdminCount, AdminEmpty, AdminFilter, AdminHeading, AdminPagination, AdminSearch, StockBadge } from '@/components/admin-ui';
import { ProductIdentity } from '@/components/admin-ui';
import { adminPageSize, queryPage, queryValue, sortedCatalog, stockStatus, type AdminProduct, type AdminQuery } from '@/lib/admin';
import { requireAdmin } from '@/lib/session';
import { runtime } from '@/lib/store';

const path = '/admin/magazyn';

export default async function AdminStock({searchParams}: {searchParams: Promise<AdminQuery>}) {
  await requireAdmin();
  const query = await searchParams;
  const q = queryValue(query, 'q');
  const state = queryValue(query, 'stan');
  const {page, offset} = queryPage(query);
  const store = runtime().orders;
  const {lowStock} = store.settings();
  const products = sortedCatalog(store.adminCatalog() as AdminProduct[], q).filter(product =>
    !product.archived && (!state || stockStatus(product.stock, lowStock) === state));
  const rows = products.slice(offset, offset + adminPageSize);

  return <>
    <AdminHeading title="Magazyn" description={'Sztuki dostępne do sprzedaży. Próg niskiego stanu wynosi ' + lowStock + ' szt.'}
      action={<Link className="admin-button" href="/admin/ustawienia#magazyn">Ustaw próg</Link>}/>
    <div className="admin-panel admin-list">
      <AdminFilter path={path} active={Boolean(q || state)}>
        <AdminSearch label="Szukaj produktu" value={q} placeholder="Nazwa, marka lub SKU"/>
        <label>Dostępność<select name="stan" defaultValue={state}>
          <option value="">Wszystkie stany</option><option value="out">Brak towaru</option>
          <option value="low">Niski stan</option><option value="available">Dostępny</option>
        </select></label>
      </AdminFilter>
      {rows.length ? <div className="admin-table-scroll" tabIndex={0} role="region" aria-label="Tabela magazynu">
        <table className="admin-table">
          <caption className="visually-hidden">Stany magazynowe</caption>
          <thead><tr><th scope="col">Produkt</th><th scope="col">SKU</th><th scope="col">Status</th>
            <th scope="col" className="admin-align-right">Dostępne szt.</th><th scope="col"><span className="visually-hidden">Akcja</span></th></tr></thead>
          <tbody>{rows.map(product => {
            const href = path + '/' + encodeURIComponent(product.id);
            return <tr key={product.id}>
              <th scope="row"><ProductIdentity product={product} href={href}/></th>
              <td className="admin-id">{product.id}</td><td><StockBadge stock={product.stock} threshold={lowStock}/></td>
              <td className="admin-align-right admin-numbers">{product.stock}</td>
              <td className="admin-align-right"><Link className="admin-table-link" href={href}
                aria-label={'Skoryguj stan ' + product.id}>Skoryguj stan</Link></td>
            </tr>;
          })}</tbody>
        </table>
      </div> : <AdminEmpty message="Brak produktów z wybranym stanem."/>}
      <AdminCount offset={offset} count={rows.length} total={products.length}/>
      <AdminPagination page={page} path={path} query={{q, stan: state}} hasMore={offset + adminPageSize < products.length}/>
    </div>
  </>;
}
