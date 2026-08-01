#!/usr/bin/env node
/**
 * scripts/import-auth.mjs
 *
 * Réimporte les comptes exportés (auth/users.csv + auth/identities.csv)
 * dans un projet Supabase externe, EN CONSERVANT :
 *   - le même UUID utilisateur (indispensable : toutes les tables y font référence)
 *   - le hash bcrypt du mot de passe (les utilisateurs gardent leur mot de passe)
 *   - les identités OAuth (Google) déjà liées
 *
 * S'exécute depuis votre machine, contre la base du projet CIBLE.
 *
 * Variables d'environnement :
 *   DEST_PG_URL   postgresql://postgres:MDP@db.<ref>.supabase.co:5432/postgres
 *   EXPORT_DIR    dossier contenant auth/users.csv (défaut ./supabase-export)
 *
 * Usage :
 *   npm i pg csv-parse
 *   DEST_PG_URL=... node scripts/import-auth.mjs
 */
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { parse } from "csv-parse/sync";
import pg from "pg";

const DEST_PG_URL = process.env.DEST_PG_URL;
const EXPORT_DIR = process.env.EXPORT_DIR || "./supabase-export";

if (!DEST_PG_URL) {
  console.error("❌ DEST_PG_URL est requis (chaîne de connexion Postgres du projet cible).");
  process.exit(1);
}

const readCsv = async (file) =>
  parse(await readFile(join(EXPORT_DIR, file)), { columns: true, skip_empty_lines: true });

const nn = (v) => (v === "" || v === undefined ? null : v);

const client = new pg.Client({ connectionString: DEST_PG_URL });
await client.connect();

const users = await readCsv("auth/users.csv");
const identities = await readCsv("auth/identities.csv");

console.log(`→ ${users.length} utilisateur(s), ${identities.length} identité(s)`);

let okUsers = 0;
for (const u of users) {
  try {
    await client.query(
      `insert into auth.users
         (instance_id, id, aud, role, email, phone, encrypted_password,
          email_confirmed_at, phone_confirmed_at, raw_user_meta_data, raw_app_meta_data,
          created_at, updated_at, last_sign_in_at, is_sso_user, is_anonymous,
          banned_until, deleted_at)
       values ('00000000-0000-0000-0000-000000000000', $1, 'authenticated', 'authenticated',
               $2, $3, $4, $5, $6, coalesce($7::jsonb,'{}'::jsonb), coalesce($8::jsonb,'{}'::jsonb),
               $9, $10, $11, coalesce($12::boolean,false), coalesce($13::boolean,false), $14, $15)
       on conflict (id) do nothing`,
      [
        u.id, nn(u.email), nn(u.phone), nn(u.encrypted_password),
        nn(u.email_confirmed_at), nn(u.phone_confirmed_at),
        nn(u.raw_user_meta_data), nn(u.raw_app_meta_data),
        nn(u.created_at), nn(u.updated_at), nn(u.last_sign_in_at),
        nn(u.is_sso_user), nn(u.is_anonymous), nn(u.banned_until), nn(u.deleted_at),
      ],
    );
    okUsers++;
  } catch (e) {
    console.error(`  ❌ user ${u.email || u.id}: ${e.message}`);
  }
}

let okIdent = 0;
for (const i of identities) {
  try {
    await client.query(
      `insert into auth.identities
         (id, user_id, provider, provider_id, identity_data, created_at, updated_at, last_sign_in_at)
       values ($1, $2, $3, $4, coalesce($5::jsonb,'{}'::jsonb), $6, $7, $8)
       on conflict do nothing`,
      [
        i.id, i.user_id, i.provider, i.provider_id || i.user_id,
        nn(i.identity_data), nn(i.created_at), nn(i.updated_at), nn(i.last_sign_in_at),
      ],
    );
    okIdent++;
  } catch (e) {
    console.error(`  ❌ identity ${i.provider}/${i.user_id}: ${e.message}`);
  }
}

await client.end();
console.log(`✅ ${okUsers} utilisateur(s) et ${okIdent} identité(s) importés.`);
