# BIEŻNIK

Sklep z oponami i felgami oparty na makiecie BIEŻNIK V2.2. Next.js z App Routerem i TypeScript obsługują katalog, zamówienia, panel klienta i panel administracyjny. Wysyłka kurierem na terenie Polski, płatność przez Przelewy24, zamówienia, konta i dostępność w SQLite.

## Uruchomienie

Na Node.js 24.14 lub nowszym, z katalogu projektu:

```sh
npm ci
npm run dev
```

Otwórz `http://localhost:8000`. Wersję produkcyjną uruchamiają `npm run build` i `npm start`. Polecenie `npm run start:legacy` uruchamia poprzedni serwer na potrzeby zgodności i diagnostyki.

Domyślny tryb `preview` pokazuje oznaczoną ofertę z makiety. Składanie zamówień jest w nim wyłączone. Panel klienta i panel admina można sprawdzić z testowymi kontami. Dane podglądu są w osobnej bazie `data/preview.sqlite` (nadpisanie ścieżki przez `BIEZNIK_PREVIEW_DB`).

## Kontakt z warsztatem

Zapisz publiczne dane firmy jako obiekt JSON w `data/contact.json`. Inną ścieżkę można ustawić przez `BIEZNIK_CONTACT`. Konfiguracja działa w trybie podglądu i w sklepie z włączoną sprzedażą. Każde pole jest opcjonalne. Uzupełnij nazwę i adres razem, aby w stopce sklepu wyświetlić dane firmy z tego pliku zamiast dotychczasowych danych sprzedawcy.

| Pole | Wartość |
| --- | --- |
| `name`, `address` | Pełna nazwa firmy i adres wyświetlany w stopce |
| `taxId`, `email` | NIP i publiczny e-mail firmy |
| `phone` | Publiczny numer warsztatu, najlepiej z prefiksem `+48`. Uaktywnia przycisk telefonu |
| `facebookUrl` | Adres HTTPS fanpage’a w serwisie Facebook. Uaktywnia przycisk Facebooka |
| `googleMapsEmbedUrl` | Otwórz pinezkę warsztatu w Google Maps, wybierz „Udostępnij” → „Umieść mapę” i skopiuj sam adres `src` z kodu `iframe` |
| `googleMapsDirectionsUrl` | Link HTTPS do trasy do tej samej pinezki. Użyj adresu z Google Maps z otwartą trasą lub udostępnionego krótkiego linku do pinezki |

## Panele

- `/konto` pokazuje zamówienia zapisane podczas zalogowanego zakupu, status i numer przesyłki. Gość kupuje bez rejestracji i wraca do statusu przez swój link. Starsze zamówienia bez konta zachowują dostęp przez dotychczasowy numer. Zamówienia przypisane do konta są dostępne dla właściciela i obsługi.
- `/admin` pozwala dodawać i edytować produkty, ceny i ilość dostępnych sztuk. W sekcji zamówień obsługa odczytuje adres dostawy i zapisuje numer przesyłki przy opłaconym zamówieniu. Zdjęcia i etykiety umieść w `public/assets/` i wskaż ich ścieżki w panelu.
- Dane katalogu z panelu są przechowywane w bazie. Równoczesna zmiana produktu lub zapasów wymaga odświeżenia formularza przed zapisem.

Konto administratora zakłada operator z dostępem do serwera. W Bash odczytaj hasło bez echa i przekaż je na standardowe wejście:

```sh
read -rs admin_password
printf '%s\n' "$admin_password" | npm run accounts:admin -- admin@example.com
unset admin_password
```

Użyj tych samych ustawień bazy co aplikacja. Dla produkcji utwórz konto admina przed otwarciem rejestracji. Polecenie nie zmienia roli już istniejącego konta.

## Sandbox Przelewy24

1. Utwórz konto sandbox w panelu Przelewy24. Włącz dostęp do REST API i skonfiguruj dozwolony adres IP serwera zgodnie z dokumentacją operatora.
2. Skopiuj `shop.example.json` do `data/shop.json`. Wysyłka w przykładzie jest naliczana jako koszt pierwszej sztuki plus stawka za każdą kolejną sztukę.
3. Ustaw poniższe zmienne w konfiguracji procesu. Klucz CRC i klucz API wprowadź przez magazyn sekretów hostingu.
4. Uruchom `npm run orders -- test-access`, a następnie zbuduj i uruchom aplikację. Złóż zamówienie i wykonaj płatność testową. Po powrocie ze strony operatora sprawdź, czy Przelewy24 wywołało webhook i zamówienie zmieniło status na opłacone. W sandboxie używaj danych testowych.

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

Uruchamiaj jeden proces aplikacji na serwerze z trwałym lokalnym dyskiem i kopią zapasową SQLite. Istniejąca baza wersji V2.2 jest rozszerzana przy pierwszym uruchomieniu i zachowuje zamówienia oraz zapasy. Zrób kopię przed aktualizacją. Zmiana silnika bazy na PostgreSQL wymaga osobnej migracji. Zakończ TLS w publicznym reverse proxy i ogranicz częstotliwość żądań do checkoutu per adres klienta. Uprawnienia do bazy, kopii i narzędzia operatora przyznaj wyłącznie obsłudze sklepu. Użyj produkcyjnych kluczy Przelewy24 i osobnej bazy, przetestuj dostęp do bramki i zweryfikuj pierwszą płatność przed udostępnieniem sklepu klientom.

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
- Dostępność zmniejsza się przy utworzeniu zamówienia. Pole `stock` z katalogu inicjuje nowy SKU. Dostępność zmienisz w panelu lub poleceniem `stock`. Wpisuj ilość wolną do sprzedaży, pomniejszoną o istniejące rezerwacje.
- Przy braku webhooka polecenie `reconcile` sprawdza sesję i kwotę w Przelewy24. Porzucone zamówienie można anulować po 30 minutach i po sprawdzeniu u operatora, że płatność wygasła bez obciążenia klienta. Anulowanie oddaje sztuki do dostępnej puli.

## Testy

```sh
npm test
npm run build
CHROMIUM_EXECUTABLE=/usr/bin/chromium python tests/browser_checkout.py
```

Test przeglądarkowy wymaga Playwright dla Pythona i Chromium. Testy API i przeglądarki używają izolowanej bazy i testowych odpowiedzi bramki. Test połączenia z kontem i transakcja sandbox są osobnym krokiem.

[Dokumentacja REST Przelewy24](https://developers.przelewy24.pl/)
