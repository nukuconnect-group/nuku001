# Checklist non-régression — Passe 3 (BecomeSeller / ProducerProfile / Affiliation)

Cette checklist est doublée de tests Vitest automatiques. Exécuter avec :

```bash
bunx vitest run src/pages/BecomeSeller.test.ts src/pages/Affiliation.test.ts src/lib/producerLinks.test.ts
```

## ✅ BecomeSeller (`src/pages/BecomeSeller.tsx`)
- 3 packs exposés : `free`, `pro`, `business` (test auto)
- Limites produits : 3 / 15 / 9999+ (test auto)
- Hero gradient présent avec 3 garanties (visuel)
- Formulaire activation → `activateMembership` (manuel : se connecter, choisir Pro, valider Moneroo redirect)

## ✅ ProducerProfile (`src/pages/ProducerProfile.tsx`)
- Hooks appelés avant les early returns (`useGeocodeLocation` en tête)
- `<SEO>` rendu avec OG `profile` (visible dans le head)
- `ShareDialog` : QR code visible (couleurs forcées `#0f172a` / `#ffffff`)
- 6 cibles de partage présentes (test auto via `shareTargets`)
- URL canonique boutique encode l'espace en `%20` (test auto)

## ✅ Affiliation (`src/pages/Affiliation.tsx` + `AffiliationStatus.tsx`)
- Commission abonnement = 10 %, achat = 2 % (test auto)
- Lien `?ref=CODE` encodé correctement (test auto, y compris caractères spéciaux)
- Retry RPC `claim_referral` au sign-in si code en localStorage (cf. `ProfileContext`)
- Page admin parrainage accessible via Marketing > Parrainage (KPI + journal)

## Tests manuels rapides
1. `/devenir-vendeur` → hero affiché, formulaire activable
2. `/producteurs/<nom>` → page charge sans crash, bouton partager → QR visible
3. `/affiliation` → code généré, lien copiable, KPI à 0 pour un nouveau compte
4. Admin > Marketing > Parrainage → tableau des codes + historique d'activation
