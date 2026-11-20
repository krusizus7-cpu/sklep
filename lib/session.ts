import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { runtime } from './store';
import type { Account } from './types';

const sessionKey = 'bieznik_session';

export async function currentAccount(): Promise<Account | null> {
  const token = (await cookies()).get(sessionKey)?.value;
  return token ? runtime().accounts.session(token) as Account | null : null;
}

export async function signIn(accountId: string) {
  const jar = await cookies();
  const session = runtime().accounts.startSession(accountId);
  if (!session) return false;
  runtime().accounts.endSession(jar.get(sessionKey)?.value);
  const {token, maxAge} = session;
  jar.set(sessionKey, token, {
    httpOnly: true,
    secure: process.env.APP_ORIGIN?.startsWith('https:') ?? process.env.NODE_ENV === 'production',
    sameSite: 'lax', path: '/', maxAge
  });
  return true;
}

export async function signOut() {
  const jar = await cookies();
  runtime().accounts.endSession(jar.get(sessionKey)?.value);
  jar.delete(sessionKey);
}

export async function requireAdmin() {
  const account = await currentAccount();
  if (!account) redirect('/logowanie');
  if (account.role !== 'admin') redirect('/konto');
  return account;
}
