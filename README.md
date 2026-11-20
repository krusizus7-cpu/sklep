# BIEŻNIK

Sklep z oponami i felgami oparty na makiecie BIEŻNIK V2.2. Wysyłka kurierska na terenie Polski, płatność w bramce Przelewy24, zamówienia i dostępność w SQLite.

## Uruchomienie

Z katalogu `/workspace/sklep` uruchom `npm start` na Node.js 24.14 lub nowszym. Otwórz `http://localhost:8000`. Projekt nie wymaga instalowania zależności ani kompilacji.

Domyślny tryb `preview` pokazuje oznaczoną ofertę z makiety. Składanie zamówień jest w nim wyłączone.

## Sandbox Przelewy24

1. Utwórz konto sandbox w panelu Przelewy24. Włącz dostęp do REST API i skonfiguruj dozwolony adres IP serwera zgodnie z dokumentacją operatora.
2. Skopiuj `shop.example.json` do `data/shop.json`. Wysyłka w przykładzie jest naliczana jako koszt pierwszej sztuki plus stawka za każdą kolejną sztukę.
3. Ustaw poniższe zmienne w konfiguracji procesu. Klucz CRC i klucz API wprowadź przez magazyn sekretów hostingu.
4. Uruchom `npm run orders -- test-access`, a następnie `npm start`. Złóż zamówienie i wykonaj płatność testową. Po powrocie ze strony operatora sprawdź, czy Przelewy24 wywołało webhook i zamówienie zmieniło status na opłacone. W sandboxie używaj danych testowych.

| Zmienna | Wartość |
| --- | --- |
| `P24_MODE` | `sandbox` do testów, `live` do sprzedaży |
| `P24_MERCHANT_ID` | Identyfikator sprzedawcy |
| `P24_POS_ID` | Identyfikator punktu sprzedaży, domyślnie taki sam jak identyfikator sprzedawcy |
| `P24_CRC` | Klucz CRC do podpisów, używany lokalnie na serwerze |
| `P24_API_KEY` | Klucz do raportów REST API |
| `APP_ORIGIN` | Publiczny adres HTTPS sklepu, bez ścieżki. Pod tym adresem musi działać `POST /api/payments/p24/notify` |
| `BIEZNIK_SHOP` | Ścieżka do pliku z danymi sprzedawcy, dostawy i katalogu. Domyślnie `data/shop.json` |
| `BIEZNIK_DB` | Ścieżka do bazy na trwałym dysku. Ustaw osobną ścieżkę dla sandboxa i dla sprzedaży |
| `PORT`, `BIND_HOST` | Domyślnie `8000` i `0.0.0.0` |

Serwer przekazuje do Przelewy24 adres e-mail klienta, identyfikator zamówienia i kwoty potrzebne do obsługi płatności. Adres dostawy i telefon pozostają w bazie zamówień. Numer zamówienia umożliwia dostęp do statusu i linku do płatności, więc udostępniaj go wyłącznie klientowi i obsłudze.

## Włączenie sprzedaży

Po pełnym teście sandboxa uzupełnij rzeczywiste dane sprzedawcy (w tym NIP i telefon), opublikuj regulamin i politykę prywatności, uzupełnij cennik dostawy i zastąp przykładowy katalog danymi handlowymi. Pole `priceCents` to cena brutto za sztukę w groszach. Każda pozycja wymaga zdjęcia w `public/assets/` w formacie WebP, JPG lub PNG. Dla opony podaj również rozmiar, sezon, `labelImage` z etykietą UE oraz `eprelUrl` do karty produktu. Zapewnij informacje o produkcie i warunkach sprzedaży odpowiednie dla swojej oferty.

Uruchamiaj jeden proces aplikacji na serwerze z trwałym lokalnym dyskiem i kopią zapasową SQLite. Zakończ TLS w publicznym reverse proxy i ogranicz częstotliwość żądań do checkoutu per adres klienta. Uprawnienia do bazy, kopii i narzędzia operatora przyznaj wyłącznie obsłudze sklepu. Użyj produkcyjnych kluczy Przelewy24 i osobnej bazy, przetestuj dostęp do bramki i zweryfikuj pierwszą płatność przed udostępnieniem sklepu klientom.

## Obsługa zamówień

Poniższe polecenia uruchamiaj w środowisku serwera z ustawionymi `P24_MODE`, `BIEZNIK_SHOP` i `BIEZNIK_DB`.

```sh
npm run orders -- list paid
npm run orders -- show <numer-zamówienia>
npm run orders -- ship <numer-zamówienia> <numer-listu-przewozowego>
npm run orders -- stock <sku> <liczba-dostępnych-sztuk>
npm run orders -- list pending
npm run orders -- list registering
npm run orders -- reconcile <numer-zamówienia>
npm run orders -- cancel <numer-zamówienia> --confirmed-unpaid
```

- Po opłaceniu zamówienia obsługa pobiera dane wysyłkowe poleceniem `show`, wysyła klientowi potwierdzenie zamówienia e-mailem i zamawia przesyłkę u przewoźnika. Nadanie odnotowuje poleceniem `ship`. Powiadomienia e-mail, etykiety przewoźnika i zwroty obsługuje się ręcznie.
- Dostępność zmniejsza się przy utworzeniu zamówienia. Pole `stock` z katalogu inicjuje nowy SKU. Zmiany dostępności wprowadza polecenie `stock`. Wpisuj ilość wolną do sprzedaży, pomniejszoną o istniejące rezerwacje.
- Przy braku webhooka polecenie `reconcile` sprawdza sesję i kwotę w Przelewy24. Porzucone zamówienie można anulować po 30 minutach i po sprawdzeniu u operatora, że płatność wygasła bez obciążenia klienta. Anulowanie oddaje sztuki do dostępnej puli.

## Testy

```sh
npm test
CHROMIUM_EXECUTABLE=/usr/bin/chromium python tests/browser_checkout.py
```

Test przeglądarkowy wymaga Playwright dla Pythona i Chromium. Testy API i przeglądarki używają izolowanej bazy i testowych odpowiedzi bramki. Test połączenia z kontem i transakcja sandbox są osobnym krokiem.

[Dokumentacja REST Przelewy24](https://developers.przelewy24.pl/)
