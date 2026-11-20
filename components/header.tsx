'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Brand } from './brand';
import { CartLink } from './basket';
import { Icon } from './icon';

const navigation = [['/opony', 'Opony'], ['/felgi', 'Felgi'], ['/kolpaki', 'Kołpaki'], ['/oferta', 'Cała oferta'], ['/poradnik', 'Dobór kół']];

export function Header() {
  const path = usePathname();
  const menu = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const details = menu.current;
    if (!details) return;
    details.open = false;
    function dismiss(event: PointerEvent) {
      if (details && !details.contains(event.target as Node)) details.open = false;
    }
    function escape(event: KeyboardEvent) {
      if (event.key === 'Escape' && details?.open) {
        details.open = false;
        details.querySelector('summary')?.focus();
      }
    }
    document.addEventListener('pointerdown', dismiss);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('pointerdown', dismiss);
      document.removeEventListener('keydown', escape);
    };
  }, [path]);

  const links = navigation.map(([href, label]) => <Link key={href} href={href} aria-current={path === href ? 'page' : undefined}>{label}</Link>);
  return <header className="site-header"><div className="wrap header-inner">
    <Brand/>
    <nav className="desktop-nav" aria-label="Nawigacja główna">{links}</nav>
    <div className="header-actions">
      <Link href="/ulubione" className="utility-link" title="Ulubione" aria-label="Ulubione" aria-current={path === '/ulubione' ? 'page' : undefined}><Icon name="heart"/></Link>
      <Link href="/konto" className="utility-link account-link" title="Moje konto" aria-label="Moje konto" aria-current={path === '/konto' ? 'page' : undefined}><Icon name="account"/></Link>
      <CartLink/>
      <details className="nav-details" ref={menu}>
        <summary aria-label="Menu"><Icon name="menu"/></summary>
        <nav aria-label="Nawigacja mobilna" onClick={() => { if (menu.current) menu.current.open = false; }}>
          {links}<Link href="/konto">Moje konto</Link>
        </nav>
      </details>
    </div>
  </div></header>;
}
