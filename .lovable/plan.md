# Plan — Enchaînement des lots restants

Suite au lot 1 (bugs critiques) déjà livré, voici l'exécution séquentielle des 3 lots restants.

---

## Lot 2 — UX Marketplace

**Géolocalisation automatique à la mise en vente**
- Sur le formulaire d'ajout/édition produit (`ProductFormDialog` / `ProductForm`) : bouton "📍 Utiliser ma position actuelle" qui appelle `navigator.geolocation.getCurrentPosition`
- Reverse-geocoding via une nouvelle edge function `reverse-geocode` (utilise Nominatim/OpenStreetMap, gratuit) → renvoie `country`, `city`, `quarter`
- Auto-remplissage des champs pays / ville / quartier + stockage `lat`/`lng` sur le produit
- Migration : ajouter colonnes `lat numeric`, `lng numeric` à `products` si absentes

**Estimation prix de livraison par distance**
- Helper `src/lib/deliveryPricing.ts` :
  - `calculateDeliveryFee(distanceKm)` → barème : base 500 FCFA + 100 FCFA/km, min 500, max 5000
- Sur la fiche produit + panier : afficher l'estimation dès qu'une adresse de livraison est sélectionnée (Haversine entre `product.lat/lng` et `address.lat/lng`)
- Mise à jour de `OrderSummary` pour afficher la ligne "Livraison estimée"

---

## Lot 3 — Boutique publique & partage

**Pages publiques `/@username` (déjà `/producteurs/:name` existe)**
- Nouvelle route `/@:username` (alias public, plus court à partager) → redirige vers `ProducerProfile` en résolvant par `profiles.username`
- Migration : ajouter colonne `username text unique` à `profiles` + index, + génération auto depuis email/business_name au signup
- Page `ProducerProfile` : section "Partager ma boutique" avec :
  - Bouton copier le lien `https://nukuconnect.com/@username`
  - QR code (lib `qrcode.react` déjà utilisée probablement, sinon `qrcode`) avec téléchargement PNG
  - Boutons partage WhatsApp / Facebook / Twitter / X / LinkedIn

**Liens partageables produit + OG**
- Sur `ProductDetail` : bloc "Partager" identique (copier lien, QR, boutons sociaux)
- Améliorer SEO `ProductDetail` : utiliser `product.image_url` comme `og:image`, titre = nom produit, JSON-LD `Product` complet (prix, stock, vendeur)
- Améliorer SEO `ProducerProfile` : `og:image` = logo/avatar vendeur, JSON-LD `Store`
- Edge function `referral-og-image` existe déjà → étendre pour produit/boutique si besoin

**QR codes formations**
- Idem sur `FormationDetail` : bouton partage + QR

---

## Lot 4 — Monétisation avancée

**Wallet vendeur + commission auto**
- Audit confirmé : table `withdrawals` existe + edge function `create-withdrawal` + `moneroo-webhook`
- Ajout : edge function `moneroo-webhook` doit créer une ligne dans une nouvelle table `wallet_movements` (credit vendeur après paiement Moneroo, débit commission plateforme)
- Migration : `wallet_movements (id, user_id, order_id, type [credit/debit/commission/withdrawal], amount, balance_after, created_at)` + RLS user-scoped + GRANTs
- Helper SQL fonction `get_wallet_balance(_user_id uuid)` → somme des mouvements
- UI `WithdrawalPanel` : afficher le solde calculé via cette fonction au lieu de l'ancienne logique

**Pixels publicitaires (Meta / TikTok / GA4 / GTM)**
- Migration : table `tracking_pixels (id, user_id, provider [meta|tiktok|ga4|gtm|snapchat], pixel_id, is_active)` RLS user-scoped
- Composant `<UserPixels />` monté dans `App.tsx` : si l'utilisateur a configuré ses pixels, injecte les scripts dans `<head>` via react-helmet-async
- Page admin/dashboard "Marketing & Pixels" pour CRUD des pixels

**Extension du programme d'affiliation aux produits/formations**
- L'affiliation existe déjà (abonnements 10% / achats 3%)
- Ajouter sur `ProductDetail` et `FormationDetail` un bouton "Lien d'affiliation" pour les utilisateurs connectés → génère `?ref=CODE`
- Le tracking `?ref=CODE` est déjà géré au signup → étendre pour tracker aussi sur achat produit / inscription formation (logique côté `Cart.tsx` et `enroll-paid-formation`)
- Migration : ajouter colonne `affiliate_code text` sur `orders` et `formation_payments` pour attribution

---

## Ordre d'exécution

1. Migration DB combinée (lots 2 + 3 + 4) en un seul appel
2. Edge functions : `reverse-geocode`, mise à jour `moneroo-webhook`
3. Frontend lot 2 (géoloc + delivery pricing)
4. Frontend lot 3 (pages publiques /@ + partage + QR + OG)
5. Frontend lot 4 (wallet UI + pixels UI + affiliation buttons)

---

## Détails techniques

- Bibliothèque QR : utiliser `qrcode` (déjà importée dans `OwnerBatchQRGenerator.tsx` probablement) — sinon `bun add qrcode @types/qrcode`
- Reverse-geocoding : Nominatim (gratuit, attribution OSM, User-Agent obligatoire)
- Haversine : implémentation maison, ~10 lignes
- Pas de nouveau secret requis (Nominatim sans clé)
- Pas de modification des fichiers Supabase auto-générés

**Volume estimé** : ~3 migrations, 2 nouvelles edge functions, ~15 fichiers frontend modifiés/créés.

Confirmes-tu pour démarrer l'exécution ?
