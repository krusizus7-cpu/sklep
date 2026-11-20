import Link from 'next/link';
import { AdminIcon } from '@/components/admin-icons';
import { AdminNavigation } from '@/components/admin-navigation';
import { logout } from '@/lib/auth-actions';
import { requireAdmin } from '@/lib/session';
import { runtime } from '@/lib/store';
import './panel.css';

export const metadata = {title: 'Panel administracyjny', robots: {index: false}};

const modeNames = {preview: 'Podgląd', sandbox: 'Sandbox', live: 'Produkcja'};

export default async function AdminLayout({children}: {children: React.ReactNode}) {
  const account = await requireAdmin();
  const mode = runtime().payment?.mode as keyof typeof modeNames | undefined ?? 'preview';

  return <div className="admin-shell">
    <a className="skip" href="#admin-main">Przejdź do treści</a>
    <aside className="admin-rail">
      <Link href="/admin" className="admin-brand" aria-label="BIEŻNIK, przegląd panelu">
        <span className="admin-brand-mark" aria-hidden="true"><i/><i/><i/></span>
        <span>BIEŻNIK<span className="admin-brand-period">.</span><small>Panel administratora</small></span>
      </Link>
      <AdminNavigation/>
    </aside>
    <div className="admin-workspace">
      <header className="admin-topbar">
        <span className={'admin-mode admin-mode-' + mode}><i aria-hidden="true"/>{modeNames[mode]}</span>
        <div className="admin-topbar-actions">
          <Link href="/" className="admin-store-link">Otwórz sklep <AdminIcon name="external" size={15}/></Link>
          <details className="admin-account-menu">
            <summary aria-label={'Konto administratora ' + account.email}>
              <span className="admin-avatar" aria-hidden="true">{account.email.slice(0, 1).toUpperCase()}</span>
              <span className="admin-account-label">{account.email}</span><AdminIcon name="down" size={15}/>
            </summary>
            <div className="admin-account-popover">
              <Link href="/konto">Moje konto</Link>
              <form action={logout}><button type="submit">Wyloguj się</button></form>
            </div>
          </details>
        </div>
      </header>
      <main id="admin-main" tabIndex={-1} className="admin-main">{children}</main>
    </div>
  </div>;
}
