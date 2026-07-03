# Aperçus Open Graph avec URL propre — solution définitive

## Le conflit expliqué

L'application est un **SPA React** servi en statique. Les crawlers sociaux
(WhatsApp, Facebook, LinkedIn, Telegram, X) **n'exécutent pas JavaScript** :
ils ne voient donc jamais les balises `<Helmet>` injectées à l'exécution et
tombent sur les OG génériques de `index.html`.

L'Edge Function Supabase `share-og` retourne le bon HTML par produit / boutique,
mais son URL n'est **pas** `nukuconnect.com`.

L'hébergement Lovable ne permet pas de router selon le `User-Agent` au niveau
du domaine — il n'y a ni SSR ni rewrite conditionnel. C'est une limite
d'architecture, pas un bug applicatif.

## Solution — Cloudflare Worker (gratuit, 5 min)

Un Worker placé devant `nukuconnect.com` :

- détecte les crawlers sociaux ;
- proxifie leur requête vers l'Edge Function `share-og` (ils reçoivent le bon HTML) ;
- laisse passer les humains vers le SPA normal (ils voient l'URL propre).

Résultat : **URL propre affichée** + **aperçu OG parfait** partout.

## Étapes

1. Passer le DNS de `nukuconnect.com` par Cloudflare (plan gratuit).
2. Dans le dashboard Cloudflare → **Workers & Pages** → Create Worker.
3. Coller le script ci-dessous.
4. Onglet **Triggers** → Add Custom Domain → `nukuconnect.com`.
5. Une fois actif, mettre `VITE_CLOUDFLARE_OG_PROXY=true` dans les variables
   d'environnement du projet et redéployer. Les liens partagés seront alors
   `https://nukuconnect.com/produit/...` et l'aperçu fonctionnera partout.

## Script du Worker

```js
const OG_ORIGIN = "https://fpnhdihvnfsiymopbjgt.supabase.co/functions/v1/share-og";

// UA de crawlers sociaux qui doivent recevoir le HTML OG.
const CRAWLERS = [
  "facebookexternalhit", "facebot", "twitterbot", "linkedinbot",
  "slackbot", "telegrambot", "whatsapp", "discordbot", "pinterest",
  "skypeuripreview", "redditbot", "embedly", "vkshare", "quora",
  "outbrain", "nuzzel", "bitlybot", "google-inspectiontool",
  "applebot", "bingbot", "yandex", "duckduckbot", "baiduspider",
];

const isCrawler = (ua) => {
  const s = (ua || "").toLowerCase();
  return CRAWLERS.some((c) => s.includes(c));
};

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const ua = request.headers.get("user-agent") || "";

    // 1. Route produits : /produit/:slug ou /products/:slug
    const productMatch = url.pathname.match(/^\/(?:produit|products)\/([^\/?#]+)/i);
    if (productMatch && isCrawler(ua)) {
      const target = `${OG_ORIGIN}?type=product&id=${encodeURIComponent(productMatch[1])}`;
      return fetch(target, { headers: { "user-agent": ua } });
    }

    // 2. Route boutiques : /producteurs/:slug ou /shop/:slug
    const shopMatch = url.pathname.match(/^\/(?:producteurs|shop|producers)\/([^\/?#]+)/i);
    if (shopMatch && isCrawler(ua)) {
      const target = `${OG_ORIGIN}?type=shop&id=${encodeURIComponent(shopMatch[1])}`;
      return fetch(target, { headers: { "user-agent": ua } });
    }

    // 3. Tout le reste — humains, assets, pages internes — passe intact.
    return fetch(request);
  },
};
```

## Bascule dans le code

Une fois le Worker actif, activer le flag :

```
VITE_CLOUDFLARE_OG_PROXY=true
```

Le module `src/lib/shareOg.ts` détecte ce flag et renvoie l'URL propre au
lieu de l'URL Supabase pour les partages. Tant que le flag n'est pas mis, le
comportement actuel (URL Supabase) est conservé pour ne pas casser les aperçus.

## Vérification post-déploiement

Tester chaque URL avec un User-Agent de crawler :

```bash
curl -A "facebookexternalhit/1.1" -sSL https://nukuconnect.com/produit/xxx | grep -Ei 'og:(title|image|url|description)'
curl -A "facebookexternalhit/1.1" -sSL https://nukuconnect.com/producteurs/xxx | grep -Ei 'og:(title|image|url|description)'
```

Puis dans les débogueurs officiels :

- Facebook : <https://developers.facebook.com/tools/debug/>
- LinkedIn : <https://www.linkedin.com/post-inspector/>
- X (Twitter) : <https://cards-dev.twitter.com/validator>
- WhatsApp : envoyer le lien à un contact test et forcer un nouveau rendu en
  ajoutant `?v=2` la première fois.
