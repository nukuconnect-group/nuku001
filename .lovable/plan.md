# Plan global — corrections NukuConnect (un seul lot)

Vu l'ampleur (13 chantiers, ~40 fichiers, 2 migrations DB, 1 image AI, 1 edge function), je regroupe par domaine et livre en parallèle. Voici exactement ce qui sera fait — confirme et je lance.

## A. Achat & Paiement (CRITIQUE)
- **Achat direct sans panier** : `ProductDetail.tsx` — bouton « Acheter » déclenche directement `openMonerooPay()` avec l'item courant, sans passer par le panier. Fallback : ajout au panier puis checkout si l'utilisateur préfère.
- **Confirmation de commande responsive** : `PaymentCallback.tsx` — refonte mobile, boutons « Facture » / « Refaire la commande » en `flex-wrap`, icônes `shrink-0`, padding adapté.
- **Factures** : `Invoices.tsx` — corriger requête (joindre `orders` + `profiles` côté authentifié), supprimer message d'erreur générique, fallback skeleton.

## B. Commandes (Acheteur / Fournisseur / Admin)
- Onglets Tabs : **Toutes / En cours / Terminées / Échouées / Annulées** dans `MesCommandes.tsx`, `Dashboard.tsx` (vendeur), `AdminDashboard.tsx`.
- Filtrage automatique par `status` (`pending|processing|shipped|delivered|failed|cancelled`).
- Bouton **« Relancer le paiement »** sur les commandes `failed` → réutilise `openMonerooPay` avec l'`order_id` existant.
- **Renommer** « Suivre mes livraisons » → « Suivre mes commandes » partout (sidebar, MobileBottomNav, routes labels).

## C. Header Slider & stats
- **Nouvelle slide Togo Top Impact 2025** : image éditée via `imagegen--edit_image` (recadrage 16:9, overlay), CTA → `/blog/nukuconnect-meilleure-innovation-togo-top-impact-2025`.
- **Nouvelle slide Livraison internationale** : image cargo générée, texte « Livraisons rapides à l'international ».
- **Slide 3 (conducteur moto)** : régénérer via `imagegen--edit_image` pour retirer le téléphone et placer les deux mains sur le guidon.
- **Stats mobile** : 2 345 Fournisseurs / 4 567 Acheteurs en **minimum garanti** (`Math.max(real, baseline)`) — appliqué dans `HeaderPromoSlider`, `Producers.tsx` (Réseaux), `TrustNetworkSection` (page accueil).
- **Blog post Togo Top Impact** : utiliser la nouvelle image comme thumbnail de carte (table `blog_posts` ou data statique selon l'implémentation).

## D. Réseaux & profils fournisseurs
- **Layout cassé profil fournisseur** : auditer `ProducerProfile.tsx` — supprimer composant fautif (probablement un fallback erreur), garantir layout cohérent.
- **Avatars harmonisés** : même composant `<Avatar>` / mêmes dimensions entre `SellerCard` et `ProducerProfile`.
- **Partage profil (OG)** : `ProducerProfile.tsx` — `<Helmet>` avec `og:image = shopImage`, `og:title = "Découvrez ma boutique sur NukuConnect"`, `og:description` personnalisé.
- **QR Code** : composant `ShareDialog` — afficher QR (lib `qrcode.react` déjà ou à ajouter) pointant vers `producerShopUrl()`.

## E. Marketplace — prix promo
- `ProductCard.tsx` + `ProductDetail.tsx` : si `promo_price && promo_price < price` → afficher prix barré, prix promo, badge `-XX%`. Vérifier mapping DB (`promo_price` / `discount_price`).

## F. Rôles utilisateurs
- Bug Acheteur ↔ Apprenant : `useResolvedUserType.ts` + redirection post-login — vérifier la priorité (`user_type` de `profiles` doit primer sur l'enrôlement formation).
- Migration corrective si `profiles.user_type` est NULL pour des acheteurs existants.

## G. Devenir Fournisseur
- Refonte `BecomeSeller.tsx` inspirée image 2 (hero + texte fort, avantages, commissions, CTA).
- Processus de migration : update `profiles.user_type = 'fournisseur'` + redirection dashboard vendeur. Vérifier la fonction RPC ou edge function `update-subscription` / direct update.

## H. Parrainage / Affiliation
- Vérifier flux `?ref=CODE` : `Auth.tsx` (capture cookie) → `referrals` (insert à l'inscription) → `referral_earnings` (insert à l'achat/abonnement).
- Page `AffiliationStatus.tsx` : afficher filleuls / inscriptions validées / commissions / gains cumulés (query `referrals` + `referral_earnings`).
- Audit de la formule 10% sub / 3% achat (déjà en mémoire).

## I. Admin — Recherches
- `AdminDashboard.tsx` section recherche : query `search_queries` du jour, top mots-clés (group by `query`), graphique simple (Recharts).

## J. Migrations DB nécessaires
1. Backfill `profiles.user_type` pour acheteurs mal classés en apprenants.
2. Vérifier index sur `search_queries(created_at, query)` pour les stats admin.

## Fichiers touchés (estimation)
~35 fichiers : ProductDetail, ProductCard, MesCommandes, Dashboard, AdminDashboard, Invoices, PaymentCallback, HeaderPromoSlider, BecomeSeller, ProducerProfile, ShareDialog, AffiliationStatus, Auth, useResolvedUserType, MobileBottomNav, Sidebar/menu, Producers, TrustNetworkSection, BlogPost + 2 migrations + 3 images générées.

## Limites assumées (pour tenir en un lot)
- **QR code** : composant standard, pas de personnalisation logo.
- **Stats admin recherche** : tableau + top 10, sans graphique temporel avancé.
- **Page BecomeSeller** : refonte inspirée image 2 (composition, ton) mais avec photo agricole africaine pertinente (pas la photo Amazon).
- **Test e2e du paiement** : je vérifie le code + logs de l'edge function, mais le test live dépend du compte Moneroo.

Confirme « Go » et je lance toutes les modifications en parallèle dans la foulée.
