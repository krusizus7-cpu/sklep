import Link from 'next/link';

export function pageNumber(value?: string) {
  return typeof value === 'string' && /^[1-9]\d{0,6}$/.test(value) ? Number(value) : 1;
}

export function Pagination({page, path, query, hasMore}: {
  page: number; path: string; query?: Record<string, string>; hasMore: boolean;
}) {
  if (page === 1 && !hasMore) return null;
  const href = (n: number) => path + '?' + new URLSearchParams({...query, strona: String(n)});
  return <nav className="account-actions pagination" aria-label="Strony zamówień">
    {page > 1 && <Link href={href(page - 1)}>Poprzednia</Link>}
    <span aria-current="page">Strona {page}</span>
    {hasMore && <Link href={href(page + 1)}>Następna</Link>}
  </nav>;
}
