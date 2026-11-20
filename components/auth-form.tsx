'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { login, register } from '@/lib/auth-actions';

export function AuthForm({registration = false, privacyUrl}: {registration?: boolean; privacyUrl?: string}) {
  const [state, action, pending] = useActionState(registration ? register : login, {});
  return <form className="panel-form auth-form" action={action}>
    <label>E-mail<input type="email" name="email" autoComplete="username" maxLength={50} required/></label>
    <label>Hasło<input type="password" name="password" autoComplete={registration ? 'new-password' : 'current-password'}
      minLength={registration ? 12 : undefined} maxLength={128} required aria-describedby={registration ? 'password-hint' : undefined}/></label>
    {registration && <p id="password-hint">Co najmniej 12 znaków.</p>}
    {registration && privacyUrl && <p><a href={privacyUrl} target="_blank" rel="noreferrer">Polityka prywatności</a></p>}
    {state.error && <p role="alert" className="checkout-error">{state.error}</p>}
    <button className="btn btn-red btn-wide" disabled={pending}>{registration ? 'Utwórz konto' : 'Zaloguj się'}</button>
    <p><Link href={registration ? '/logowanie' : '/rejestracja'}>{registration ? 'Mam już konto' : 'Utwórz konto klienta'}</Link></p>
  </form>;
}
