import Link from 'next/link';

export default function NotFound() {
  return <section className="wrap inner-page"><div className="page-intro"><h1>Nie znaleziono strony</h1></div>
    <Link className="btn btn-red" href="/oferta">Przejdź do oferty</Link>
  </section>;
}
