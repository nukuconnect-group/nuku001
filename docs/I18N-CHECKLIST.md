# Checklist de couverture i18n — Nukuconnect

Objectif : **toute page**, y compris les états de chargement IA, les tableaux et les pages de
résultats, doit rester dans la langue sélectionnée (fr, en, ewe, kab, wo).

## 1. Règles non négociables

| # | Règle | Contrôle |
|---|-------|----------|
| 1 | Aucune chaîne visible codée en dur — tout passe par `t("…")` | `src/test/i18n-audit.test.ts` |
| 2 | Toute clé `t("…")` utilisée existe dans le dictionnaire **fr** (pivot) | `src/__tests__/i18n-coverage.test.ts` |
| 3 | L'**anglais** couvre 100 % des clés utilisées | idem |
| 4 | Les langues locales (ewe, kab, wo) couvrent 100 % du **socle critique** : `nav.`, `common.`, `hero.`, `auth.`, `footer.`, `mp.`, `cart.` | idem |
| 5 | Aucune clé orpheline (présente dans une langue mais pas en fr) | idem |
| 6 | `document.documentElement.lang` suit la langue choisie | `LanguageContext` + E2E |
| 7 | La langue persiste à la navigation et au rechargement (`localStorage: nukuconnect-lang`) | E2E |

## 2. Surfaces à couvrir (à cocher pour toute nouvelle page)

- [ ] Titres, sous-titres, badges, libellés de boutons
- [ ] Placeholders d'inputs, options de `Select`, libellés d'onglets
- [ ] **États de chargement** (skeletons, « Analyse en cours… », loaders IA)
- [ ] **États vides** (« Aucun résultat », « Aucune commande »)
- [ ] **En-têtes de tableaux** et libellés de statut / badges de statut
- [ ] **Pages de résultats** (marketplace, recherche, localisation, recommandations IA)
- [ ] Messages d'erreur & toasts (`src/lib/i18nErrors.ts`)
- [ ] Métadonnées SEO par page (`<SEO>` : title/description)
- [ ] Formats : dates, devises, nombres (`Intl` avec la locale active)
- [ ] Contenu généré par l'IA : la langue active doit être transmise au prompt

## 3. Où ajouter une clé

1. `src/contexts/LanguageContext.tsx` → dictionnaire principal (5 langues).
2. `src/lib/i18nExtra.ts` → modules récents (préférences IA, localisation, Google Auth, admin).
3. Toujours ajouter **fr + en** en même temps ; les langues locales au minimum pour le socle critique.

## 4. Commandes de vérification

```bash
# Contrôles statiques (CI)
bunx vitest run src/__tests__/i18n-coverage.test.ts src/test/i18n-audit.test.ts

# Test de navigation complète, langue par langue
python3 tests/e2e/i18n-navigation.spec.py
```

Le test de navigation parcourt les routes publiques clés dans chaque langue, vérifie
`<html lang>`, l'absence de marqueurs de langue étrangère à la langue active et l'absence
de clés brutes non traduites (`home.xxx`) rendues à l'écran.

## 5. Statut connu

- fr / en : **100 %** des clés utilisées.
- ewe / kab / wo : socle critique **100 %** ; le bloc `home.*` (page d'accueil marketing)
  retombe volontairement en français — plancher anti-régression fixé à 50 % dans le test.
