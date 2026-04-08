

# Plan: Corrections multiples, Blog, Affiliation, et améliorations UX

## Vue d'ensemble

Ce plan couvre 10 chantiers principaux demandés par l'utilisateur, regroupés par priorité.

---

## 1. Tableau de bord livreur : rendre la livraison opérationnelle

**Probleme**: Les produits s'affichent mais le livreur ne peut pas initier une livraison depuis l'onglet "Produits". Le bouton "Voir le produit" redirige simplement vers la page produit sans option de livraison.

**Corrections**:
- Dans le dialog `selectedProduct` du `DriverDashboard.tsx`, remplacer le bouton "Voir le produit" par un bouton **"Proposer une livraison"** qui crée une entrée dans `deliveries` avec statut `pending` et les coordonnées du produit comme point de collecte
- Ajouter un calcul automatique du `driver_fee` basé sur la distance (ex: 500 FCFA de base + 200 FCFA/km)
- Supprimer les `demoProducts` (lignes 58-64) et afficher uniquement les produits réels de la base de données. Si aucun produit n'existe, afficher un message "Aucun produit disponible"
- Le driver doit être `is_approved = true` pour pouvoir livrer — ajouter une logique d'auto-approbation temporaire ou un message clair "Compte en attente de vérification KYC"

**Fichiers**: `src/pages/DriverDashboard.tsx`

---

## 2. KYC pour les livreurs

**Nouveau**: Après inscription, le livreur doit soumettre ses documents KYC.

- Créer une migration pour la table `driver_kyc_submissions` (user_id, id_type, id_number, id_front_url, id_back_url, selfie_url, status, submitted_at, reviewed_at)
- Ajouter une section KYC dans le `DriverDashboard.tsx` qui s'affiche quand `is_approved = false`
- Formulaire avec upload de pièce d'identité (CNI/Permis), photo selfie
- Storage bucket `driver-kyc` pour les documents
- L'admin peut approuver via le tableau de bord admin

**Fichiers**: Migration SQL, `src/pages/DriverDashboard.tsx`, `src/pages/AdminDashboard.tsx`

---

## 3. Isolation des comptes par rôle

**Probleme**: Un apprenant voit le tableau de bord fournisseur. Le routage dans `Auth.tsx` (lignes 116-119) est correct mais le `Dashboard.tsx` ne vérifie pas le `user_type` et s'affiche pour tous.

**Corrections**:
- Dans `Dashboard.tsx`, ajouter une vérification au chargement : si `profile.user_type !== "producer" && profile.user_type !== "trainer"`, rediriger vers le bon tableau de bord
- Dans `BuyerDashboard.tsx`, vérifier que `profile.user_type === "buyer"` sinon rediriger
- Dans `DriverDashboard.tsx`, vérifier `profile.user_type === "driver"` sinon rediriger
- Dans `LearnerDashboard.tsx`, vérifier `profile.user_type === "learner"` sinon rediriger
- Ajouter un garde dans chaque tableau de bord pour éviter tout accès croisé

**Fichiers**: `src/pages/Dashboard.tsx`, `src/pages/BuyerDashboard.tsx`, `src/pages/DriverDashboard.tsx`, `src/pages/LearnerDashboard.tsx`

---

## 4. Module Affiliation : finalisation

**Corrections**:
- Élargir la page à pleine largeur : remplacer `max-w-5xl` par `max-w-7xl` dans `Affiliation.tsx`
- Corriger le lien de parrainage : dans `Auth.tsx`, vérifier que la mise à jour du `referrals` table fonctionne correctement (ligne 182-187) — actuellement le `.then()` ne vérifie pas si le update a réussi
- Ajouter un trigger SQL (ou logique edge function) pour créer automatiquement une entrée `referral_earnings` quand un filleul effectue un achat ou souscrit un abonnement

**Fichiers**: `src/pages/Affiliation.tsx`, `src/pages/Auth.tsx`, migration SQL pour trigger

---

## 5. Page Blog + Article "Togo Top Impact"

**Nouveau**: Créer une page `/blog` avec un premier article sur le prix NukuConnect.

- Créer `src/pages/Blog.tsx` avec une liste d'articles (données en dur pour commencer)
- Créer `src/pages/BlogPost.tsx` pour afficher un article individuel
- Premier article : "Togo Top Impact 2025 : NukuConnect sacré meilleure innovation de l'année" avec le contenu récupéré de l'article (date: 5 février 2026, image: `https://actu-togo.tg/wp-content/uploads/2026/02/e94cd754-4f38-46cd-829e-ee84411210b4.jpeg`)
- Ajouter les routes `/blog` et `/blog/:slug` dans `App.tsx`
- Ajouter "Blog" dans le header `navLinks`

**Fichiers**: `src/pages/Blog.tsx`, `src/pages/BlogPost.tsx`, `src/App.tsx`, `src/components/layout/Header.tsx`

---

## 6. Section "NukuConnect sacré meilleure innovation" sur l'accueil

- Ajouter une nouvelle section/bannière sur la page d'accueil (`Index.tsx`) avec un lien vers l'article de blog
- Intégrer dans le `HeroCarousel` ou créer un composant dédié avec l'image du prix et un CTA "Lire l'article"

**Fichiers**: `src/pages/Index.tsx`, nouveau composant ou intégration dans `HeroCarousel.tsx`

---

## 7. Supprimer les données de démonstration

- `DriverDashboard.tsx` : supprimer `demoProducts` (lignes 58-64), ne plus fallback sur les demo
- `Dashboard.tsx` (fournisseur) : vérifier et supprimer toute donnée de démo
- `AdminDashboard.tsx` : vérifier que toutes les stats sont des requêtes réelles (elles le sont déjà d'après le code)
- `BuyerDashboard.tsx` : vérifier et supprimer toute donnée de démo
- Section "Fournisseurs actifs" sur l'accueil : s'assurer qu'elle requête les vrais profils avec `user_type = "producer"`

**Fichiers**: `src/pages/DriverDashboard.tsx`, vérification des autres dashboards, composants accueil

---

## 8. Chat NukuConnect IA : augmenter la taille du texte

- Dans `NukuAI.tsx`, changer la classe du contenu des messages de `text-xs sm:text-sm` à `text-sm sm:text-base` (ligne 320)
- Augmenter aussi la taille du timestamp

**Fichiers**: `src/pages/NukuAI.tsx`

---

## 9. Recherche vocale, QR et image : vérifier le fonctionnement

- **Recherche vocale** (`VoiceSearchModal.tsx`) : le code est déjà implémenté avec l'API Web Speech. Vérifier que le `onResult` est bien connecté au champ de recherche du Header
- **Recherche par image** (`ImageSearchModal.tsx`) : le code appelle déjà l'edge function `image-search`. Vérifier que l'edge function est déployée et fonctionne
- **QR Scanner** (`QRScanner.tsx`) : vérifier le branchement
- S'assurer que les 3 boutons (mic, camera, QR) dans le Header déclenchent correctement les modales et que les résultats sont injectés dans la recherche

**Fichiers**: `src/components/layout/Header.tsx`, vérification des edge functions

---

## 10. Header desktop : améliorer le slide des boutons d'action

- Vérifier que la barre de navigation horizontale sur desktop défile correctement avec des animations fluides
- S'assurer que les liens de navigation sont bien visibles et accessibles

**Fichiers**: `src/components/layout/Header.tsx`

---

## Ordre d'implémentation

1. Isolation des comptes (critique, bug actif)
2. Supprimer données de démo (tous dashboards)
3. Driver dashboard : livraison opérationnelle + KYC
4. Affiliation pleine largeur + trigger gains
5. Blog + article Togo Top Impact
6. Section accueil innovation
7. Taille texte NukuConnect IA
8. Vérification recherche vocale/image/QR
9. Header desktop slide

