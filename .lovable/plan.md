# Passe 6 — Plan complet

Découpage en deux vagues pour livrer vite et tester progressivement.

## Vague A — 4 chantiers critiques (priorité absolue)

### A1. Refonte module Réseaux
- Conserver structure et fonctionnalités existantes (profils Suppliers, Follow, filtres actuels)
- Header animé avec compteurs (Fournisseurs / Producteurs / Acheteurs vérifiés)
- Carrousels horizontaux Embla (Recommandés, Populaires, Nouveaux, Vérifiés, Récemment actifs)
- Cartes enrichies : photo, nom, activité, localisation, badge vérifié, compteurs (abonnés, produits), boutons Voir / Contacter / Suivre
- Filtres avancés (secteur, pays, région) — multi-select
- Section "Opportunités" (feed depuis `demands`)
- Carte géographique Leaflet des acteurs
- Animations Framer Motion subtiles

### A2. Email de confirmation de commande
- Auditer `moneroo-webhook` : vérifier l'invocation de `order-confirmation` après `payment.success`
- Vérifier template `order-confirmation` registré dans `TEMPLATES`
- Ajouter logs détaillés dans `email_send_log`
- Déclencher aussi à la création de commande COD si paiement à la livraison
- Email au vendeur (`new-order-seller`) en parallèle

### A3. Parrainage — compteurs et gains
- Auditer le flow `claim_referral` : le `localStorage` est perdu pendant confirmation email
- Solution : stocker le `ref` dans `user_metadata` au moment du signup (persistant)
- À la confirmation, trigger DB lit `user_metadata.referral_code` et crée la ligne `referrals`
- Vérifier jointure `referrals` ↔ `referral_earnings` ↔ `profiles` sur `Affiliation.tsx` et `AffiliationStatus.tsx`
- Corriger l'agrégation des gains (validés vs en attente)

### A4. Prix barré marketplace (promo)
- Créer composant `<PriceDisplay />` réutilisable
- Règle unique : si `original_price > price` OU `price_tiers` contient un prix < base → afficher
  `<span class="line-through text-muted-foreground">original</span> <span class="text-destructive font-bold">price</span>` + badge `-XX%`
- Appliquer dans : `ProductCard`, `ProductDetail`, `SimilarProducts`, `Marketplace`, `Favorites`, `Cart`

## Vague B — Correctifs dysfonctionnements

### B1. Messagerie : statut lu + compteur + suppression
- Auditer `useMessages` et `messageReadEvents` : le mark-as-read ne propage pas
- Forcer `UPDATE messages SET is_read=true WHERE conversation_id=X AND sender_id<>auth.uid()` à l'ouverture
- Invalider la query React Query du compteur immédiatement après
- Vérifier que le realtime listener décrémente bien
- Corriger la suppression : vérifier RLS DELETE policy sur `messages` et l'appel UI

### B2. Notifications : statut lu + compteur
- Idem : `UPDATE notifications SET is_read=true WHERE id=X AND user_id=auth.uid()` au clic
- Invalider la query du compteur
- Vérifier le badge `NotificationBell` en realtime

### B3. Modification produit — données vides
- Bug : le formulaire d'édition charge seulement l'image
- Corriger le composant d'édition pour pré-remplir TOUS les champs depuis `products` (titre, description, prix, quantité, catégorie, localisation, unité, price_tiers, etc.)
- Vérifier que l'UPDATE renvoie bien les données et invalide les caches

### B4. Rôle utilisateur — redirection "Mon Compte"
- Bug : certains Acheteurs voient un dashboard d'un autre rôle
- Auditer `ProfileContext` + `useResolvedUserType` + les guards de routes
- S'assurer que `profile.user_type` prime toujours sur les heuristiques (driver_profiles, etc.)
- Corriger la redirection dans Header "Mon Compte" pour pointer vers la bonne route selon `user_type`

### B5. Vérification générale web + mobile
- Tests manuels sur les 4 modules corrigés
- Vérifier realtime sur compteurs (messages, notifications)
- Vérifier RLS sur products UPDATE
- Pas d'écrans blancs

## Ordre d'exécution
1. **Vague A** (A1 → A4) en une réponse longue
2. **Vague B** (B1 → B5) en une seconde réponse

## Détails techniques

**A2 — webhook flow :**
```
moneroo-webhook → on payment.success
  → UPDATE orders SET status='paid'
  → supabase.functions.invoke('order-confirmation', { orderId })
  → supabase.functions.invoke('send-transactional-email', { templateName:'new-order-seller', ... })
```

**A3 — referral via user_metadata :**
```ts
// Auth.tsx signUp
options: { data: { referral_code: localStorage.getItem('nuku_ref') } }
// trigger handle_new_user lit raw_user_meta_data->>'referral_code'
```

**B1/B2 — invalidation immédiate :**
```ts
queryClient.invalidateQueries({ queryKey: ['unread-count'] });
```

Confirmez et j'enchaîne Vague A immédiatement.
