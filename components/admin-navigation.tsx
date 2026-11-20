'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useRef } from 'react';
import { adminModules } from '@/lib/admin';
import { AdminIcon } from './admin-icons';

export function AdminNavigation() {
  const pathname = usePathname();
  const mobile = useRef<HTMLDetailsElement>(null);
  const links = adminModules.map(({href, label, icon}, index) => {
    const active = pathname === href || (href !== '/admin' && pathname.startsWith(href + '/'));
    return <Link key={href} href={href} className={index === 7 ? 'admin-nav-divider' : undefined}
      aria-current={active ? 'page' : undefined} onClick={() => {
        if (mobile.current) mobile.current.open = false;
      }}><AdminIcon name={icon}/>{label}</Link>;
  });

  return <>
    <nav className="admin-desktop-nav" aria-label="Nawigacja panelu">{links}</nav>
    <details ref={mobile} className="admin-mobile-nav">
      <summary>Menu panelu <AdminIcon name="down" size={16}/></summary>
      <nav aria-label="Nawigacja panelu">{links}</nav>
    </details>
  </>;
}
