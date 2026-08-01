"""E2E i18n — navigation complète dans chaque langue.

Vérifie que la langue sélectionnée est respectée sur toutes les routes publiques :
- <html lang> correspond à la langue active
- aucune clé de traduction brute (ex: "home.ctaTitleBefore") rendue à l'écran
- en anglais, aucun marqueur français évident dans la navigation/pied de page

Usage: python3 tests/e2e/i18n-navigation.spec.py
"""

import asyncio
import json
import re
from pathlib import Path

from playwright.async_api import async_playwright

BASE = "http://localhost:8080"
SCREENSHOTS = Path(__file__).parent / "screenshots"
SCREENSHOTS.mkdir(parents=True, exist_ok=True)

ROUTES = [
    "/",
    "/marketplace",
    "/categories",
    "/producteurs",
    "/formations",
    "/nuku-ai",
    "/localiser",
    "/plans",
    "/panier",
    "/auth",
    "/aide",
    "/contact",
]

LANGS = {
    "fr": "fr",
    "en": "en",
    "ewe": "ee",
    "kab": "kab",
    "wo": "wo",
}

RAW_KEY = re.compile(r"\b(?:home|nav|sol|mp|cart|auth|footer|hero|common|loc|ai)\.[a-zA-Z][\w.]{2,}\b")
FR_MARKERS = ["Rechercher", "Panier", "Connexion", "Tableau de bord", "Accueil"]


async def check_lang(context, lang, html_lang, failures):
    page = await context.new_page()
    await page.goto(BASE, wait_until="domcontentloaded")
    await page.evaluate(f'window.localStorage.setItem("nukuconnect-lang", {json.dumps(lang)})')

    for route in ROUTES:
        await page.goto(BASE + route, wait_until="domcontentloaded")
        await page.wait_for_timeout(1200)

        actual_lang = await page.evaluate("document.documentElement.lang")
        if actual_lang != html_lang:
            failures.append(f"[{lang}] {route}: <html lang> = {actual_lang!r}, attendu {html_lang!r}")

        body = await page.evaluate("document.body.innerText")
        raw = sorted(set(RAW_KEY.findall(body)))
        if raw:
            failures.append(f"[{lang}] {route}: clés brutes affichées -> {raw[:5]}")

        if lang == "en":
            hits = [w for w in FR_MARKERS if w in body]
            if hits:
                failures.append(f"[{lang}] {route}: marqueurs FR restants -> {hits}")

    await page.screenshot(path=str(SCREENSHOTS / f"i18n_{lang}.png"))
    await page.close()


async def main():
    failures: list[str] = []
    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=True)
        context = await browser.new_context(viewport={"width": 1280, "height": 1800})
        for lang, html_lang in LANGS.items():
            await check_lang(context, lang, html_lang, failures)
        await browser.close()

    if failures:
        print("ÉCHEC couverture i18n :")
        for f in failures:
            print(" -", f)
        raise SystemExit(1)
    print(f"OK — {len(ROUTES)} routes x {len(LANGS)} langues respectent la langue sélectionnée.")


asyncio.run(main())
