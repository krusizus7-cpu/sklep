import Link from 'next/link';
import { adminPageSize, displayOrderStatus, stockStatus, type AdminOrderRow, type AdminProduct } from '@/lib/admin';
import { date, money, statusNames, type OrderStatus } from '@/lib/types';
import { Pagination } from './pagination';
import { AdminIcon } from './admin-icons';

export function AdminHeading({title, description, back, action}: {
  title: string; description?: string; back?: {href: string; label: string}; action?: React.ReactNode;
}) {
  return <header className="admin-heading">
    <div className="admin-heading-text">
      {back && <Link className="admin-back" href={back.href}>{back.label}</Link>}
      <h1>{title}</h1>
      {description && <p>{description}</p>}
    </div>
    {action}
  </header>;
}

export function AdminPanel({title, children, action, className = ''}: {
  title: string; children: React.ReactNode; action?: React.ReactNode; className?: string;
}) {
  return <section className={'admin-panel ' + className}>
    <div className="admin-panel-heading"><h2>{title}</h2>{action}</div>
    {children}
  </section>;
}

export function AdminEmpty({message, children}: {message: string; children?: React.ReactNode}) {
  return <div className="admin-empty"><p>{message}</p>{children}</div>;
}

export function AdminStatus({tone, children}: {tone: 'good' | 'warn' | 'danger' | 'neutral' | 'info'; children: React.ReactNode}) {
  return <span className={'admin-status is-' + tone}><i aria-hidden="true"/>{children}</span>;
}

export function StockBadge({stock, threshold}: {stock: number; threshold: number}) {
  const state = stockStatus(stock, threshold);
  return state === 'out' ? <AdminStatus tone="danger">Brak towaru</AdminStatus>
    : state === 'low' ? <AdminStatus tone="warn">Niski stan</AdminStatus>
      : <AdminStatus tone="good">Dostępny</AdminStatus>;
}

export function OrderBadge({status}: {status: OrderStatus}) {
  const tones = {registering: 'warn', pending: 'warn', paid: 'good', shipped: 'info', cancelled: 'neutral'} as const;
  return <AdminStatus tone={tones[status]}>{statusNames[status]}</AdminStatus>;
}

export function AdminFilter({path, children, active}: {path: string; children: React.ReactNode; active: boolean}) {
  return <form method="get" action={path} className="admin-filters">
    {children}
    <button className="admin-button" type="submit">Pokaż wyniki</button>
    {active && <Link className="admin-reset" href={path}>Wyczyść filtry</Link>}
  </form>;
}

export function AdminSearch({label, value, placeholder, max = 100}: {label: string; value: string; placeholder?: string; max?: number}) {
  return <label className="admin-search-field">{label}
    <span><AdminIcon name="search" size={16}/><input type="search" name="q" defaultValue={value} maxLength={max}
      placeholder={placeholder} autoComplete="off"/></span>
  </label>;
}

export function AdminPagination({page, path, query, hasMore}: {
  page: number; path: string; query?: Record<string, string>; hasMore: boolean;
}) {
  return <Pagination page={page} path={path} query={query} hasMore={hasMore} label="Strony wyników"/>;
}

export function ProductIdentity({product, href}: {product: AdminProduct; href: string}) {
  return <Link className="admin-product-identity" href={href}>
    {/* eslint-disable-next-line @next/next/no-img-element -- product paths reference local, validated catalog assets */}
    <img src={product.image} alt="" width={40} height={40} loading="lazy"/>
    <span><strong>{product.brand} {product.name}</strong><small>{product.size}</small></span>
  </Link>;
}

export function ProductConcurrency({product}: {product: AdminProduct}) {
  return <>
    <input type="hidden" name="id" value={product.id}/>
    <input type="hidden" name="revision" value={product.revision}/>
    <input type="hidden" name="expectedStock" value={product.stock}/>
  </>;
}

export function AdminOrderTable({orders, payment = false}: {orders: AdminOrderRow[]; payment?: boolean}) {
  return <div className="admin-table-scroll" tabIndex={0} role="region" aria-label={payment ? 'Tabela płatności' : 'Tabela zamówień'}>
    <table className="admin-table">
      <caption className="visually-hidden">{payment ? 'Płatności' : 'Zamówienia'}</caption>
      <thead><tr>
        <th scope="col">Numer zamówienia</th><th scope="col">Data</th>
        <th scope="col">Status</th>
        {payment && <><th scope="col">Numer transakcji</th><th scope="col">Opłacono</th></>}
        <th scope="col" className="admin-align-right">Kwota brutto</th>
      </tr></thead>
      <tbody>{orders.map(order => <tr key={order.id}>
        <th scope="row"><Link className="admin-id admin-table-link" href={'/admin/zamowienia/' + order.id}>{order.id}</Link></th>
        <td>{date(order.createdAt)}</td>
        <td><OrderBadge status={payment ? order.status : displayOrderStatus(order)}/></td>
        {payment && <><td className="admin-numbers">{order.providerOrderId ?? '—'}</td><td>{order.paidAt ? date(order.paidAt) : '—'}</td></>}
        <td className="admin-align-right admin-numbers">{money(order.total)}</td>
      </tr>)}</tbody>
    </table>
  </div>;
}

export function AdminCount({offset, count, total}: {offset: number; count: number; total: number}) {
  return <p className="admin-table-count">{count ? (offset + 1) + '–' + (offset + Math.min(count, adminPageSize)) + ' z ' + total : total + ' wyników'}</p>;
}
