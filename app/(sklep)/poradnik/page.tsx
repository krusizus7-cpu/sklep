export const metadata = {title: 'Dobór kół'};

export default function Guide() {
  return <section className="wrap inner-page">
    <div className="page-intro"><h1>Dobór kół</h1></div>
    <div className="guide-grid">
      <article><h2>Jak czytać rozmiar opony?</h2><p>W rozmiarze 225/50 R17 szerokość wynosi 225 mm, profil to 50% szerokości, R oznacza konstrukcję radialną, a 17 to średnica osadzenia w calach.</p></article>
      <article><h2>Parametry felgi</h2><p>PCD opisuje liczbę i rozstaw otworów montażowych, ET oznacza odsadzenie, a DIA to średnica otworu centralnego. Uwzględnij także szerokość, nośność i prześwit zacisku hamulcowego.</p></article>
      <article><h2>Etykieta UE opony</h2><p>Etykieta podaje opory toczenia, przyczepność na mokrej nawierzchni i hałas. Karta informacyjna znajduje się w bazie EPREL.</p></article>
      <article><h2>Zgodność z samochodem</h2><p>Sprawdź dopuszczone rozmiary w instrukcji auta, indeksy nośności i prędkości, parametry felgi oraz wymagany udźwig.</p></article>
    </div>
  </section>;
}
