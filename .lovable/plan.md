# Plan — Améliorations plateforme (6 axes)

Cette demande couvre 6 chantiers indépendants. Je propose de les livrer en **3 lots** priorisés pour éviter une PR géante et permettre validation intermédiaire.

---

## Lot 1 — Messagerie & produits tagués (axes 1, 2, 6)

**1.1 Aperçu produit dans le message prérempli**
- Étendre `chatDraft` pour stocker `productImage` en plus de `productId`/`name`/`url`.
- Dans `ChatArea`, afficher une **carte d'aperçu** (image + titre + lien) au-dessus de la zone de saisie tant que le brouillon est actif — style "reply preview" WhatsApp/Messenger.
- À l'envoi, insérer le message avec un champ `attachment` JSON (image_url + product_url + title) — nouvelle colonne `attachment jsonb` sur `messages` + rendu bulle riche (image + titre cliquable).
- Aucun envoi auto : le comportement reste "draft only, send on click".

**1.2 Notifications & lecture (axe 2)**
- `useMessages`: marquer `read_at=now()` dès qu'un message reçu entre dans le viewport (IntersectionObserver) — supprimer les cas où seul l'ouverture de la conversation compte.
- Ajouter menus contextuels : **Supprimer message** (soft delete `deleted_at`), **Supprimer notification** (delete row).
- Cliquer sur notification → route vers conversation + scroll au message ciblé (ancre `#msg-<id>`).
- Realtime : garantir que `postgres_changes` sur `messages` & `notifications` met à jour la liste sans reload (déjà en place, à consolider).

**1.3 UX messagerie WhatsApp-like (axe 6)**
- `Textarea` auto-grow (1 → 6 lignes max), zone de saisie sticky bas, contenu jamais tronqué.
- Bulles : `whitespace-pre-wrap break-words max-w-[85%]` + scroll fluide (`overflow-y-auto` + auto-scroll bas sur nouveau message).
- Statuts ✓/✓✓/✓✓ bleus rendus depuis `delivered_at`/`read_at`.
- Responsive : liste conversations en drawer sur mobile, split-view desktop.

---

## Lot 2 — Admin : Diagnostic & Supervision DB (axes 3, 4)

**2.1 Journal d'erreurs applicatif (`/admin/errors`)**
- Nouvelle table `app_error_logs` (message, stack, page, component, user_id, severity, meta jsonb, created_at) + RLS admin-only + GRANT.
- Hook global `ErrorBoundary` + `window.onerror`/`unhandledrejection` → insert via edge function `log-app-error`.
- UI admin : filtres (page/severity/user), détail (stack, contexte), suggestions basiques (ex : "ChunkLoadError → reload", "PGRST → check RLS").

**2.2 Supervision DB (`/admin/db-health`)**
- Edge function `db-health` (service_role) exposant : taille DB (`pg_database_size`), tables top-N (`pg_total_relation_size`), stats requêtes (`pg_stat_statements` si dispo), connexions actives (`pg_stat_activity`), slow queries.
- UI admin : cartes (taille, connexions, uptime), tableau top-tables, tableau slow queries, refresh 10s.

---

## Lot 3 — i18n complet (axe 5)

- Audit exhaustif : étendre `AUDITED_FILES` à **toutes** les pages/composants (`src/pages/**`, `src/components/**` hors tests).
- Migration systématique des chaînes FR restantes vers `t("...")` — Header, Footer, Home, formulaires, toasts, boutons, messages système.
- Ajout clés EN correspondantes dans `LanguageContext`.
- CI : test `i18n-audit` échoue si une chaîne FR littérale (regex ciblée) apparaît dans les fichiers audités.

---

## Détails techniques

**Nouvelles tables SQL**
```sql
-- messages.attachment
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS attachment jsonb;

-- app_error_logs
CREATE TABLE public.app_error_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  message text NOT NULL,
  stack text,
  page text,
  component text,
  severity text DEFAULT 'error',
  meta jsonb,
  created_at timestamptz DEFAULT now()
);
GRANT SELECT ON public.app_error_logs TO authenticated;
GRANT ALL ON public.app_error_logs TO service_role;
ALTER TABLE public.app_error_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins read errors" ON public.app_error_logs
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
```

**Edge functions**
- `log-app-error` (public, rate-limited) — insert client errors.
- `db-health` (admin-gated) — exécute requêtes `pg_stat_*`.

**Fichiers principaux modifiés**
- `src/components/messages/ChatArea.tsx`, `MessageBubble.tsx`, `ChatInput.tsx`
- `src/lib/chatDraft.ts`, `src/hooks/useMessages.ts`
- `src/pages/ProductDetail.tsx`
- `src/pages/admin/ErrorLogs.tsx` (nouveau), `src/pages/admin/DbHealth.tsx` (nouveau)
- `src/contexts/LanguageContext.tsx` (+ toutes pages restantes)
- `src/test/i18n-audit.test.ts`

---

## Questions avant démarrage

1. **Ordre** : je commence par **Lot 1** (messagerie — le plus visible pour vos utilisateurs), OK ?
2. **Suppression messages** : soft-delete ("Message supprimé") ou hard-delete (disparaît complètement) ?
3. **i18n Lot 3** : uniquement FR/EN, ou faut-il ajouter d'autres langues (ES, PT, AR) ?

Répondez oui/préférences et j'attaque Lot 1 immédiatement.