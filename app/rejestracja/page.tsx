import { redirect } from 'next/navigation';
import { AuthForm } from '@/components/auth-form';
import { currentAccount } from '@/lib/session';
import { readShop } from '@/lib/store';
export const metadata = {title: 'Utwórz konto', robots: {index: false}};

export default async function Register() {
  if (await currentAccount()) redirect('/konto');
  const shop = readShop();
  return <section className="wrap inner-page"><div className="page-intro"><h1>Utwórz konto</h1></div>
    <AuthForm registration privacyUrl={shop.ordering ? shop.merchant.privacyUrl : undefined}/>
  </section>;
}
