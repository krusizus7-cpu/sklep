import { redirect } from 'next/navigation';
import { AuthForm } from '@/components/auth-form';
import { currentAccount } from '@/lib/session';
export const metadata = {title: 'Logowanie', robots: {index: false}};

export default async function Login() {
  const account = await currentAccount();
  if (account) redirect(account.role === 'admin' ? '/admin' : '/konto');
  return <section className="wrap inner-page"><div className="page-intro"><h1>Logowanie</h1></div><AuthForm/></section>;
}
