import { AdminEmpty, AdminFilter, AdminHeading, AdminOrderTable, AdminPagination, AdminSearch } from '@/components/admin-ui';
import { adminPageSize, queryPage, queryValue, type AdminOrderRow, type AdminQuery } from '@/lib/admin';
import { requireAdmin } from '@/lib/session';
import { runtime } from '@/lib/store';

const path = '/admin/platnosci';
const filters = {awaiting: 'Oczekujące', confirmed: 'Potwierdzone', cancelled: 'Anulowane', all: 'Wszystkie płatności'};

export default async function AdminPayments({searchParams}: {searchParams: Promise<AdminQuery>}) {
  await requireAdmin();
  const query = await searchParams;
  const value = queryValue(query, 'status');
  const status = Object.hasOwn(filters, value) ? value : 'awaiting';
  const q = queryValue(query, 'q', 36);
  const {page, offset} = queryPage(query);
  const {orders, payment} = runtime();
  const rows = orders.adminOrders(status, offset, q, adminPageSize + 1) as unknown as AdminOrderRow[];

  return <>
    <AdminHeading title="Płatności" description="Statusy płatności i uzgadnianie transakcji Przelewy24."/>
    <div className="admin-panel admin-list">
      <AdminFilter path={path} active={Boolean(q || status !== 'awaiting')}>
        <AdminSearch label="Numer zamówienia" value={q} max={36} placeholder="Pełny numer lub początek"/>
        <label>Status płatności<select name="status" defaultValue={status}>
          {Object.entries(filters).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
        </select></label>
      </AdminFilter>
      {rows.length ? <AdminOrderTable orders={rows.slice(0, adminPageSize)} payment/>
        : <AdminEmpty message={payment ? 'Brak płatności spełniających wybrane kryteria.' : 'Płatności są niedostępne w trybie podglądu.'}/>}
      <AdminPagination page={page} path={path} query={{q, status}} hasMore={rows.length > adminPageSize}/>
    </div>
  </>;
}
