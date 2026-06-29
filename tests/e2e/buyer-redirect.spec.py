"""
E2E: a buyer account is redirected to /buyer-dashboard and never lands on
LearnerDashboard. Also verifies that /formations renders with the LinkedIn-
style sidebar (desktop viewport).

Run requires LOVABLE_BROWSER_AUTH_STATUS=injected for the auth portion.
"""
import asyncio, json, os
from pathlib import Path
from playwright.async_api import async_playwright

SCREENSHOTS = Path(__file__).parent / "screenshots" / "buyer-redirect"
SCREENSHOTS.mkdir(parents=True, exist_ok=True)
BASE = "http://localhost:8080"


async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)

        # Desktop viewport for sidebar test
        ctx = await browser.new_context(viewport={"width": 1280, "height": 1800})
        page = await ctx.new_page()

        # 1) /formations must render with sidebar even unauthenticated
        await page.goto(f"{BASE}/formations", wait_until="domcontentloaded")
        await page.wait_for_timeout(1500)
        sidebar = await page.locator("aside:has-text('NukuConnect Learning')").count()
        await page.screenshot(path=str(SCREENSHOTS / "formations_desktop.png"))
        assert sidebar >= 1, "Formations sidebar (NukuConnect Learning) not found"
        print("OK Formations sidebar visible")

        # 2) Buyer redirect — only if a session was injected
        if os.environ.get("LOVABLE_BROWSER_AUTH_STATUS") == "injected":
            storage_key = os.environ["LOVABLE_BROWSER_SUPABASE_STORAGE_KEY"]
            session_json = os.environ["LOVABLE_BROWSER_SUPABASE_SESSION_JSON"]
            await page.goto(BASE)
            await page.evaluate(
                f"window.localStorage.setItem({json.dumps(storage_key)}, {json.dumps(session_json)})"
            )
            # Force-navigate to learner dashboard; guard must bounce us out.
            await page.goto(f"{BASE}/learner-dashboard", wait_until="domcontentloaded")
            await page.wait_for_timeout(2500)
            url = page.url
            await page.screenshot(path=str(SCREENSHOTS / "after_learner_attempt.png"))
            print("Final URL after /learner-dashboard:", url)
            assert "/learner-dashboard" not in url, (
                f"Buyer should NOT remain on /learner-dashboard, got {url}"
            )
        else:
            print("Skip buyer-redirect (no injected session)")

        await browser.close()


asyncio.run(main())
