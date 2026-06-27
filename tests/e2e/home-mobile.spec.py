/**
 * Test E2E Playwright — accueil + cartes produits sur profil mobile.
 * Lancer manuellement : `python tests/e2e/home-mobile.spec.py`
 * (ce projet n'inclut pas la stack Playwright JS ; on garde une spec auto-portante.)
 */
import asyncio
from pathlib import Path
from playwright.async_api import async_playwright

SCREENSHOTS = Path(__file__).parent / "screenshots"
SCREENSHOTS.mkdir(parents=True, exist_ok=True)

URL = "http://localhost:8080/"

async def main():
    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=True)
        ctx = await browser.new_context(
            viewport={"width": 390, "height": 844},
            user_agent="Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1",
            is_mobile=True,
            has_touch=True,
        )
        page = await ctx.new_page()
        errors = []
        page.on("pageerror", lambda e: errors.append(str(e)))
        page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)

        await page.goto(URL, wait_until="domcontentloaded", timeout=30_000)
        await page.wait_for_load_state("networkidle", timeout=20_000)
        await page.screenshot(path=str(SCREENSHOTS / "home_mobile.png"))

        # Vérifie l'absence du message d'échec de chargement.
        body_text = (await page.locator("body").inner_text()).lower()
        assert "échec du chargement" not in body_text, "Mobile home shows chunk-load error"
        assert "echec du chargement" not in body_text

        # Vérifie qu'au moins une carte produit (lien /produit/...) est rendue.
        product_links = page.locator('a[href^="/produit/"], a[href^="/product/"]')
        await product_links.first.wait_for(state="visible", timeout=15_000)
        count = await product_links.count()
        assert count > 0, "No product cards rendered on mobile home"

        print(f"OK — {count} product card(s) rendered, no chunk error.")
        if errors:
            print("Console errors captured (non-fatal):", errors[:5])
        await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
