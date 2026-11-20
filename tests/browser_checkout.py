"""Browser checkout using a temporary database and a simulated gateway."""
import hashlib
import json
import os
import re
import subprocess
from pathlib import Path
from tempfile import TemporaryDirectory

from playwright.sync_api import expect, sync_playwright

ROOT = Path(__file__).resolve().parents[1]
ORIGIN = "http://127.0.0.1:8123"

with TemporaryDirectory() as directory:
    server = subprocess.Popen(
        ["node", "tests/browser-fixture.mjs", str(Path(directory) / "test.sqlite")],
        stdout=subprocess.PIPE,
        text=True,
        cwd=ROOT,
    )
    try:
        assert server.stdout.readline().strip() == "ready"
        with sync_playwright() as playwright:
            browser = playwright.chromium.launch(
                executable_path=os.getenv("CHROMIUM_EXECUTABLE") or None,
                headless=True,
            )
            for width in [320, 390, 768, 1440]:
                page = browser.new_page(viewport={"width": width, "height": 900}, reduced_motion="reduce")
                page.set_default_timeout(5500)
                failures = []
                page.on("pageerror", lambda error: failures.append(str(error)))
                page.goto(ORIGIN)
                expect(page.locator("#featuredGrid .product-card")).to_have_count(1)
                assert page.evaluate("document.documentElement.scrollWidth - innerWidth") <= 1
                page.get_by_role("tab", name="FELGI").click()
                expect(page.locator("#wheelDiameter")).to_be_visible()
                page.locator("#wheelDiameter").select_option("18")
                page.locator("#finderForm").get_by_role("button", name="POKAŻ PRODUKTY").click()
                expect(page.locator("#catalogGrid .product-card")).to_have_count(1)
                page.locator("#catalogGrid [data-add]").click()
                page.get_by_role("button", name="Otwórz koszyk").click()
                page.locator("#drawerGoCart").click()
                page.get_by_role("link", name="Przejdź do zamówienia").click()
                expect(page.locator("#checkoutShipping")).to_contain_text("24,00")
                expect(page.locator("#checkoutTotal")).to_contain_text("923,00")
                assert page.evaluate("document.documentElement.scrollWidth - innerWidth") <= 1
                assert not failures, failures
                if width != 390:
                    page.close()
                    continue
                for name, value in {
                    "name": "Jan Testowy",
                    "email": "jan@example.com",
                    "phone": "500 600 700",
                    "street": "Prosta 5/2",
                    "postcode": "00-001",
                    "city": "Warszawa",
                }.items():
                    page.locator(f'#checkoutForm [name="{name}"]').fill(value)
                page.locator('[name="termsAccepted"]').check()

                def redirect_to_store(route):
                    target = ORIGIN + "/payment-return/" + page.url.split("/")[-1]
                    route.fulfill(
                        content_type="text/html; charset=utf-8",
                        body=f'<a href="{target}">Powrót z Przelewy24</a>',
                    )

                page.route("https://sandbox.przelewy24.pl/trnRequest/browser-fixture", redirect_to_store)
                page.get_by_role("button", name="Zamawiam i płacę").click()
                page.wait_for_url("https://sandbox.przelewy24.pl/trnRequest/browser-fixture")
                page.get_by_role("link", name="Powrót z Przelewy24").click()
                page.wait_for_url(re.compile(r"/#/order/[a-f0-9-]+"))
                expect(page.locator("#orderMessage")).to_contain_text("Czekamy na potwierdzenie")
                session_id = page.url.split("/")[-1]
                body = {
                    "merchantId": 123, "posId": 124, "sessionId": session_id, "amount": 92300,
                    "originAmount": 92300, "currency": "PLN", "orderId": 79001,
                    "methodId": 154, "statement": "P24-FIXTURE"
                }
                signed_data = json.dumps({**body, "crc": "fixture-crc"}, separators=(",", ":"))
                body["sign"] = hashlib.sha384(signed_data.encode()).hexdigest()
                response = page.request.post(ORIGIN + "/api/payments/p24/notify", data=body)
                assert response.status == 200
                page.get_by_role("button", name="Sprawdź status").click()
                expect(page.locator("#orderMessage")).to_contain_text("Płatność potwierdzona")
                assert not failures, failures
                page.close()
            browser.close()
    finally:
        server.terminate()
        server.wait(timeout=5)
print("Browser tests passed at 320, 390, 768 and 1440 pixels")
