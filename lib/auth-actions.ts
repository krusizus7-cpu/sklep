'use server';

import { redirect } from 'next/navigation';
import { signIn, signOut } from './session';
import { runtime } from './store';

type Result = {error?: string};
const attempts = new Map<string, {count: number; expires: number}>();

function allowAttempt(email: string) {
  const now = Date.now();
  for (const [key, value] of attempts) if (value.expires <= now) attempts.delete(key);
  const entries: [string, number][] = [['', 60], [email, 10]];
  if (entries.some(([key, limit]) => (attempts.get(key)?.count ?? 0) >= limit)) return false;
  for (const [key] of entries) {
    const current = attempts.get(key) ?? {count: 0, expires: now + 60_000};
    attempts.set(key, {...current, count: current.count + 1});
  }
  return true;
}

function credentials(form: FormData) {
  const email = form.get('email');
  const password = form.get('password');
  if (typeof email !== 'string' || typeof password !== 'string' ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) || email.length > 50 ||
      Buffer.byteLength(password) > 128) return null;
  return {email: email.trim().toLowerCase(), password};
}

export async function login(_result: Result, form: FormData): Promise<Result> {
  const input = credentials(form);
  if (!input) return {error: 'Sprawdź adres e-mail i hasło.'};
  if (!allowAttempt(input.email)) return {error: 'Za dużo prób. Spróbuj za minutę.'};
  const account = await runtime().accounts.authenticate(input.email, input.password);
  if (!account) return {error: 'Sprawdź adres e-mail i hasło.'};
  await signIn(String(account.id));
  redirect(account.role === 'admin' ? '/admin' : '/konto');
}

export async function register(_result: Result, form: FormData): Promise<Result> {
  const input = credentials(form);
  if (!input || input.password.length < 12) return {error: 'Podaj poprawny adres e-mail i hasło o długości co najmniej 12 znaków.'};
  if (!allowAttempt(input.email)) return {error: 'Za dużo prób. Spróbuj za minutę.'};
  let id: string;
  try {
    id = (await runtime().accounts.create(input.email, input.password)).id;
  } catch {
    return {error: 'Nie udało się utworzyć konta. Sprawdź dane lub spróbuj się zalogować.'};
  }
  await signIn(id);
  redirect('/konto');
}

export async function logout() {
  await signOut();
  redirect('/logowanie');
}
