# Plan d'amélioration NukuConnect — 4 lots

## Lot 1 — Commandes & Notifications (nettoyage)
- Masquer les commandes au statut `failed`/`cancelled non payé` dans "Mes commandes" et dashboards.
- Bloquer les notifications "à confirmer" (vendeur) et "non confirmée" (acheteur) pour les commandes non payées/échouées (filtrer dans le trigger `handle_order_created` déjà conditionnel, étendre aux notifications de rappel).
- Ajouter boutons **Annuler** et **Supprimer** sur commandes côté acheteur (uniquement si pending non payée pour annuler, échouée/annulée pour supprimer).
- N'afficher que les achats payés/prélevés dans listings publics.

## Lot 2 — Page Cart / Checkout
- Calcul **distance réelle** fournisseur→adresse via Haversine sur coords (fin du kilométrage fictif).
- Géolocalisation "Ma position" auto (pays, ville) via reverse-geocode.
- Saisie adresse alternative : carte + champ texte (autocomplete).
- Section livreurs : message "Aucun livreur disponible — contactez le vendeur" + bouton chat direct.
- Retirer texte parasite "rapp" après Total.
- Responsive mobile (commande + page succès "Refaire une commande", suppression débordements).
- Retirer grille tarifaire, afficher prix réel calculé selon distance.

## Lot 3 — Marketplace & Produits
- ProductCard : ligne avis (étoiles + nombre) en plus du quick view.
- Badge **Nouveau** (au lieu de "News"), sans icône superflue.
- % réduction affiché sur les produits promo (déjà partiel, étendre aux listings).
- Formulaire vente : sélecteur unité de prix (kg, g, tonne, litre, carton, boîte, unité, sac…) + bouton **Générer description avec IA** (Gemini via Lovable AI Gateway).

## Lot 4 — Emails & Stats live
- Vérifier/réparer chaîne email post-commande :
  - `order-confirmation` → acheteur (détails)
  - `new-order-seller` → vendeur (notification)
  - Trigger d'envoi sur passage `confirmed`/`completed` (déployer fonction, vérifier queue).
- Email vers vendeur quand message chat tagué produit pour achat.
- Stats homepage (après header slide) : remplacer chiffres fictifs par requêtes live (`profiles` par user_type, produits, commandes) avec auto-refresh.

---

**Ordre d'exécution** : 1 → 2 → 3 → 4, je confirme à la fin de chaque lot avant de passer au suivant.
Réponds **"go"** pour lancer le Lot 1, ou indique un ordre/priorité différent.