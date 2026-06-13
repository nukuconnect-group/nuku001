# Plan — Passe 6 (multi-chantiers)

La demande regroupe ~8 chantiers indépendants. Je propose de les livrer en deux vagues pour éviter les régressions massives (la dernière refonte Réseaux est un gros morceau et doit être validée séparément).

## Vague A — Correctifs critiques (livrés en premier, 1 réponse)

1. **Header desktop en MAJUSCULES**
   - `Header.tsx` : ajouter `uppercase tracking-wide` sur les liens du menu desktop uniquement (mobile inchangé).

2. **"Suivre livraison" → "Suivre la commande"**
   - Renommer le label dans `Header.tsx`, `MobileBottomNav.tsx`, sidebar dashboard et traductions (`LanguageContext`).

3. **IA modération produits — accepter tout l'agricole + aquaculture**
   - `supabase/functions/moderate-content/index.ts` : élargir le prompt Gemini pour accepter :
     - Agriculture (cultures, élevage, intrants, semences, outils, matériel agricole)
     - Aquaculture (poissons, aquariums, alevins, équipement piscicole, aliments aquacoles)
     - Agroalimentaire transformé, apiculture, horticulture, sylviculture
   - Rejeter explicitement : BTP, formation (gérée ailleurs), électronique grand public, mode, etc.
   - Tester avec "aquarium" → doit passer.

4. **Email confirmation commande + reçu ne fonctionne pas**
   - Audit `order-confirmation` edge function + déclencheur dans `moneroo-webhook` / `Cart` checkout.
   - Vérifier `email_send_log` pour les derniers achats afin de localiser l'échec (template manquant, run_id, suppression).
   - Corriger le template `order-confirmation.tsx` ou le déclenchement pour qu'il s'enqueue après paiement validé.

5. **Marketplace — prix barré systématique si promo (2 prix)**
   - Audit composants d'affichage prix : `ProductCard`, `PriceTiersDisplay`, `EffectivePriceCalculator`, `SimilarProducts`, page `ProductDetail`, `Marketplace`, `Index` (sections featured).
   - Règle unique : si `original_price > price` OU si le produit a un `price_tiers` avec prix < base → afficher `<span class="line-through text-muted-foreground">{originalPrice}</span> <span class="text-destructive font-bold">{price}</span>` + badge `-XX%`.
   - Factoriser dans un helper `<PriceDisplay />` réutilisé partout.

6. **Parrainage — compteurs et gains ne remontent pas**
   - Audit `Affiliation.tsx`, `AffiliationStatus.tsx`, hook de stats, table `referrals` + `referral_earnings`.
   - Vérifier la jointure (filleuls activés vs en attente) et que le trigger d'activation insère bien dans `referral_earnings`.
   - Corriger la query côté client pour afficher : nb filleuls, nb activés, gains validés, gains en attente.

7. **Stats producteurs/fournisseurs (desktop)**
   - Aligner les chiffres affichés dans la section "Producteurs/Fournisseurs" du Header desktop avec les stats du slide promo (mêmes valeurs : ex. 3 567 / 3 567 ou valeurs réelles si dispo). Pas de duplication divergente.

## Vague B — Refonte module Réseaux (livrée après validation Vague A)

Refonte de `src/pages/Producers.tsx` en conservant l'existant :

- **Header stats** : "3 567 Fournisseurs · 3 567 Producteurs" (gros chiffres animés).
- **Carrousels horizontaux** (Embla Carousel déjà installé) :
  - Profils recommandés (IA matching)
  - Fournisseurs populaires (tri followers)
  - Producteurs populaires
  - Nouveaux membres (created_at desc)
  - Profils vérifiés (is_verified)
  - Récemment actifs (user_presence.last_seen)
- **Card enrichie** : photo, nom, activité, localisation, badge vérifié, "Voir profil", "Contacter", "Suivre", compteur abonnés/produits/ventes.
- **Filtres avancés** : secteur, pays, région, produits/services (Select multi).
- **Section Opportunités** : feed des demandes (`demands` table) avec CTA "Publier un besoin".
- **Carte géographique** : Leaflet (déjà utilisé) avec markers profils géolocalisés.
- **Badges multi-types** : Producteur/Fournisseur/Consultant/Acheteur vérifié.
- Animations Framer Motion (fade-in cards, hover scale).

> Note : "publications courtes / actualités / notation profils / appels" sont des chantiers profonds (nouvelles tables, RLS, UI) → je propose de les **scoper en passe 7** plutôt que les bâcler ici. À confirmer.

## Ordre d'exécution proposé

1. ✅ Réponse à ce plan
2. Vague A (1 réponse, ~7 fichiers + 1 edge function + 1 audit DB)
3. Vous validez → Vague B (refonte Réseaux, ~3-4 nouveaux composants)
4. Vous validez → Passe 7 (publications/notation/appels si souhaité)

**Confirmez-vous ce découpage ?** Ou voulez-vous tout en une seule réponse (risque élevé de régressions et de réponse trop longue) ?
