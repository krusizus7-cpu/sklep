"""Exercise the production Next build with a temporary database and a simulated gateway."""
import hashlib
import json
import os
import re
import sqlite3
import subprocess
from pathlib import Path
from tempfile import TemporaryDirectory
from time import monotonic, sleep
from urllib.error import URLError
from urllib.parse import parse_qs, urlparse
from urllib.request import urlopen
from uuid import uuid4

from playwright.sync_api import expect, sync_playwright

ROOT = Path(__file__).resolve().parents[1]
ORIGIN = "http://127.0.0.1:8123"
PASSWORD = "fixture-very-long-password"


def login(page, address):
    page.goto(ORIGIN + "/logowanie")
    page.get_by_label("E-mail").fill(address)
    page.get_by_label("Hasło").fill(PASSWORD)
    page.get_by_role("button", name="Zaloguj się").click()


def register(page, address):
    page.goto(ORIGIN + "/rejestracja")
    page.get_by_label("E-mail").fill(address)
    page.get_by_label("Hasło").fill(PASSWORD)
    page.get_by_role("button", name="Utwórz konto", exact=True).click()
    page.wait_for_url(ORIGIN + "/konto")


def checkout(page):
    page.goto(ORIGIN)
    expect(page.locator(".featured-section .product-card")).to_have_count(4)
    assert page.evaluate("document.documentElement.scrollWidth - innerWidth") <= 1
    page.get_by_role("button", name="Felgi", exact=True).click()
    page.get_by_label("Średnica").select_option("18")
    page.get_by_role("button", name="Pokaż produkty").click()
    page.wait_for_url(re.compile(r"/felgi\?"))
    expect(page.locator(".catalog-grid .product-card")).to_have_count(1)
    page.get_by_role("button", name="Dodaj do koszyka: Felga testowa 18").click()
    page.get_by_role("link", name="Koszyk, sztuk: 1").click()
    page.get_by_role("link", name="Przejdź do zamówienia").click()
    expect(page.locator("#shipping")).to_contain_text("24,00")
    expect(page.locator("#checkoutTotal")).to_contain_text("923,00")
    assert page.evaluate("document.documentElement.scrollWidth - innerWidth") <= 1


def catalog_filters(page, mobile):
    page.goto(ORIGIN + "/opony")
    search = page.get_by_role("searchbox", name="Szukaj produktu")
    for size in ["225/50R17", "225 / 50 R17"]:
        search.fill(size)
        if mobile and " " in size:
            page.get_by_role("button", name="Szukaj", exact=True).click()
        else:
            search.press("Enter")
        page.wait_for_url(lambda url: parse_qs(urlparse(url).query).get("q") == [size])
        expect(page.locator(".catalog-grid .product-card")).to_have_count(1)
        expect(page.get_by_role("link", name="Opona testowa 17", exact=True)).to_be_visible()

    toggle = page.get_by_role("button", name="Filtry", exact=True)
    if mobile:
        expect(page.get_by_label("Średnica")).to_be_hidden()
        toggle.press("Enter")
        expect(toggle).to_have_attribute("aria-expanded", "true")
    else:
        expect(toggle).to_be_hidden()
    page.get_by_label("Średnica").select_option("16")
    page.get_by_label("Sezon").select_option("summer")
    page.get_by_label("Sortuj").select_option("high")
    page.get_by_role("button", name="Zastosuj").click()
    expect(page.get_by_role("heading", name="Brak produktów")).to_be_visible()
    if mobile:
        expect(page.get_by_role("button", name="Filtry (2)")).to_have_attribute("aria-expanded", "false")
    page.get_by_role("link", name="Usuń „Średnica: 16” · Wyniki: 1").click()
    expect(page.locator(".catalog-grid .product-card")).to_have_count(1)
    expect(page.get_by_role("link", name="Usuń filtr Średnica: 16")).to_have_count(0)
    page.get_by_role("link", name="Usuń filtr Szukaj: 225 / 50 R17").click()
    expect(search).to_have_value("")
    assert parse_qs(urlparse(page.url).query) == {"season": ["summer"], "sort": ["high"]}
    if mobile:
        page.get_by_role("button", name="Filtry (1)").click()
    expect(page.get_by_label("Średnica")).to_have_value("")
    expect(page.get_by_role("combobox", name="Sezon")).to_have_value("summer")
    expect(page.get_by_label("Sortuj")).to_have_value("high")
    assert page.evaluate("document.documentElement.scrollWidth - innerWidth") <= 1


def budget_and_back(page):
    path = "/felgi?budzet=3656&sztuki=4&diameter=18"
    page.goto(ORIGIN + path)
    card = page.locator(".catalog-grid .product-card")
    expect(card).to_contain_text(re.compile(r"3\s?656,00"))
    target = card.get_by_role("link", name="Felga testowa 18", exact=True)
    for system_back in (True, False):
        target.click()
        back = page.get_by_role("link", name="Wróć do wyników")
        expect(back).to_have_attribute("href", path)
        if system_back:
            page.go_back()
        else:
            back.click()
        page.wait_for_url(ORIGIN + path)
        expect(card.get_by_text("Ostatnio oglądany")).to_be_in_viewport()
    page.goto(ORIGIN + "/produkt/wheel-test-18")
    expect(page.get_by_role("link", name="Wróć do wyników")).to_have_count(0)
    page.goto(ORIGIN + "/felgi?budzet=3655,99")
    expect(card).to_have_count(0)
    expect(page.get_by_role("heading", name="Brak produktów")).to_be_visible()


def restore_scrolled_list(page):
    path = "/opony?sort=low&budzet=2000&sztuki=4"
    page.goto(ORIGIN + path)
    card = page.locator('article[data-product-id="scroll-10"]')
    link = card.get_by_role("link", name="Model 10", exact=True)
    for use_back in (False, True):
        link.evaluate("el => el.scrollIntoView({block: 'center', behavior: 'instant'})")
        card.evaluate("""card => document.addEventListener('click', () => {
          sessionStorage.setItem('tileOffsetAtClick', String(card.getBoundingClientRect().top));
        }, {capture: true, once: true})""")
        assert page.evaluate("scrollY") > 100
        link.click()
        back = page.get_by_role("link", name="Wróć do wyników")
        expect(back).to_have_attribute("href", path)
        if use_back:
            page.go_back()
        else:
            back.click()
        page.wait_for_url(ORIGIN + path)
        expect(card.get_by_text("Ostatnio oglądany")).to_be_visible()
        position = float(page.evaluate("sessionStorage.getItem('tileOffsetAtClick')"))
        page.wait_for_function("""([id, y]) => Math.abs(
          document.querySelector('[data-product-id="' + id + '"]').getBoundingClientRect().top - y) < 6""",
          arg=["scroll-10", position])
    page.goto(ORIGIN + "/opony?diameter=17")
    expect(page.get_by_text("Ostatnio oglądany")).to_have_count(0)


def product_purchase(page, mobile):
    page.goto(ORIGIN + "/produkt/wheel-test-18")
    two = page.get_by_role("radio", name="2 szt.", exact=True)
    four = page.get_by_role("radio", name="4 szt.", exact=True)
    expect(two).to_be_enabled()
    page.locator(".purchase-options label").filter(has_text="2 szt.").click()
    expect(two).to_be_checked()
    expect(page.locator(".purchase-total dd")).to_contain_text(re.compile(r"1\s?834,00"))
    two.press("ArrowRight")
    expect(four).to_be_checked()
    expect(page.locator(".purchase-prices")).to_contain_text("60,00")
    expect(page.locator(".purchase-total dd")).to_contain_text(re.compile(r"3\s?656,00"))
    add = page.get_by_role("button", name="Dodaj 4 szt. do koszyka")
    if mobile:
        page.evaluate("window.scrollTo(0, 0)")
        expect(add).to_be_in_viewport()
        page.evaluate("window.scrollTo(0, document.documentElement.scrollHeight)")
        expect(add).to_be_in_viewport()
    add.click()
    expect(page.get_by_role("link", name="Koszyk, sztuk: 4")).to_be_visible()
    page.get_by_role("link", name="W koszyku: 4 szt. Przejdź do koszyka").click()
    expect(page.locator("#shipping")).to_contain_text("60,00")
    expect(page.locator("#checkoutTotal")).to_contain_text(re.compile(r"3\s?656,00"))
    page.go_back()
    expect(two).to_be_enabled()
    page.locator(".purchase-options label").filter(has_text="2 szt.").click()
    page.get_by_role("button", name="Dodaj 2 szt. do koszyka").click()
    expect(four).to_be_disabled()
    expect(page.get_by_role("link", name="Koszyk, sztuk: 6")).to_be_visible()
    assert page.evaluate("document.documentElement.scrollWidth - innerWidth") <= 1


def pay(page, guest=False):
    for name, value in {
        "name": "Jan Testowy",
        "email": "dostawa@example.com",
        "phone": "500 600 700",
        "street": "Prosta 5/2",
        "postcode": "00-001",
        "city": "Warszawa",
    }.items():
        page.locator(f'form [name="{name}"]').fill(value)
    page.locator('[name="termsAccepted"]').check()

    def redirect_to_store(route):
        token = route.request.url.rsplit("/", 1)[-1]
        target = ORIGIN + "/payment-return/" + token.removeprefix("fixture-")
        route.fulfill(
            content_type="text/html; charset=utf-8",
            body=f'<a href="{target}">Powrót z Przelewy24</a>',
        )

    page.route("https://sandbox.przelewy24.pl/trnRequest/fixture-*", redirect_to_store)
    page.get_by_role("button", name="Zamawiam i płacę").click()
    page.wait_for_url(re.compile(r"przelewy24\.pl/trnRequest/fixture-"))
    if guest:
        guest_id = page.url.rsplit("/", 1)[-1].removeprefix("fixture-")
        page.goto(ORIGIN)
        expect(page.get_by_role("link", name="Status ostatniego zamówienia")).to_have_attribute(
            "href", "/zamowienia/" + guest_id
        )
        page.goto(ORIGIN + "/#/order/" + guest_id)
    else:
        page.get_by_role("link", name="Powrót z Przelewy24").click()
    page.wait_for_url(re.compile(r"/zamowienia/[a-f0-9-]+"))
    expect(page.get_by_role("status").filter(has_text="Oczekuje")).to_contain_text("Oczekuje na płatność")
    order_id = page.url.rsplit("/", 1)[-1]
    body = {
        "merchantId": 123, "posId": 124, "sessionId": order_id, "amount": 92300,
        "originAmount": 92300, "currency": "PLN", "orderId": 79002 if guest else 79001,
        "methodId": 154, "statement": "P24-FIXTURE"
    }
    signed_data = json.dumps({**body, "crc": "fixture-crc"}, separators=(",", ":"))
    body["sign"] = hashlib.sha384(signed_data.encode()).hexdigest()
    response = page.request.post(ORIGIN + "/api/payments/p24/notify", data=body)
    assert response.status == 200
    page.get_by_role("button", name="Sprawdź status").click()
    expect(page.get_by_role("status").filter(has_text="Opłacone")).to_have_text("Opłacone")
    return order_id


def archived_purchase(page, database, source_order):
    size = "225/50 R17"
    item = {"id": "discontinued", "name": "Archiwalna opona", "size": size, "priceCents": 32000, "quantity": 2}
    with sqlite3.connect(database) as db:
        db.execute("""
            INSERT INTO orders (id, requestId, fingerprint, status, items, customer, shipping, total,
                                termsUrl, createdAt, paidAt, shippedAt, accountId)
            SELECT ?, ?, 'archived-fixture', 'paid', ?, customer, 3600, 67600, termsUrl,
                   '2020-03-01T12:00:00Z', '2020-03-01T12:01:00Z', '2020-03-02T12:00:00Z', accountId
            FROM orders WHERE id = ?
        """, (str(uuid4()), str(uuid4()), json.dumps([item]), source_order))
    page.goto(ORIGIN + "/konto")
    order = page.locator(".history-list details").filter(has_text="Archiwalna opona")
    order.locator("summary").click()
    expect(order.locator(".purchase-record")).to_contain_text("2 szt. · 320,00")
    order.get_by_role("link", name="Szukaj tego rozmiaru").click()
    page.wait_for_url(lambda url: parse_qs(urlparse(url).query).get("q") == [size])
    expect(page.locator(".catalog-grid article")).to_have_count(1)
    expect(page.get_by_role("link", name="Opona testowa 17", exact=True)).to_be_visible()


with TemporaryDirectory() as directory:
    shop = json.loads((ROOT / "shop.example.json").read_text())
    shop["products"].extend([
        {"id": "tire-test-17", "type": "tires", "brand": "BIEŻNIK Demo", "name": "Opona testowa 17",
         "size": "225/50 R17", "diameter": 17, "width": 225, "profile": 50, "season": "summer",
         "description": "Letnia opona testowa.", "image": "/assets/tire-sport.svg", "priceCents": 45900, "stock": 20},
        {"id": "tire-test-16", "type": "tires", "brand": "BIEŻNIK Demo", "name": "Opona testowa 16",
         "size": "205/55 R16", "diameter": 16, "width": 205, "profile": 55, "season": "winter",
         "description": "Zimowa opona testowa.", "image": "/assets/tire-winter.svg", "priceCents": 37900, "stock": 20},
    ])
    for index in range(18):
        shop["products"].append({**shop["products"][1], "id": f"scroll-{index}", "name": f"Model {index}",
                                 "size": "215/50 R18", "width": 215, "diameter": 18})
    shop_file = Path(directory) / "shop.json"
    shop_file.write_text(json.dumps(shop), encoding="utf-8")
    env = {
        **os.environ, "P24_MODE": "sandbox", "P24_MERCHANT_ID": "123", "P24_POS_ID": "124",
        "P24_CRC": "fixture-crc", "P24_API_KEY": "fixture-key", "APP_ORIGIN": ORIGIN,
        "BIEZNIK_SHOP": str(shop_file), "BIEZNIK_DB": str(Path(directory) / "test.sqlite"),
        "NEXT_TELEMETRY_DISABLED": "1"
    }
    subprocess.run(["node", "server/create-admin.mjs", "admin@example.com"], input=PASSWORD + "\n",
                   cwd=ROOT, env=env, text=True, check=True)
    server = subprocess.Popen(
        ["node", "--import", str(ROOT / "tests/browser-fixture.mjs"),
         "node_modules/next/dist/bin/next", "start", "-p", "8123", "-H", "127.0.0.1"],
        cwd=ROOT, env=env,
    )
    try:
        deadline = monotonic() + 20
        while True:
            try:
                with urlopen(ORIGIN + "/api/shop", timeout=2) as response:
                    assert json.load(response)["ordering"]
                break
            except URLError:
                if monotonic() >= deadline or server.poll() is not None:
                    raise
                sleep(.25)
        with sync_playwright() as playwright:
            browser = playwright.chromium.launch(
                executable_path=os.getenv("CHROMIUM_EXECUTABLE") or None, headless=True,
            )
            for width in [320, 768, 1024, 1440]:
                page = browser.new_page(viewport={"width": width, "height": 900}, reduced_motion="reduce")
                page.set_default_timeout(8000)
                failures = []
                page.on("pageerror", lambda error: failures.append(str(error)))
                catalog_filters(page, mobile=width <= 800)
                budget_and_back(page)
                if width in (320, 1440):
                    restore_scrolled_list(page)
                product_purchase(page, mobile=width <= 800)
                assert not failures, failures
                page.close()
            for width in [320, 768, 1440, 390]:
                page = browser.new_page(viewport={"width": width, "height": 900}, reduced_motion="reduce")
                page.set_default_timeout(8000)
                failures = []
                page.on("pageerror", lambda error: failures.append(str(error)))
                if width == 390:
                    register(page, "kupujacy@example.com")
                checkout(page)
                assert not failures, failures
                if width == 320:
                    guest_id = pay(page, guest=True)
                    response = page.request.get(ORIGIN + "/api/orders/" + guest_id)
                    assert response.status == 200
                    assert "dostawa@example.com" not in response.text()
                if width != 390:
                    page.close()
                    continue
                order_id = pay(page)
                page.goto(ORIGIN + "/konto")
                page.locator(".history-list summary").click()
                expect(page.get_by_role("link", name="Zobacz status zamówienia")).to_have_attribute(
                    "href", "/zamowienia/" + order_id
                )
                page.goto(ORIGIN + "/admin/zamowienia/" + order_id)
                page.wait_for_url(ORIGIN + "/konto")
                expect(page.get_by_text("Prosta 5/2")).to_have_count(0)
                page.get_by_role("button", name="Wyloguj się").click()
                page.wait_for_url(ORIGIN + "/logowanie")
                register(page, "dostawa@example.com")
                expect(page.get_by_text("Nie masz jeszcze zamówień.")).to_be_visible()
                denied = page.request.get(ORIGIN + "/api/orders/" + order_id)
                assert denied.status == 404
                page.get_by_role("button", name="Wyloguj się").click()
                page.wait_for_url(ORIGIN + "/logowanie")
                login(page, "admin@example.com")
                page.wait_for_url(ORIGIN + "/admin")
                page.get_by_role("link", name="Obsłuż zamówienia").click()
                page.get_by_role("link", name=order_id).click()
                expect(page.get_by_text("Prosta 5/2")).to_be_visible()
                page.get_by_label("Numer listu przewozowego").fill("TEST-123")
                page.get_by_role("button", name="Oznacz jako wysłane").click()
                expect(page.get_by_role("heading", name="Wysłane")).to_be_visible()
                page.goto(ORIGIN + "/admin/produkty")
                page.get_by_role("link", name="BIEŻNIK Demo Felga testowa 18").click()
                page.get_by_label("Cena brutto w groszach").fill("87900")
                page.get_by_label("Sztuki dostępne do sprzedaży").fill("3")
                page.locator('textarea[name="description"]').fill("Długi opis produktu. " * 35)
                page.get_by_role("button", name="Podgląd mobilny").click()
                preview = page.get_by_role("dialog")
                expect(preview.locator(".detail-price-line strong")).to_have_text("879,00 zł")
                action = preview.get_by_role("button", name="Dodaj 1 szt. do koszyka")
                expect(action).to_be_in_viewport()
                box = action.bounding_box()
                dialog_box = preview.bounding_box()
                assert dialog_box["y"] <= box["y"] and box["y"] + box["height"] <= dialog_box["y"] + dialog_box["height"] + 1
                preview.locator(".preview-content").evaluate("el => el.scrollTop = el.scrollHeight")
                assert abs(action.bounding_box()["y"] - box["y"]) <= 1
                expect(preview.get_by_role("radio", name="4 szt.", exact=True)).to_be_disabled()
                public = browser.new_page()
                public.goto(ORIGIN + "/produkt/wheel-test-18")
                expect(public.locator(".detail-price-line strong")).to_have_text("899,00 zł")
                public.close()
                page.keyboard.press("Escape")
                expect(page.get_by_label("Cena brutto w groszach")).to_have_value("87900")
                page.get_by_role("button", name="Zapisz produkt").click()
                page.wait_for_url(ORIGIN + "/admin/produkty")
                expect(page.locator("tbody")).to_contain_text("879,00")
                page.goto(ORIGIN + "/produkt/wheel-test-18")
                expect(page.get_by_text("Dostępne sztuki: 3")).to_be_visible()
                expect(page.locator(".detail-price-line strong")).to_have_text("879,00 zł")
                expect(page.get_by_role("radio", name="4 szt.", exact=True)).to_be_disabled()
                page.goto(ORIGIN + "/admin/produkty/nowy")
                page.get_by_label("Nazwa").fill("Próbna zimowa")
                page.get_by_label("Cena brutto w groszach").fill("45900")
                page.get_by_label("Sztuki dostępne do sprzedaży").fill("4")
                page.get_by_label("Sezon").select_option("winter")
                page.get_by_role("button", name="Podgląd mobilny").click()
                expect(preview.get_by_role("heading", name="Próbna zimowa")).to_be_visible()
                expect(preview.get_by_text("Zimowa", exact=True)).to_be_visible()
                preview.locator(".purchase-options label").filter(has_text="4 szt.").click()
                expect(preview.locator(".purchase-total dd")).to_contain_text(re.compile(r"1\s?896,00"))
                preview.get_by_role("button", name="Dodaj 4 szt. do koszyka").click()
                expect(preview.get_by_text("W podglądzie: 4 szt.")).to_be_visible()
                preview.get_by_role("button", name="Zamknij").click()
                expect(page.get_by_role("link", name="Koszyk, sztuk: 0")).to_be_visible()
                page.get_by_label("SKU").fill("felga-test-2")
                page.get_by_label("Rodzaj").select_option("wheels")
                for name, value in {
                    "Marka": "BIEŻNIK", "Nazwa": "Felga druga", "Rozmiar": "8J × 19", "Średnica w calach": "19",
                    "PCD": "5x112", "ET": "45", "Wykończenie": "Srebrne", "Cena brutto w groszach": "99900",
                    "Sztuki dostępne do sprzedaży": "4", "Ścieżka do zdjęcia": "/assets/wheel-silver.svg",
                    "Opis": "Produkt do testu zapisu katalogu."
                }.items():
                    page.get_by_label(name, exact=True).fill(value)
                page.get_by_role("button", name="Zapisz produkt").click()
                page.wait_for_url(ORIGIN + "/admin/produkty")
                expect(page.get_by_role("link", name="BIEŻNIK Felga druga")).to_be_visible()
                page.goto(ORIGIN + "/zamowienia/" + order_id)
                expect(page.get_by_text("TEST-123")).to_be_visible()
                buyer = browser.new_page()
                login(buyer, "kupujacy@example.com")
                buyer.wait_for_url(ORIGIN + "/konto")
                buyer.locator(".history-list summary").click()
                expect(buyer.get_by_role("link", name="Znajdź ten model")).to_have_attribute("href", "/produkt/wheel-test-18")
                expect(buyer.locator(".purchase-record")).to_contain_text("899,00")
                buyer.get_by_label("Ocena").select_option("5")
                buyer.get_by_label("Treść opinii").fill("Felgi zgodne z opisem.")
                buyer.get_by_role("button", name="Wyślij opinię").click()
                expect(buyer.get_by_text("Oczekuje na zatwierdzenie")).to_be_visible()
                buyer.goto(ORIGIN + "/produkt/wheel-test-18")
                expect(buyer.get_by_text("Felgi zgodne z opisem.")).to_have_count(0)
                page.goto(ORIGIN + "/admin/opinie")
                page.get_by_role("button", name="Zatwierdź").click()
                expect(page.get_by_text("Felgi zgodne z opisem.")).to_have_count(0)
                buyer.reload()
                expect(buyer.get_by_text("Felgi zgodne z opisem.")).to_be_visible()
                expect(buyer.get_by_text("Potwierdzony zakup", exact=True)).to_be_visible()
                expect(buyer.get_by_text("Średnia 5 / 5 · Liczba opinii: 1")).to_be_visible()
                buyer.goto(ORIGIN + "/konto")
                buyer.locator(".history-list summary").click()
                expect(buyer.get_by_text("Opublikowana", exact=True)).to_be_visible()
                archived_purchase(buyer, env["BIEZNIK_DB"], order_id)
                buyer.close()
                assert not failures, failures
                page.close()
            browser.close()
    finally:
        server.terminate()
        server.wait(timeout=10)
print("Browser tests passed at 320, 390, 768, 1024 and 1440 pixels")
