// Test: re-invoking moderate-content on an already-moderated product
// must NOT re-send emails (idempotency guard).
import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assertEquals, assert } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.test("moderate-content: no email re-emission on already-moderated product", async () => {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    console.warn("Missing env vars — skipping test");
    return;
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  // 1. Find an already-moderated product (approved or rejected)
  const { data: products, error: pErr } = await admin
    .from("products")
    .select("id, name, moderation_status")
    .in("moderation_status", ["approved", "rejected"])
    .limit(1);

  assert(!pErr, `DB error: ${pErr?.message}`);
  assert(products && products.length > 0, "No already-moderated product found to test against");
  const product = products[0];

  // 2. Snapshot count of moderation emails sent for this product
  const idempotencyKey = `product-mod:${product.id}:${product.moderation_status}`;
  const { count: beforeCount, error: cErr } = await admin
    .from("email_send_log")
    .select("*", { count: "exact", head: true })
    .eq("template_name", "product-moderation")
    .filter("metadata->>idempotency_key", "eq", idempotencyKey);
  assert(!cErr, `Count error: ${cErr?.message}`);
  const before = beforeCount ?? 0;

  // 3. Re-invoke moderate-content via service role
  const res = await fetch(`${SUPABASE_URL}/functions/v1/moderate-content`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      apikey: SERVICE_ROLE_KEY,
    },
    body: JSON.stringify({ type: "product", id: product.id }),
  });
  const json = await res.json();

  assertEquals(res.status, 200, `Expected 200, got ${res.status}: ${JSON.stringify(json)}`);
  assertEquals(json.already_moderated, true, "Expected already_moderated=true");
  assertEquals(
    json.approved,
    product.moderation_status === "approved",
    "Returned approval flag must match stored status",
  );

  // 4. Wait briefly then assert no new email row was inserted
  await new Promise((r) => setTimeout(r, 1500));
  const { count: afterCount } = await admin
    .from("email_send_log")
    .select("*", { count: "exact", head: true })
    .eq("template_name", "product-moderation")
    .filter("metadata->>idempotency_key", "eq", idempotencyKey);
  const after = afterCount ?? 0;

  assertEquals(
    after,
    before,
    `Email was re-emitted! before=${before}, after=${after} for product ${product.id}`,
  );
});
