#!/usr/bin/env node
/**
 * scripts/export-storage.mjs
 *
 * Copie tous les fichiers Storage du projet source vers un dossier local,
 * puis (optionnellement) les réimporte dans le projet Supabase cible.
 *
 * Ce script s'exécute EN DEHORS de Lovable, depuis votre machine, car il
 * requiert une clé service_role.
 *
 * Variables d'environnement :
 *   SRC_URL   / SRC_SERVICE_KEY   projet source
 *   DEST_URL  / DEST_SERVICE_KEY  projet cible (optionnel : sans ça, download seul)
 *   OUT_DIR                       dossier local (défaut ./storage-export)
 *
 * Usage :
 *   npm i @supabase/supabase-js
 *   SRC_URL=... SRC_SERVICE_KEY=... node scripts/export-storage.mjs
 */
import { createClient } from "@supabase/supabase-js";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

const SRC_URL = process.env.SRC_URL;
const SRC_KEY = process.env.SRC_SERVICE_KEY;
const DEST_URL = process.env.DEST_URL;
const DEST_KEY = process.env.DEST_SERVICE_KEY;
const OUT_DIR = process.env.OUT_DIR || "./storage-export";

if (!SRC_URL || !SRC_KEY) {
  console.error("❌ SRC_URL et SRC_SERVICE_KEY sont requis.");
  process.exit(1);
}

const src = createClient(SRC_URL, SRC_KEY, { auth: { persistSession: false } });
const dest = DEST_URL && DEST_KEY
  ? createClient(DEST_URL, DEST_KEY, { auth: { persistSession: false } })
  : null;

/** Liste récursive des objets d'un bucket. */
async function listAll(client, bucket, prefix = "") {
  const out = [];
  let offset = 0;
  for (;;) {
    const { data, error } = await client.storage
      .from(bucket)
      .list(prefix, { limit: 1000, offset, sortBy: { column: "name", order: "asc" } });
    if (error) throw new Error(`${bucket}/${prefix}: ${error.message}`);
    if (!data?.length) break;
    for (const entry of data) {
      const path = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.id === null) out.push(...(await listAll(client, bucket, path)));
      else out.push(path);
    }
    if (data.length < 1000) break;
    offset += data.length;
  }
  return out;
}

const { data: buckets, error: bucketErr } = await src.storage.listBuckets();
if (bucketErr) throw bucketErr;

let total = 0;
let failed = 0;

for (const bucket of buckets) {
  console.log(`\n📦 Bucket ${bucket.name} (${bucket.public ? "public" : "privé"})`);

  if (dest) {
    const { error } = await dest.storage.createBucket(bucket.name, {
      public: bucket.public,
      fileSizeLimit: bucket.file_size_limit ?? undefined,
      allowedMimeTypes: bucket.allowed_mime_types ?? undefined,
    });
    if (error && !/already exists/i.test(error.message)) {
      console.warn(`  ⚠️  création bucket cible : ${error.message}`);
    }
  }

  const paths = await listAll(src, bucket.name);
  console.log(`  ${paths.length} objet(s)`);

  for (const path of paths) {
    try {
      const { data: blob, error } = await src.storage.from(bucket.name).download(path);
      if (error) throw error;
      const buf = Buffer.from(await blob.arrayBuffer());

      const local = join(OUT_DIR, bucket.name, path);
      await mkdir(dirname(local), { recursive: true });
      await writeFile(local, buf);

      if (dest) {
        const { error: upErr } = await dest.storage
          .from(bucket.name)
          .upload(path, buf, { contentType: blob.type || "application/octet-stream", upsert: true });
        if (upErr) throw upErr;
      }
      total++;
      if (total % 50 === 0) console.log(`  … ${total} fichiers traités`);
    } catch (e) {
      failed++;
      console.error(`  ❌ ${bucket.name}/${path}: ${e.message}`);
    }
  }
}

console.log(`\n✅ ${total} fichier(s) exporté(s)${dest ? " et réimporté(s)" : ""}, ${failed} échec(s).`);
