# Migration du backend NukuConnect vers un projet Supabase externe

Ce document décrit la procédure complète d'export puis de restauration du backend
(schéma, données, comptes, fichiers, fonctions serveur) vers un projet Supabase que
vous possédez.

> ⚠️ **Important** : cette procédure **copie** le backend. Elle ne désactive pas le
> backend actuel — l'application continue de fonctionner dessus tant que vous n'avez
> pas basculé les variables d'environnement.

---

## 1. Ce qui est exporté

| Élément | Source | Fichier produit |
|---|---|---|
| Schéma (tables, index, contraintes) | `supabase/migrations/*.sql` (versionné) | `schema/*.sql` |
| Policies RLS | `pg_policies` | `schema/_rls_policies.txt` |
| Fonctions & triggers SQL | `pg_proc` | `schema/_functions.sql` |
| Données applicatives (74 tables) | schéma `public` | `data/<table>.csv` |
| Comptes utilisateurs + mots de passe | `auth.users` | `auth/users.csv` |
| Connexions Google / OAuth | `auth.identities` | `auth/identities.csv` |
| Buckets & inventaire fichiers | `storage.*` | `storage/buckets.csv`, `storage/objects.csv` |
| Fichiers binaires Storage | API Storage | via `scripts/export-storage.mjs` |
| Fonctions serveur (46) | `supabase/functions/` (versionné) | déjà dans le repo |

---

## 2. Étape 1 — Générer l'export

```bash
bash scripts/export-backend.sh
```

L'archive est écrite dans `/mnt/documents/supabase-export/` (téléchargeable depuis
l'interface). Vous pouvez aussi passer un dossier de sortie :
`bash scripts/export-backend.sh ./mon-export`.

> 🔐 `auth/users.csv` contient les **hash bcrypt** des mots de passe. Traitez ce
> fichier comme un secret : stockage chiffré, jamais dans un dépôt public.

Un export SQL natif de la base est également disponible sans script :
**Cloud → Advanced settings → Export data**.

---

## 3. Étape 2 — Créer le projet Supabase cible

1. Créez un projet sur votre compte Supabase (même région recommandée).
2. Notez : `Project URL`, `anon key`, `service_role key`, et le mot de passe Postgres.
3. Activez les extensions utilisées : `pg_cron`, `pg_net`, `pgmq`, `pgcrypto`, `uuid-ossp`.

---

## 4. Étape 3 — Restaurer le schéma

Depuis votre machine, avec la CLI Supabase :

```bash
supabase link --project-ref <votre-ref>
supabase db push          # rejoue les 210 migrations du dossier supabase/migrations
```

Vérifiez ensuite que les 74 tables ont bien RLS activée :

```sql
select tablename, rowsecurity from pg_tables
where schemaname = 'public' and rowsecurity = false;
-- doit renvoyer 0 ligne
```

---

## 5. Étape 4 — Restaurer les comptes (avant les données)

Les comptes doivent exister **avant** les données, car quasiment toutes les tables
référencent `auth.users(id)`.

```bash
npm i pg csv-parse
DEST_PG_URL="postgresql://postgres:MDP@db.<ref>.supabase.co:5432/postgres" \
EXPORT_DIR=./supabase-export \
node scripts/import-auth.mjs
```

Le script conserve les **UUID d'origine** et les **hash de mots de passe** : les
utilisateurs se reconnectent avec leurs identifiants existants, et toutes les clés
étrangères restent valides.

⚠️ Désactivez temporairement les triggers applicatifs sur `auth.users`
(`handle_new_user`) pendant l'import pour éviter la création de profils en double :

```sql
alter table auth.users disable trigger user_created_trigger;   -- avant
alter table auth.users enable  trigger user_created_trigger;   -- après
```

---

## 6. Étape 5 — Restaurer les données

Dans l'ordre des dépendances (parents avant enfants) :

```bash
for f in supabase-export/data/*.csv; do
  t=$(basename "$f" .csv)
  psql "$DEST_PG_URL" -c "\copy public.\"$t\" from '$f' with csv header" || echo "à rejouer : $t"
done
# rejouez une 2e fois la boucle pour les tables dont le parent n'existait pas encore
```

Puis réalignez les séquences éventuelles :

```sql
select setval(pg_get_serial_sequence(t, c), coalesce(max_val, 1))
from ( /* vos tables à colonnes séquentielles */ ) s;
```

---

## 7. Étape 6 — Restaurer le Storage

```bash
npm i @supabase/supabase-js
SRC_URL=<url-source>  SRC_SERVICE_KEY=<clé-source> \
DEST_URL=<url-cible>  DEST_SERVICE_KEY=<clé-cible> \
node scripts/export-storage.mjs
```

Le script recrée les 7 buckets avec leurs réglages (public/privé, limite de taille),
télécharge chaque fichier localement puis le réenvoie dans le projet cible.
Sans `DEST_*`, il se contente de télécharger.

Réappliquez ensuite les policies `storage.objects` : elles sont déjà incluses dans les
migrations rejouées à l'étape 3.

---

## 8. Étape 7 — Fonctions serveur, cron et secrets

```bash
supabase functions deploy --project-ref <votre-ref>   # déploie les 46 fonctions
```

À recréer manuellement dans le projet cible :

- **Secrets** des fonctions (clés Moneroo, Paygate, e-mail, IA…) — ils ne sont pas exportables.
- **Jobs pg_cron** (file d'e-mails, modération différée, publication SEO) : les URL et clés
  qu'ils contiennent sont propres au projet, à réécrire avec la nouvelle référence.
- **Webhooks** des prestataires de paiement : mettre à jour l'URL vers le nouveau projet.
- **Auth** : activer e-mail/mot de passe + Google, et déclarer l'URL de callback
  `https://<ref>.supabase.co/auth/v1/callback` côté Google Cloud Console.
- **Templates e-mail** et domaine d'envoi.

---

## 9. Étape 8 — Basculer l'application

Mettre à jour les variables d'environnement du front :

```
VITE_SUPABASE_URL=https://<ref>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<anon key>
VITE_SUPABASE_PROJECT_ID=<ref>
```

---

## 10. Contrôles de recette

- [ ] `select count(*) from auth.users` identique à la source (151)
- [ ] Nombre de lignes identique pour chaque CSV vs table cible
- [ ] Connexion e-mail/mot de passe d'un compte existant
- [ ] Connexion Google d'un compte existant (pas de doublon créé)
- [ ] Affichage d'une image produit (bucket public)
- [ ] Téléchargement d'un document de formation (bucket privé + RLS)
- [ ] Un paiement de test bout en bout
- [ ] Envoi d'un e-mail transactionnel
- [ ] Aucune table sans RLS

---

## 11. Points d'attention

- **Rejouer l'export juste avant la bascule** : toute donnée créée entre l'export et la
  mise en service serait perdue. Prévoyez une courte fenêtre de gel des écritures.
- **Ordre impératif** : schéma → comptes → données → fichiers → fonctions.
- **Le backend actuel n'est pas supprimé** par cette procédure. Le retirer du projet
  Lovable est une action irréversible et destructive, à ne faire qu'après recette complète.
