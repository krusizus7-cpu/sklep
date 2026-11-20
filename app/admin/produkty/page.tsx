import Link from 'next/link';
import { AdminIcon } from '@/components/admin-icons';
import { AdminCount, AdminEmpty, AdminFilter, AdminHeading, AdminPagination, AdminSearch, AdminStatus, ProductIdentity } from '@/components/admin-ui';
import { adminPageSize, adminProductHref, queryPage, queryValue, sortedCatalog, type AdminProduct, type AdminQuery } from '@/lib/admin';
import { requireAdmin } from '@/lib/session';
import { runtime } from '@/lib/store';
import { money } from '@/lib/types';

const path = '/admin/produkty';

export default async function AdminProducts({searchParams}: {searchParams: Promise<AdminQuery>}) {
  await requireAdmin();
  const query = await searchParams;
  const q = queryValue(query, 'q');
  const type = queryValue(query, 'typ');
  const visibility = queryValue(query, 'widocznosc') || 'active';
  const {page, offset} = queryPage(query);
  const products = sortedCatalog(runtime().orders.adminCatalog() as AdminProduct[], q)
    .filter(product => (type !== 'tires' && type !== 'wheels' || product.type === type)
      && (visibility === 'all' || product.archived === (visibility === 'archived')));
  const rows = products.slice(offset, offset + adminPageSize);

  return <>
    <AdminHeading title="Produkty" description="Katalog opon i felg, ceny oraz widoczność w sklepie."
      action={<Link href={path + '/nowy'} className="admin-button admin-primary"><AdminIcon name="plus" size={17}/> Dodaj produkt</Link>}/>
    {queryValue(query, 'zapisano') === '1' && <p role="status" className="admin-feedback admin-feedback-success">Zapisano produkt.</p>}
    <div className="admin-panel admin-list">
      <AdminFilter path={path} active={Boolean(q || type || visibility !== 'active')}>
        <AdminSearch label="Szukaj produktu" value={q} placeholder="Nazwa, marka lub SKU"/>
        <label>Rodzaj<select name="typ" defaultValue={type}>
          <option value="">Wszystkie rodzaje</option><option value="tires">Opony</option><option value="wheels">Felgi</option>
        </select></label>
        <label>Widoczność<select name="widocznosc" defaultValue={visibility}>
          <option value="active">W katalogu</option><option value="archived">W archiwum</option><option value="all">Wszystkie</option>
        </select></label>
      </AdminFilter>
      {rows.length ? <div className="admin-table-scroll" role="region" aria-label="Tabela produktów" tabIndex={0}>
        <table className="admin-table">
          <caption className="visually-hidden">Produkty</caption>
          <thead><tr><th scope="col">Produkt</th><th scope="col">SKU</th><th scope="col">Rodzaj</th>
            <th scope="col">Widoczność</th><th scope="col" className="admin-align-right">Cena brutto</th>
            <th scope="col" className="admin-align-right">Dostępne szt.</th></tr></thead>
          <tbody>{rows.map(product => <tr key={product.id}>
            <th scope="row"><ProductIdentity product={product} href={adminProductHref(product.id)}/></th>
            <td className="admin-id">{product.id}</td><td>{product.type === 'tires' ? 'Opona' : 'Felga'}</td>
            <td><AdminStatus tone={product.archived ? 'neutral' : 'good'}>{product.archived ? 'W archiwum' : 'W katalogu'}</AdminStatus></td>
            <td className="admin-align-right admin-numbers">{money(product.priceCents)}</td>
            <td className="admin-align-right admin-numbers">{product.stock}</td>
          </tr>)}</tbody>
        </table>
      </div> : <AdminEmpty message="Brak produktów spełniających wybrane kryteria."/>}
      <AdminCount offset={offset} count={rows.length} total={products.length}/>
      <AdminPagination page={page} path={path} query={{q, typ: type, widocznosc: visibility}} hasMore={offset + adminPageSize < products.length}/>
    </div>
  </>;
}
