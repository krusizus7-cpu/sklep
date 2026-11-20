import { notFound } from 'next/navigation';
import { AdminMutation } from '@/components/admin-mutation';
import { AdminEmpty, AdminHeading, AdminOrderTable, AdminPanel, AdminPagination, AdminStatus } from '@/components/admin-ui';
import { pageNumber } from '@/components/pagination';
import type { AdminAccount, AdminOrderRow } from '@/lib/admin';
import { updateCustomerAccess } from '@/lib/admin-actions';
import { requireAdmin } from '@/lib/session';
import { runtime } from '@/lib/store';
import { date } from '@/lib/types';
import { orderIdPattern, orderPageSize } from '@/server/orders.mjs';

export default async function AdminUser({params, searchParams}: {
  params: Promise<{id: string}>; searchParams: Promise<{strona?: string}>;
}) {
  await requireAdmin();
  const {id} = await params;
  if (!orderIdPattern.test(id)) notFound();
  const {strona} = await searchParams;
  const page = pageNumber(strona);
  const {accounts, orders} = runtime();
  const account = accounts.adminAccount(id) as unknown as AdminAccount | undefined;
  if (!account) notFound();
  const rows = orders.forAccount(id, (page - 1) * orderPageSize) as unknown as AdminOrderRow[];

  return <>
    <AdminHeading title={account.email} back={{href: '/admin/uzytkownicy', label: 'Użytkownicy'}}
      action={<AdminStatus tone={account.blockedAt ? 'danger' : 'good'}>{account.blockedAt ? 'Zablokowane' : 'Aktywne'}</AdminStatus>}/>
    <div className="admin-column">
      <AdminPanel title="Dostęp do konta" className="admin-card-body">
        <dl className="admin-facts">
          <div><dt>Rola</dt><dd>{account.role === 'admin' ? 'Administrator' : 'Klient'}</dd></div>
          {account.blockedAt && <div><dt>Data blokady</dt><dd>{date(account.blockedAt)}</dd></div>}
        </dl>
        {account.role === 'customer' && <AdminMutation action={updateCustomerAccess}>
          <input name="id" type="hidden" value={id}/>
          <input name="operation" type="hidden" value={account.blockedAt ? 'unblock' : 'block'}/>
          {account.blockedAt ? <button className="admin-button" type="submit">Odblokuj konto</button>
            : <details className="admin-confirmation">
              <summary>Blokowanie konta</summary>
              <p>Aktywne sesje wygasną, a klient utraci dostęp do swojego konta do czasu odblokowania.</p>
              <button className="admin-button admin-danger" type="submit">Zablokuj konto</button>
            </details>}
        </AdminMutation>}
      </AdminPanel>
      <AdminPanel title="Zamówienia przypisane do konta">
        {rows.length ? <AdminOrderTable orders={rows.slice(0, orderPageSize)}/>
          : <AdminEmpty message="Brak zamówień przypisanych do tego konta."/>}
        <AdminPagination page={page} path={'/admin/uzytkownicy/' + id} hasMore={rows.length > orderPageSize}/>
      </AdminPanel>
    </div>
  </>;
}
