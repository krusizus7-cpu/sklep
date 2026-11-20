# BIEŻNIK

## Charakter sklepu

Sklep pomaga kierowcy znaleźć opony lub felgi po parametrach technicznych. Zdjęcia studia samochodowego ilustrują kategorie. Zdjęcia i dane konkretnego modelu pochodzą z katalogu. Informacja o trybie podglądu lub testowych płatnościach pozostaje widoczna nad nawigacją.

## Typografia i kolor

DM Sans obsługuje treść i formularze, Space Grotesk nagłówki, a Barlow Condensed znak marki. Kroje są dostępne lokalnie z polskimi znakami. Grafit i biel wyznaczają powierzchnie. Czerwień wskazuje działanie główne, aktywną kategorię w wyszukiwarce i elementy marki. Klawiatura ma wyraźny obrys fokusu. Wartości kolorów i krojów definiuje blok `:root` w `app/next-store.css`.

## Układ i interakcje

Wyszukiwarka łączy wybór kategorii, parametry i przejście do wyników. Na telefonie parametry tworzą dwie kolumny, a przycisk zajmuje całą szerokość. W katalogu filtry są rozwijane na małych ekranach. Pola wyboru korzystają z natywnej obsługi klawiatury i dotyku. Ceny podajemy za sztukę, w złotych. Przyciski koszyka i ulubionych korzystają ze wspólnego stanu w `components/basket.tsx`. Produkty udostępniają te same karty w katalogu, ulubionych oraz na stronie głównej.
