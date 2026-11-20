"""Exercise the production Next build with a temporary database and a simulated gateway."""
import hashlib
import json
import os
import re
import subprocess
from pathlib import Path
from tempfile import TemporaryDirectory
from time import monotonic, sleep
from urllib.error import URLError
from urllib.request import urlopen

from playwright.sync_api import expect, sync_playwright

ROOT = Path(__file__).resolve().parents[1]
ORIGIN = "http://127.0.0.1:8123"
PASSWORD = "fixture-very-long-password"
CONTACT = {
    "name": "Warsztat testowy",
    "address": "Testowa 2, 00-002 Warszawa",
    "taxId": "1234567890",
    "email": "warsztat@example.com",
    "phone": "+48 500 600 700",
    "facebookUrl": "https://www.facebook.com/bieznik-test",
    "googleMapsEmbedUrl": "https://www.google.com/maps/embed?pb=fixture",
    "googleMapsDirectionsUrl": "https://www.google.com/maps/dir/?api=1&destination=Testowa+2",
}


def workshop_contact(page):
    page.goto(ORIGIN)
    phone = page.get_by_role("link", name="Zadzwoń do warsztatu")
    facebook = page.get_by_role("link", name="BIEŻNIK na Facebooku")
    expect(phone).to_have_attribute("href", "tel:+48500600700")
    expect(facebook).to_have_attribute("href", CONTACT["facebookUrl"])
    expect(facebook).to_have_attribute("target", "_blank")
    phone.focus()
    expect(phone).to_be_focused()
    page.keyboard.press("Tab")
    expect(facebook).to_be_focused()
    assert facebook.evaluate("element => getComputedStyle(element).outlineStyle") == "solid"
    footer = page.get_by_role("contentinfo")
    for field in ["name", "address", "taxId", "email", "phone"]:
        expect(footer).to_contain_text(CONTACT[field])
    expect(footer.get_by_role("link", name="Wyznacz trasę")).to_have_attribute("href", CONTACT["googleMapsDirectionsUrl"])
    expect(footer.get_by_role("link", name="Regulamin")).to_be_visible()
    iframe = footer.locator('iframe[title="Mapa Google – lokalizacja warsztatu"]')
    expect(iframe).to_have_attribute("loading", "lazy")
    iframe.scroll_into_view_if_needed()
    expect(iframe.content_frame.get_by_text("Fixture Google Maps")).to_be_visible()
    expect(phone).to_be_in_viewport()


def contact_fallback(page, path):
    footer = page.get_by_role("contentinfo")
    page.goto(ORIGIN)
    expect(footer).to_contain_text("Sprzedawca testowy")
    expect(page.get_by_role("navigation", name="Szybki kontakt z warsztatem")).to_have_count(0)

    path.write_text(json.dumps({"facebookUrl": CONTACT["facebookUrl"],
                                "googleMapsEmbedUrl": "https://example.com/maps/embed?pb=fixture"}), encoding="utf-8")
    page.reload()
    expect(footer).to_contain_text("Sprzedawca testowy")
    expect(page.get_by_role("link", name="BIEŻNIK na Facebooku")).to_be_visible()
    expect(page.get_by_role("link", name="Zadzwoń do warsztatu")).to_have_count(0)
    expect(footer.locator("iframe")).to_have_count(0)


def assert_clear_of_widgets(action):
    action_right, widget_left = action.evaluate("""element => [element.getBoundingClientRect().right,
        document.querySelector('.contact-widgets').getBoundingClientRect().left]""")
    assert action_right <= widget_left, (action.page.viewport_size, action_right, widget_left)


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
    expect(page.locator(".featured-section .product-card")).to_have_count(1)
    assert page.evaluate("document.documentElement.scrollWidth - innerWidth") <= 1
    page.get_by_role("button", name="Felgi", exact=True).click()
    page.get_by_label("Średnica").select_option("18")
    page.get_by_role("button", name="Pokaż produkty").click()
    page.wait_for_url(re.compile(r"/felgi\?"))
    expect(page.locator(".catalog-grid .product-card")).to_have_count(1)
    page.get_by_role("button", name="Dodaj do koszyka: Felga testowa 18").click()
    page.get_by_role("link", name="Koszyk, sztuk: 1").click()
    assert_clear_of_widgets(page.get_by_role("button", name="Zwiększ ilość: Felga testowa 18"))
    order_link = page.get_by_role("link", name="Przejdź do zamówienia")
    assert_clear_of_widgets(order_link)
    order_link.click()
    expect(page.locator("#shipping")).to_contain_text("24,00")
    expect(page.locator("#checkoutTotal")).to_contain_text("923,00")
    assert_clear_of_widgets(page.get_by_role("button", name="Zamawiam i płacę"))
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


with TemporaryDirectory() as directory:
    contact_path = Path(directory) / "contact.json"
    env = {
        **os.environ, "P24_MODE": "sandbox", "P24_MERCHANT_ID": "123", "P24_POS_ID": "124",
        "P24_CRC": "fixture-crc", "P24_API_KEY": "fixture-key", "APP_ORIGIN": ORIGIN,
        "BIEZNIK_SHOP": "shop.example.json", "BIEZNIK_DB": str(Path(directory) / "test.sqlite"),
        "BIEZNIK_CONTACT": str(contact_path),
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
            page = browser.new_page()
            contact_fallback(page, contact_path)
            page.close()
            contact_path.write_text(json.dumps(CONTACT), encoding="utf-8")
            for width in [320, 768, 1024, 1440, 390]:
                page = browser.new_page(viewport={"width": width, "height": 900}, reduced_motion="reduce")
                page.set_default_timeout(8000)
                page.route(CONTACT["googleMapsEmbedUrl"], lambda route: route.fulfill(
                    content_type="text/html", body="Fixture Google Maps"))
                failures = []
                page.on("pageerror", lambda error: failures.append(str(error)))
                if width in [320, 1440]:
                    workshop_contact(page)
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
                page.get_by_role("button", name="Zapisz produkt").click()
                page.wait_for_url(ORIGIN + "/admin/produkty")
                expect(page.locator("tbody")).to_contain_text("879,00")
                page.goto(ORIGIN + "/produkt/wheel-test-18")
                expect(page.get_by_text("Dostępne sztuki: 3")).to_be_visible()
                expect(page.get_by_text("879,00 zł", exact=True)).to_be_visible()
                page.goto(ORIGIN + "/admin/produkty/nowy")
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
                assert not failures, failures
                page.close()
            browser.close()
    finally:
        server.terminate()
        server.wait(timeout=10)
print("Browser tests passed at 320, 390, 768, 1024 and 1440 pixels")
