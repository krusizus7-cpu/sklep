import Link from 'next/link';
import { tireBrands, wheelBrands, tierLabels, styleLabels } from '@/lib/assortment.mjs';

export const metadata = {title: 'Dobór kół'};

function BrandGroups({groups, labels}: {groups: Record<string, string[]>; labels: Record<string, string>}) {
  return <dl>{Object.entries(groups).map(([key, brands]) => <div key={key}><dt>{labels[key]}</dt><dd>{brands.join(', ')}</dd></div>)}</dl>;
}

export default function Guide() {
  return <section className="wrap inner-page">
    <div className="page-intro"><h1>Dobór kół</h1></div>
    <div className="guide-grid">
      <article><h2>Jak czytać rozmiar opony?</h2><p>W rozmiarze 225/50 R17 szerokość wynosi 225 mm, profil to 50% szerokości, R oznacza konstrukcję radialną, a 17 to średnica osadzenia w calach.</p></article>
      <article><h2>Parametry felgi</h2><p>PCD opisuje liczbę i rozstaw otworów montażowych, ET oznacza odsadzenie, a DIA to średnica otworu centralnego. Uwzględnij także szerokość, nośność i prześwit zacisku hamulcowego.</p></article>
      <article><h2>Etykieta UE opony</h2><p>Etykieta podaje opory toczenia, przyczepność na mokrej nawierzchni i hałas. Karta informacyjna znajduje się w bazie EPREL.</p></article>
      <article><h2>Zgodność z samochodem</h2><p>Sprawdź dopuszczone rozmiary w instrukcji auta, indeksy nośności i prędkości, parametry felgi oraz wymagany udźwig.</p></article>
    </div>
    <div className="assortment-guide">
      <article id="marki-opon">
        <h2>Klasy i marki opon</h2>
        <p>W katalogu znajdziesz podział na opony letnie, zimowe i całoroczne (wielosezonowe). Typ pojazdu pozwala rozróżnić opony osobowe, SUV / 4×4 i dostawcze. W rozmiarze opony dostawczej szukaj oznaczenia C.</p>
        <p>Poniżej znajdziesz podział marek stosowany w BIEŻNIKU.</p>
        <BrandGroups groups={tireBrands} labels={tierLabels}/>
        <Link href="/opony">Przeglądaj opony</Link>
      </article>
      <article id="rodzaje-felg">
        <h2>Rodzaje i marki felg</h2>
        <p>Felgi aluminiowe (alufelgi) dzielimy według stylu. Dostępne modele i ich parametry sprawdzisz w katalogu.</p>
        <BrandGroups groups={wheelBrands} labels={styleLabels}/>
        <p>Standardowe felgi stalowe do aut osobowych i dostawczych występują m.in. w wykończeniu czarnym i srebrnym. <Link href="/kolpaki">Kołpaki 13–17″</Link> dobierzesz według średnicy felgi.</p>
        <Link href="/felgi">Przeglądaj felgi</Link>
      </article>
    </div>
  </section>;
}
