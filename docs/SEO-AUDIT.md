# Rapport d'audit SEO — NukuConnect

_Généré à partir du dernier scan SEO agent + validations locales._

## 1. Anomalies corrigées ce jour

| # | Anomalie | Fichier / Section concernée | Correction appliquée |
|---|----------|----------------------------|-----------------------|
| 1 | `<meta name="description">` trop longue (245 car., limite 160) | `index.html` — bloc `<head>` (ligne 7) | Réécrite en 145 car. : « Marketplace agricole intelligente d'Afrique : achetez et vendez avec des producteurs vérifiés, livraison intégrée, IA et formations. » |
| 2 | Canonique incohérente (`www.nukuconnect.com` ≠ `SITE_URL` du code = `nukuconnect.com`) | `index.html` — `<link rel="canonical">` (ligne 11) + tous les `og:url` | Toutes les URL absolues normalisées vers `https://nukuconnect.com` |
| 3 | `robots.txt` — directive `Sitemap:` pointait sur `www.nukuconnect.com` | `public/robots.txt` (ligne 11) | Alignée sur `https://nukuconnect.com/sitemap.xml` |
| 4 | `sitemap.xml` — 14 `<loc>` sur `www.nukuconnect.com` (mismatch canonique) | `public/sitemap.xml` (lignes 3-16) | Toutes les entrées migrées vers `https://nukuconnect.com` |
| 5 | Lien interne cassé `/help` → 404 | `src/pages/BuyerDashboard.tsx` ligne 619 | Corrigé en `/aide` (route existante) |

## 2. Anomalies restantes (à traiter séparément)

| # | Anomalie | Section | Détails |
|---|----------|---------|---------|
| A | Routes dynamiques absentes du sitemap : `/produit/:id`, `/producteurs/:name`, `/@:username`, `/formations/:id` | `public/sitemap.xml` | Nécessite un générateur `scripts/generate-sitemap.ts` qui interroge la BD (products, profiles, formations publiées). Non appliqué automatiquement — impact volumétrique important, à valider. |
| B | `FAQPage` JSON-LD manquant | `src/pages/FAQNukuAI.tsx` | Ajouter un `<script type="application/ld+json">` avec `@type: FAQPage` généré depuis `FAQS`. |
| C | Google Search Console non connecté | Config projet | Utiliser le connecteur `google_search_console` puis vérifier `https://nukuconnect.com/` via balise META. |
| D | `/llms.txt` absent | `public/llms.txt` | Fichier markdown résumant le site pour crawlers IA. |
| E | LCP lent + CLS élevé (Lighthouse) | Bannière Hero + polices | Ajouter `fetchpriority="high"` sur l'image LCP, `font-display: swap`, dimensions explicites. |

## 3. Prévention automatique — CI activée

Fichier : `.github/workflows/seo-routing-integrity.yml`

Exécuté sur **chaque push et chaque PR sur `main`** :

1. **`routes-integrity.test.ts`** (8 tests) — sitemap bien formé, hôte canonique unique, aucune entrée disallow par `robots.txt`, chaque URL du sitemap = un `<Route>` existant, routes critiques présentes, directive `Sitemap:` alignée, route catch-all présente.
2. **`share-og.e2e.test.ts`** (4 tests + 1 live opt-in `SHARE_OG_LIVE=1`) — garantit que `productCrawlerUrl` / `shopCrawlerUrl` visent l'edge function `share-og` et **jamais** `/share/...` ni la homepage. Le test live vérifie que l'edge renvoie du HTML OG réel avec `<meta http-equiv="refresh">` vers la page canonique.
3. **`SEO.social.test.tsx`** (3 tests) — balises OG / Twitter / JSON-LD produit avec canonique correcte.
4. **`geo.test.ts`** (21 tests) — Haversine + cache 24 h + fallback ville.
5. **`scripts/check-internal-links.mjs`** — parcourt les 344 fichiers `src/`, extrait tous les `to="/..."` et `href="/..."`, vérifie que chaque cible matche une `<Route>` déclarée dans `App.tsx`. Signale tout lien orphelin (déjà catch de `/help` cassé).
6. **`tsgo --noEmit`** — typecheck complet.

Total : **36 tests + 1 crawler + typecheck** — la CI casse au moindre retour en arrière.

## 4. Comment relancer le contrôle localement

```bash
node scripts/check-internal-links.mjs             # crawler liens internes
bunx vitest run src/__tests__/routes-integrity.test.ts
bunx vitest run src/__tests__/share-og.e2e.test.ts
SHARE_OG_LIVE=1 bunx vitest run src/__tests__/share-og.e2e.test.ts   # test live
```

## 5. Rappel important

Les crawlers (WhatsApp, Facebook) mettent en cache le premier aperçu qu'ils ont scrapé. Pour forcer le rafraîchissement d'un lien déjà partagé :
- Facebook / WhatsApp : [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/) → « Scrape Again »
- LinkedIn : [Post Inspector](https://www.linkedin.com/post-inspector/)
- X/Twitter : [Card Validator](https://cards-dev.twitter.com/validator)

Les nouveaux partages afficheront immédiatement les bonnes métadonnées.
