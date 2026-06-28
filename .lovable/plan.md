
# Plan d'action — 4 chantiers

Travail découpé en 4 lots indépendants. J'attaque dans l'ordre ci-dessous (bugs critiques d'abord, refonte UI ensuite).

---

## Lot 1 — Bug critique : redirection Acheteur (au lieu de Apprenant)

**Symptôme** : un compte Acheteur se connecte → arrive sur `LearnerDashboard` (apprenant). Doit cliquer sur Profil pour revenir au bon dashboard.

**Cause probable** : la logique de redirection post-login (dans `Auth.tsx` / `useResolvedUserType` / `App.tsx` `/dashboard`) choisit l'apprenant par défaut quand le rôle n'est pas encore hydraté, ou priorise un rôle apprenant inscrit accessoirement.

**Correctifs** :
- Auditer `src/hooks/useResolvedUserType.ts` et l'ordre de priorité des rôles (buyer > learner si les deux existent).
- Forcer dans `Auth.tsx` (callback de connexion) une redirection basée sur le **rôle principal** stocké en DB (`profiles.user_type` ou `user_roles`) au lieu d'un fallback apprenant.
- Ajouter un guard dans `LearnerDashboard` : si `user_type === 'buyer'`, rediriger automatiquement vers `/buyer-dashboard`.

---

## Lot 2 — Bug critique : Exprimer un besoin + génération IA

**Symptôme** : depuis BuyerDashboard, clic sur "Exprimer un besoin" → erreur. Et il faut pouvoir générer image + texte du besoin via IA.

**Correctifs** :
- Reproduire l'erreur (console + network) sur le bouton.
- Corriger l'insertion dans `demands` (vérifier colonnes obligatoires, RLS, payload).
- Garantir l'unicité de l'ID (UUID `gen_random_uuid()` côté DB déjà OK, mais ajouter un index UNIQUE explicite si manquant pour éviter les doublons de soumission par double-clic — debouncer le bouton + `idempotency_key`).
- Ajouter dans le formulaire de création :
  - Bouton "Générer le texte par IA" → appelle edge function `generate-product-description` (réutilisable) avec un prompt "besoin".
  - Bouton "Générer une image par IA" → nouvelle edge function `generate-demand-image` utilisant Lovable AI (`google/gemini-2.5-flash-image-preview`), upload vers storage, retourne URL.

---

## Lot 3 — Lien de partage sans URL Supabase

**Symptôme** : les liens partagés contiennent encore `fpnhdihvnfsiymopbjgt.supabase.co/functions/v1/share-og`. Doit rester en `nukuconnect.com/share/...` tout en gardant l'aperçu OG correct.

**Correctifs** :
- Dans `src/lib/shareOg.ts`, `productCrawlerUrl` / `shopCrawlerUrl` retournent actuellement `SHARE_OG_BASE` (supabase). Les remplacer par l'URL publique `${SITE_URL}/share/{type}/{slug}?…` (déjà couverte par `public/_redirects` qui proxy vers la function).
- Vérifier que le rewrite côté hébergeur fonctionne (sinon ajouter `vercel.json` / `public/_headers` adapté). Note : Lovable hosting fait du SPA fallback, donc `/share/*` doit être réécrit côté infra ou servi par une route catch-all qui re-fetch depuis l'edge.
- Solution robuste : remplacer `/share/...` par une mini-page qui rend les meta OG côté SPA + redirige humains — OU mieux, configurer Cloudflare/Lovable rewrites. Comme `public/_redirects` n'est pas pris en compte par Lovable hosting, je vais :
  1. Garder `shopCanonicalUrl` / `productCanonicalUrl` pour l'utilisateur (`nukuconnect.com/produit/...`).
  2. Pour les crawlers : utiliser un domaine personnalisé `share.nukuconnect.com` pointant sur l'edge function (nécessite config DNS user) **OU** masquer en gardant la version actuelle.
  - **Décision** : implémenter un proxy via `vercel.json` rewrites SI déployé Vercel ; sinon, créer une edge function `share` montée sur `nukuconnect.com` via le système de routing Lovable. À défaut, garder canonical Supabase mais raccourcir via redirect SPA `/s/:type/:id` qui sert directement des meta côté serveur. (Je vais d'abord investiguer la config d'hébergement réelle.)

---

## Lot 4 — Refonte Formation (style LinkedIn Learning) + onglets produit + historique commandes échouées + suivi commande

### 4a. Refonte module Formation
- Nouveau layout `Formations.tsx` + `FormationDetail.tsx` :
  - Sidebar gauche fixe : Home, My Library, Content, Hands-On, Certifications, Trending topics.
  - Hero personnalisé "Bonjour {prénom}, développez vos compétences avec NukuConnect Learning".
  - Carrousel "Top picks for {prénom}" (cartes formation pro avec badge Popular/Updated/durée).
- Utiliser composant `Sidebar` shadcn (déjà disponible).

### 4b. Onglets Description / Avis sur fiche produit
- Dans `ProductDetail.tsx`, transformer la section description + reviews en `Tabs` shadcn :
  - Onglet 1 : "Description produit" (titre H3 ajouté avant le texte).
  - Onglet 2 : "Avis" (`ReviewSection`).
- Alignement horizontal en haut, switch entre les deux.

### 4c. Historique commandes échouées / en cours dans l'icône Commandes
- Sur les dashboards (`BuyerDashboard`, `Dashboard`, etc.), l'icône Commandes affiche déjà les commandes. Étendre le query pour inclure les statuts `failed`, `pending`, `cancelled`, `processing` — avec badge couleur par statut.
- Ajouter filtre tabs : Toutes / En cours / Échouées / Livrées.

### 4d. Module "Suivre ma commande"
- Refonte du menu `TrackOrderHero` / `PublicDeliveryTracking` avec images pro, formulaire ID unique avec validation, message d'erreur clair si doublon ou introuvable.

---

## Détails techniques

- Stack : React 18 + Vite + Tailwind + shadcn + Supabase (Lovable Cloud).
- Edge functions : réutiliser `generate-product-description` ; créer `generate-demand-image` (Lovable AI image gen).
- Migrations DB : index UNIQUE sur `demands.idempotency_key` si manquant.
- Pas de modification de tables sensibles (orders, user_roles).

---

## Ordre d'exécution

1. **Lot 1** (redirection) — petit fix, impact immédiat.
2. **Lot 2** (Exprimer un besoin) — debug + IA.
3. **Lot 3** (partage sans supabase) — investigation hosting d'abord.
4. **Lot 4** (refonte UI Formation + onglets produit + commandes + suivi) — le plus gros, en dernier.

Confirme-moi si je peux démarrer dans cet ordre, ou si tu veux réordonner / retirer un lot.
