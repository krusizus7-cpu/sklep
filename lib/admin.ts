import type { Account, OrderStatus, OrderSummary, Product } from './types';
import { pageNumber } from '@/components/pagination';

export type AdminQuery = Record<string, string | string[] | undefined>;
export type AdminProduct = Product & {archived: boolean; revision: string};
export type AdminOrderRow = OrderSummary & {paidAt: string | null; providerOrderId: number | null};
export type AdminAccount = Account & {blockedAt: string | null};
export type AuditEvent = {id: number; at: string; actor: string; module: string; action: string; entity: string; detail: string | null};

export const adminPageSize = 25;

export const adminModules = [
  {href: '/admin', label: 'Przegląd', icon: 'dashboard'},
  {href: '/admin/zamowienia', label: 'Zamówienia', icon: 'orders'},
  {href: '/admin/platnosci', label: 'Płatności', icon: 'payments'},
  {href: '/admin/produkty', label: 'Produkty', icon: 'products'},
  {href: '/admin/magazyn', label: 'Magazyn', icon: 'warehouse'},
  {href: '/admin/analityka', label: 'Analityka', icon: 'analytics'},
  {href: '/admin/uzytkownicy', label: 'Użytkownicy', icon: 'users'},
  {href: '/admin/ustawienia', label: 'Ustawienia', icon: 'settings'},
  {href: '/admin/historia', label: 'Historia zmian', icon: 'history'}
] as const;

export function queryValue(query: AdminQuery, key: string, max = 100) {
  const value = query[key];
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

export function queryPage(query: AdminQuery) {
  const page = pageNumber(queryValue(query, 'strona'));
  return {page, offset: (page - 1) * adminPageSize};
}

export function adminProductHref(id: string) {
  return '/admin/produkty/' + encodeURIComponent(id) + '?edit=1';
}

export function sortedCatalog(rows: AdminProduct[], query: string) {
  const term = query.toLocaleLowerCase('pl');
  return rows.filter(row => [row.id, row.brand + ' ' + row.name].some(value => value.toLocaleLowerCase('pl').includes(term)))
    .sort((a, b) => (a.brand + ' ' + a.name).localeCompare(b.brand + ' ' + b.name, 'pl') || a.id.localeCompare(b.id));
}

export function stockStatus(stock: number, threshold: number) {
  return stock === 0 ? 'out' : stock <= threshold ? 'low' : 'available';
}

export function displayOrderStatus(order: OrderSummary): OrderStatus {
  return order.shippedAt ? 'shipped' : order.status;
}
