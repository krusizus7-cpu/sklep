import { AdminEmpty, AdminFilter, AdminHeading, AdminPagination } from '@/components/admin-ui';
import { adminModules, adminPageSize, queryPage, queryValue, type AdminAccount, type AdminQuery, type AuditEvent } from '@/lib/admin';
import { requireAdmin } from '@/lib/session';
import { runtime } from '@/lib/store';
import { date } from '@/lib/types';
import { stockReasons } from '@/server/admin-data.mjs';
import { addDays, validDay, warsawMidnight } from '@/server/admin-report.mjs';

const path = '/admin/historia';
const modules = new Map(adminModules.filter(entry => entry.href !== '/admin')
  .map(entry => [entry.href.slice('/admin/'.length), entry.label]));
const actions: Record<string, string> = {
  productCreated: 'Dodano produkt',
  productUpdated: 'Zmieniono produkt',
  productArchived: 'Zarchiwizowano produkt',
  productRestored: 'Przywrócono produkt',
  stockCorrected: 'Korekta stanu magazynowego',
  orderShipped: 'Zapisano wysyłkę',
  paymentReconciled: 'Uzgodniono płatność',
  customerBlocked: 'Zablokowano konto klienta',
  customerUnblocked: 'Odblokowano konto klienta',
  settingsSaved: 'Zmieniono ustawienia'
};
const settingsNames: Record<string, string> = {merchant: 'Dane sprzedawcy', shipping: 'Stawki dostawy', lowStock: 'Próg niskiego stanu'};

function actionDetail(event: AuditEvent) {
  if (event.action === 'settingsSaved') return settingsNames[event.entity];
  if (event.action !== 'stockCorrected' || !event.detail) return null;
  const {previous, quantity, reason} = JSON.parse(event.detail) as {previous: number; quantity: number; reason: keyof typeof stockReasons};
  return previous + ' → ' + quantity + ' szt. · ' + stockReasons[reason];
}

export default async function AdminAudit({searchParams}: {searchParams: Promise<AdminQuery>}) {
  await requireAdmin();
  const query = await searchParams;
  const value = queryValue(query, 'modul');
  const module = modules.has(value) ? value : '';
  const from = queryValue(query, 'od');
  const to = queryValue(query, 'do');
  const rangeError = (from && !validDay(from)) || (to && !validDay(to)) || (from && to && from > to);
  const {page, offset} = queryPage(query);
  const {orders, accounts} = runtime();
  const rows = rangeError ? [] : orders.audit({module, from: from ? warsawMidnight(from) : '',
    until: to ? warsawMidnight(addDays(to, 1)) : '', offset, limit: adminPageSize + 1}) as unknown as AuditEvent[];
  const visible = rows.slice(0, adminPageSize);
  const actors = new Map([...new Set(visible.map(event => event.actor))]
    .map(id => [id, (accounts.adminAccount(id) as unknown as AdminAccount | undefined)?.email ?? id]));

  return <>
    <AdminHeading title="Historia zmian" description="Rejestr operacji wykonanych przez administratorów w panelu."/>
    <div className="admin-panel admin-list">
      <AdminFilter path={path} active={Boolean(module || from || to)}>
        <label>Moduł<select name="modul" defaultValue={module}>
          <option value="">Wszystkie moduły</option>
          {[...modules.entries()].filter(([, label]) => label !== 'Historia zmian' && label !== 'Analityka')
            .map(([key, label]) => <option key={key} value={key}>{label}</option>)}
        </select></label>
        <label>Od dnia<input type="date" name="od" defaultValue={from} min="1900-01-01" max="9998-12-31"/></label>
        <label>Do dnia<input type="date" name="do" defaultValue={to} min="1900-01-01" max="9998-12-31"/></label>
      </AdminFilter>
      {rangeError ? <p className="admin-feedback admin-feedback-error" role="alert">Podaj poprawny zakres dat.</p>
        : visible.length ? <div className="admin-table-scroll" tabIndex={0} role="region" aria-label="Tabela historii zmian">
          <table className="admin-table">
            <caption className="visually-hidden">Historia zmian</caption>
            <thead><tr><th scope="col">Czas</th><th scope="col">Operacja</th><th scope="col">Moduł</th>
              <th scope="col">Rekord</th><th scope="col">Administrator</th></tr></thead>
            <tbody>{visible.map(event => {
              const detail = actionDetail(event);
              return <tr key={event.id}>
                <td>{date(event.at)}</td>
                <th scope="row">{actions[event.action] ?? event.action}{detail && <small>{detail}</small>}</th>
                <td>{modules.get(event.module) ?? event.module}</td>
                <td className="admin-id">{event.entity}</td><td>{actors.get(event.actor)}</td>
              </tr>;
            })}</tbody>
          </table>
        </div> : <AdminEmpty message="Brak zmian spełniających wybrane kryteria."/>}
      {!rangeError && <AdminPagination page={page} path={path} query={{modul: module, od: from, do: to}} hasMore={rows.length > adminPageSize}/>}
    </div>
  </>;
}
