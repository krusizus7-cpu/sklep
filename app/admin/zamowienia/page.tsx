import { AdminEmpty, AdminFilter, AdminHeading, AdminOrderTable, AdminPagination, AdminSearch } from '@/components/admin-ui';
import { adminPageSize, queryPage, queryValue, type AdminOrderRow, type AdminQuery } from '@/lib/admin';
import { requireAdmin } from '@/lib/session';
import { runtime } from '@/lib/store';
import { statusNames } from '@/lib/types';

const path = '/admin/zamowienia';
const filters = {
  paid: 'Do wysłania', all: 'Wszystkie zamówienia', shipped: statusNames.shipped,
  pending: statusNames.pending, registering: statusNames.registering, cancelled: statusNames.cancelled
};

export default async function AdminOrders({searchParams}: {searchParams: Promise<AdminQuery>}) {
  await requireAdmin();
  const query = await searchParams;
  const value = queryValue(query, 'status');
  const q = queryValue(query, 'q', 36);
  const status = Object.hasOwn(filters, value) ? value : 'paid';
  const {page, offset} = queryPage(query);
  const rows = runtime().orders.adminOrders(status, offset, q, adminPageSize + 1) as unknown as AdminOrderRow[];

  return <>
    <AdminHeading title="Zamówienia" description="Obsługa zamówień, wysyłek i numerów listów przewozowych."/>
    <div className="admin-panel admin-list">
      <AdminFilter path={path} active={Boolean(q || status !== 'paid')}>
        <AdminSearch label="Numer zamówienia" value={q} max={36} placeholder="Pełny numer lub początek"/>
        <label>Status zamówienia<select name="status" defaultValue={status}>
          {Object.entries(filters).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
        </select></label>
      </AdminFilter>
      {rows.length ? <AdminOrderTable orders={rows.slice(0, adminPageSize)}/>
        : <AdminEmpty message="Brak zamówień spełniających wybrane kryteria."/>}
      <AdminPagination page={page} path={path} query={{q, status}} hasMore={rows.length > adminPageSize}/>
    </div>
  </>;
}
