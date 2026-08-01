#!/usr/bin/env bash
# scripts/export-backend.sh
#
# Export complet du backend NukuConnect vers un projet Supabase externe.
#
#   1. Schéma        -> supabase/migrations/*.sql (déjà versionné dans le repo)
#   2. Données       -> un CSV par table du schéma public
#   3. Auth          -> auth.users + auth.identities (hash de mot de passe inclus)
#   4. Storage       -> inventaire des objets (chemins, buckets, tailles) + script de copie
#   5. Edge Functions-> supabase/functions/* (déjà versionné dans le repo)
#
# Prérequis : variables PG* définies (PGHOST, PGUSER, PGPASSWORD, PGDATABASE).
# Usage     : bash scripts/export-backend.sh [dossier_de_sortie]

set -euo pipefail

OUT="${1:-/mnt/documents/supabase-export}"
DATA_DIR="$OUT/data"
AUTH_DIR="$OUT/auth"
STORAGE_DIR="$OUT/storage"

if [ -z "${PGHOST:-}" ]; then
  echo "❌ PGHOST non défini — accès base indisponible dans cet environnement."
  exit 1
fi

mkdir -p "$DATA_DIR" "$AUTH_DIR" "$STORAGE_DIR"
echo "📦 Export vers $OUT"

# ---------------------------------------------------------------- 1. Schéma
echo "→ Schéma (migrations versionnées)"
mkdir -p "$OUT/schema"
cp -f supabase/migrations/*.sql "$OUT/schema/" 2>/dev/null || true
ls "$OUT/schema" | wc -l | xargs echo "  migrations copiées :"

# Vue lisible du schéma (colonnes, types, contraintes)
psql -At -c "
  select table_name || '.' || column_name || ' :: ' || data_type ||
         case when is_nullable='NO' then ' NOT NULL' else '' end ||
         coalesce(' DEFAULT ' || column_default, '')
  from information_schema.columns
  where table_schema='public'
  order by table_name, ordinal_position
" > "$OUT/schema/_columns.txt"

psql -At -c "
  select schemaname||'.'||tablename||' | '||policyname||' | '||cmd||' | '||coalesce(qual,'-')||' | '||coalesce(with_check,'-')
  from pg_policies where schemaname='public' order by tablename, policyname
" > "$OUT/schema/_rls_policies.txt"

psql -At -c "
  select p.proname || E'\n' || pg_get_functiondef(p.oid) || E'\n---'
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public' and p.prokind in ('f','p')
  order by p.proname
" > "$OUT/schema/_functions.sql"

# ---------------------------------------------------------------- 2. Données
echo "→ Données (CSV par table)"
TABLES=$(psql -At -c "select tablename from pg_tables where schemaname='public' order by tablename")
for t in $TABLES; do
  psql -c "\copy (select * from public.\"$t\") to stdout with csv header" > "$DATA_DIR/$t.csv"
  printf '  %-40s %s lignes\n' "$t" "$(($(wc -l < "$DATA_DIR/$t.csv") - 1))"
done

# ---------------------------------------------------------------- 3. Auth
echo "→ Auth (utilisateurs + identités)"
psql -c "\copy (
  select id, email, phone, encrypted_password, email_confirmed_at, phone_confirmed_at,
         raw_user_meta_data, raw_app_meta_data, created_at, updated_at, last_sign_in_at,
         is_sso_user, is_anonymous, banned_until, deleted_at
  from auth.users order by created_at
) to stdout with csv header" > "$AUTH_DIR/users.csv"

psql -c "\copy (
  select id, user_id, provider, provider_id, identity_data, created_at, updated_at, last_sign_in_at
  from auth.identities order by created_at
) to stdout with csv header" > "$AUTH_DIR/identities.csv"

echo "  users      : $(($(wc -l < "$AUTH_DIR/users.csv") - 1))"
echo "  identities : $(($(wc -l < "$AUTH_DIR/identities.csv") - 1))"

# ---------------------------------------------------------------- 4. Storage
echo "→ Storage (inventaire)"
psql -c "\copy (select id, name, public, file_size_limit, allowed_mime_types from storage.buckets order by id) to stdout with csv header" \
  > "$STORAGE_DIR/buckets.csv"
psql -c "\copy (
  select bucket_id, name, (metadata->>'size')::bigint as size_bytes,
         metadata->>'mimetype' as mimetype, created_at
  from storage.objects order by bucket_id, name
) to stdout with csv header" > "$STORAGE_DIR/objects.csv"

echo "  buckets : $(($(wc -l < "$STORAGE_DIR/buckets.csv") - 1))"
echo "  objets  : $(($(wc -l < "$STORAGE_DIR/objects.csv") - 1))"

# ---------------------------------------------------------------- 5. Résumé
cat > "$OUT/MANIFEST.txt" <<EOF
Export backend NukuConnect
Généré le : $(date -u +"%Y-%m-%d %H:%M:%S UTC")

schema/            DDL : migrations, colonnes, policies RLS, fonctions SQL
data/              1 CSV par table du schéma public
auth/              utilisateurs et identités (hash bcrypt inclus — CONFIDENTIEL)
storage/           inventaire des buckets et objets (fichiers à copier séparément)

⚠️  auth/users.csv contient des hash de mots de passe. À traiter comme un secret.
Voir docs/MIGRATION-SUPABASE.md pour la procédure de restauration.
EOF

echo "✅ Export terminé : $OUT"
