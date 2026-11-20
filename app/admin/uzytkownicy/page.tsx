import Link from 'next/link';
import { AdminEmpty, AdminFilter, AdminHeading, AdminPagination, AdminSearch, AdminStatus } from '@/components/admin-ui';
import { adminPageSize, queryPage, queryValue, type AdminAccount, type AdminQuery } from '@/lib/admin';
import { requireAdmin } from '@/lib/session';
import { runtime } from '@/lib/store';

const path = '/admin/uzytkownicy';
const filters = {all: 'Wszystkie konta', active: 'Aktywne', blocked: 'Zablokowane'};

export default async function AdminUsers({searchParams}: {searchParams: Promise<AdminQuery>}) {
  await requireAdmin();
  const query = await searchParams;
  const q = queryValue(query, 'q', 50);
  const filter = queryValue(query, 'status');
  const status = Object.hasOwn(filters, filter) ? filter : 'all';
  const {page, offset} = queryPage(query);
  const rows = runtime().accounts.adminAccounts(q, status, offset, adminPageSize + 1) as unknown as AdminAccount[];

  return <>
    <AdminHeading title="Użytkownicy" description="Konta, dostęp klientów i historia przypisanych zamówień."/>
    <div className="admin-panel admin-list">
      <AdminFilter path={path} active={Boolean(q || status !== 'all')}>
        <AdminSearch label="Adres e-mail" value={q} max={50} placeholder="Adres lub jego fragment"/>
        <label>Status konta<select name="status" defaultValue={status}>
          {Object.entries(filters).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select></label>
      </AdminFilter>
      {rows.length ? <div className="admin-table-scroll" tabIndex={0} role="region" aria-label="Tabela użytkowników">
        <table className="admin-table">
          <caption className="visually-hidden">Konta użytkowników</caption>
          <thead><tr><th scope="col">Adres e-mail</th><th scope="col">Rola</th><th scope="col">Status</th></tr></thead>
          <tbody>{rows.slice(0, adminPageSize).map(account => <tr key={account.id}>
            <th scope="row"><Link className="admin-table-link" href={path + '/' + account.id}>{account.email}</Link></th>
            <td>{account.role === 'admin' ? 'Administrator' : 'Klient'}</td>
            <td><AdminStatus tone={account.blockedAt ? 'danger' : 'good'}>{account.blockedAt ? 'Zablokowane' : 'Aktywne'}</AdminStatus></td>
          </tr>)}</tbody>
        </table>
      </div> : <AdminEmpty message="Brak kont spełniających wybrane kryteria."/>}
      <AdminPagination page={page} path={path} query={{q, status}} hasMore={rows.length > adminPageSize}/>
    </div>
  </>;
}
