"""Exercise both product catalogs against the production build and an isolated preview database."""
import os
import subprocess
from pathlib import Path
from tempfile import TemporaryDirectory
from time import monotonic, sleep
from urllib.error import URLError
from urllib.parse import parse_qs, urlsplit
from urllib.request import urlopen

from playwright.sync_api import expect, sync_playwright

ROOT = Path(__file__).resolve().parents[1]
ORIGIN = 'http://127.0.0.1:8124'
ADMIN = 'admin@example.com'
PASSWORD = 'fixture-very-long-password'


def tire_catalog(page):
    page.goto(ORIGIN)
    page.get_by_label('Szerokość').select_option('225')
    page.get_by_role('button', name='Pokaż produkty').click()
    cards = page.locator('.shop-catalog-card')
    expect(cards).to_have_count(2)
    expect(page.get_by_role('link', name='Usuń filtr: Szerokość 225')).to_be_visible()
    page.get_by_role('link', name='Wyczyść wszystko').click()
    expect(cards).to_have_count(4)

    page.get_by_role('checkbox', name='Osobowe (2)').check()
    expect(cards).to_have_count(2)
    page.get_by_role('checkbox', name='SUV / 4×4 (1)').check()
    expect(cards).to_have_count(3)
    page.get_by_role('radio', name='Letnie (2)').check()
    expect(cards).to_have_count(2)
    assert parse_qs(urlsplit(page.url).query)['vehicle'] == ['passenger', 'suv']
    page.get_by_label('Sortuj').select_option('high')
    expect(cards.first).to_contain_text('Touring T2')
    page.get_by_role('link', name='Usuń filtr: SUV / 4×4').click()
    expect(cards).to_have_count(1)
    expect(page.get_by_label('Sortuj')).to_have_value('high')
    page.go_back()
    expect(cards).to_have_count(2)
    page.reload()
    expect(page.get_by_role('checkbox', name='SUV / 4×4 (1)')).to_be_checked()

    search = page.get_by_role('button', name='Szukaj opon')
    search.press('Enter')
    expect(page.get_by_role('searchbox')).to_be_focused()
    page.keyboard.press('Escape')
    expect(search).to_be_focused()
    search.click()
    page.get_by_role('searchbox').fill('Performance')
    page.get_by_role('button', name='Szukaj', exact=True).click()
    expect(cards).to_have_count(1)
    expect(page.get_by_role('link', name='Usuń filtr: Letnie')).to_be_visible()
    expect(page.get_by_role('link', name='Usuń filtr: „Performance”')).to_be_visible()

    cards.first.get_by_role('button', name='Dodaj do ulubionych').click()
    expect(cards.first.get_by_role('button', name='Usuń z ulubionych')).to_have_attribute('aria-pressed', 'true')
    cards.first.get_by_role('button', name='Dodaj do koszyka: Performance S1').click()
    expect(page.get_by_role('link', name='Koszyk, sztuk: 1')).to_be_visible()
    page.reload()
    expect(cards.first.get_by_role('button', name='Usuń z ulubionych')).to_be_visible()
    expect(page.get_by_role('link', name='Koszyk, sztuk: 1')).to_be_visible()

    page.locator('summary').filter(has_text='Producent').click()
    page.get_by_label('Producent').select_option('ROADWORK')
    expect(page.get_by_role('heading', name='Brak produktów')).to_be_visible()
    expect(page.get_by_role('status', name='').filter(has_text='Znaleziono')).to_have_text('Znaleziono: 0 produktów')
    page.get_by_role('link', name='Wyczyść filtry', exact=True).click()
    expect(cards).to_have_count(4)


def wheel_catalog(page):
    page.goto(ORIGIN + '/felgi?diameter=18&pcd=5x112')
    cards = page.get_by_role('region', name='Wyniki katalogu felg').get_by_role('article')
    expect(cards).to_have_count(2)
    page.get_by_label('Odsadzenie (ET)').select_option('45')
    expect(cards).to_have_count(1)
    expect(cards.first).to_contain_text('R/10 Graphite')
    expect(cards.first).to_contain_text('Wykończenie: Graphite')
    page.get_by_role('link', name='Usuń filtr: ET 45').click()
    expect(cards).to_have_count(2)
    page.get_by_label('Sortuj').select_option('low')
    expect(cards.first).to_contain_text('RS/05 Silver')
    page.get_by_label('Wykończenie', exact=True).select_option('Silver')
    expect(cards).to_have_count(1)

    page.get_by_role('button', name='Szukaj felg').click()
    page.get_by_role('searchbox', name='Szukaj felg').fill('MONO')
    page.get_by_role('button', name='Szukaj', exact=True).click()
    expect(page.get_by_role('link', name='Usuń filtr: „MONO”')).to_be_visible()
    assert parse_qs(urlsplit(page.url).query) == {
        'q': ['MONO'], 'diameter': ['18'], 'pcd': ['5x112'], 'finish': ['Silver'], 'sort': ['low']
    }
    cards.first.get_by_role('button', name='Dodaj do ulubionych').click()
    expect(cards.first.get_by_role('button', name='Usuń z ulubionych')).to_be_visible()
    cards.first.get_by_role('button', name='Dodaj do koszyka: RS/05 Silver').click()
    expect(page.get_by_role('link', name='Koszyk, sztuk: 2')).to_be_visible()

    page.locator('summary').filter(has_text='Producent').click()
    page.get_by_label('Producent').select_option('AXIOM')
    expect(page.get_by_role('heading', name='Brak produktów')).to_be_visible()
    page.go_back()
    expect(cards).to_have_count(1)
    page.reload()
    expect(page.get_by_label('Wykończenie', exact=True)).to_have_value('Silver')
    page.get_by_role('link', name='Wyczyść wszystko').click()
    expect(cards).to_have_count(4)


def edit_product(page):
    page.goto(ORIGIN + '/logowanie')
    page.get_by_label('E-mail').fill(ADMIN)
    page.get_by_label('Hasło').fill(PASSWORD)
    page.get_by_role('button', name='Zaloguj się').click()
    page.wait_for_url(ORIGIN + '/admin')
    page.goto(ORIGIN + '/admin/produkty/nowy')
    fields = {
        'SKU': 'archiwalna', 'Marka': 'TEST', 'Nazwa': 'Opona archiwalna', 'Rozmiar': '225/45 R18',
        'Szerokość w mm': '225', 'Profil': '45', 'Średnica w calach': '18', 'Cena brutto w groszach': '49900',
        'Ścieżka do zdjęcia': '/assets/tire-sport.svg', 'Opis': 'Opona bez opcjonalnych danych.'
    }
    for label, value in fields.items():
        page.get_by_label(label, exact=True).fill(value)
    page.get_by_role('button', name='Zapisz produkt').click()
    page.wait_for_url(ORIGIN + '/admin/produkty')

    page.goto(ORIGIN + '/opony?q=archiwalna')
    expect(page.locator('.shop-catalog-card')).to_have_count(1)
    expect(page.get_by_text('Niedostępny', exact=True)).to_be_visible()
    expect(page.get_by_role('button', name='Dodaj do koszyka: Opona archiwalna')).to_have_count(0)
    expect(page.get_by_text('Przyczepność na mokrym', exact=False)).to_have_count(0)

    page.goto(ORIGIN + '/admin/produkty/archiwalna')
    page.get_by_label('Typ pojazdu').select_option('suv')
    page.get_by_label('Klasa przyczepności na mokrym').select_option('C')
    page.get_by_label('Oznacz jako bestseller').check()
    page.get_by_role('button', name='Zapisz produkt').click()
    page.wait_for_url(ORIGIN + '/admin/produkty')
    page.goto(ORIGIN + '/opony?q=archiwalna&vehicle=suv')
    expect(page.locator('.shop-catalog-card')).to_contain_text('Przyczepność na mokrym C')
    expect(page.get_by_text('Bestseller', exact=True)).to_be_visible()

    page.goto(ORIGIN + '/admin/produkty/archiwalna')
    expect(page.get_by_label('Typ pojazdu')).to_have_value('suv')
    expect(page.get_by_label('Klasa przyczepności na mokrym')).to_have_value('C')
    expect(page.get_by_label('Oznacz jako bestseller')).to_be_checked()
    page.get_by_label('Typ pojazdu').select_option('')
    page.get_by_label('Klasa przyczepności na mokrym').select_option('')
    page.get_by_label('Oznacz jako bestseller').uncheck()
    page.get_by_role('button', name='Zapisz produkt').click()
    page.wait_for_url(ORIGIN + '/admin/produkty')
    page.goto(ORIGIN + '/opony?q=archiwalna')
    expect(page.get_by_text('Bestseller', exact=True)).to_have_count(0)
    expect(page.get_by_text('Niedostępny', exact=True)).to_be_visible()


with TemporaryDirectory() as directory:
    env = {**os.environ, 'P24_MODE': 'preview', 'NEXT_TELEMETRY_DISABLED': '1',
           'BIEZNIK_PREVIEW_DB': str(Path(directory) / 'preview.sqlite')}
    subprocess.run(['node', 'server/create-admin.mjs', ADMIN], input=PASSWORD + '\n', cwd=ROOT, env=env, text=True, check=True)
    server = subprocess.Popen(['node', 'node_modules/next/dist/bin/next', 'start', '-p', '8124', '-H', '127.0.0.1'], cwd=ROOT, env=env)
    try:
        deadline = monotonic() + 20
        while True:
            try:
                with urlopen(ORIGIN + '/opony', timeout=2) as result:
                    assert result.status == 200
                break
            except URLError:
                if monotonic() >= deadline or server.poll() is not None:
                    raise
                sleep(.25)

        with sync_playwright() as playwright:
            browser = playwright.chromium.launch(executable_path=os.getenv('CHROMIUM_EXECUTABLE') or None)
            for width in (320, 390, 768, 1280, 1440):
                with browser.new_page(viewport={'width': width, 'height': 900}) as page:
                    errors = []
                    page.on('pageerror', lambda error: errors.append(str(error)))
                    for category, heading in [('opony', 'Opony'), ('felgi', 'Felgi')]:
                        page.goto(ORIGIN + '/' + category)
                        expect(page.get_by_role('heading', name=heading, exact=True)).to_be_visible()
                        expect(page.locator('.shop-catalog-card')).to_have_count(4)
                        assert page.evaluate('document.documentElement.scrollWidth === innerWidth'), (category, width)
                        if width < 960:
                            filters = page.get_by_role('button', name='Filtry', exact=True)
                            expect(filters).to_have_attribute('aria-expanded', 'false')
                            filters.press('Enter')
                            expect(filters).to_have_attribute('aria-expanded', 'true')
                            visible_filter = (page.get_by_role('checkbox', name='Osobowe (2)') if category == 'opony'
                                              else page.get_by_label('Rozstaw śrub (PCD)'))
                            expect(visible_filter).to_be_visible()
                    if width == 1280:
                        tire_catalog(page)
                        wheel_catalog(page)
                    if width == 1440:
                        edit_product(page)
                    assert not errors, errors
            browser.close()
    finally:
        server.terminate()
        server.wait(timeout=10)
print('Product catalog browser tests passed at 320, 390, 768, 1280 and 1440 pixels')
