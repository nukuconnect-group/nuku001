import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assertEquals, assert } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY")!;
const TEST_EMAIL = Deno.env.get("TEST_USER_EMAIL");
const TEST_PASSWORD = Deno.env.get("TEST_USER_PASSWORD");

const FN_URL = `${SUPABASE_URL}/functions/v1/update-subscription`;

async function getJwt(): Promise<string | null> {
  if (!TEST_EMAIL || !TEST_PASSWORD) return null;
  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { data, error } = await client.auth.signInWithPassword({
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
  });
  if (error || !data.session?.access_token) return null;
  return data.session.access_token;
}

Deno.test("OPTIONS preflight returns CORS headers", async () => {
  const res = await fetch(FN_URL, { method: "OPTIONS" });
  await res.text();
  assertEquals(res.status, 200);
  assert(res.headers.get("access-control-allow-origin"));
  assert(
    (res.headers.get("access-control-allow-headers") ?? "").toLowerCase().includes("authorization"),
  );
});

Deno.test("Missing Authorization header returns 401", async () => {
  const res = await fetch(FN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: SUPABASE_ANON_KEY },
    body: JSON.stringify({ plan: "starter", billing_period: "monthly" }),
  });
  const body = await res.json();
  assertEquals(res.status, 401);
  assertEquals(body.error, "Non autorisé");
});

Deno.test("Invalid bearer token returns 401", async () => {
  const res = await fetch(FN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_ANON_KEY,
      Authorization: "Bearer invalid.token.value",
    },
    body: JSON.stringify({ plan: "starter", billing_period: "monthly" }),
  });
  await res.json();
  assertEquals(res.status, 401);
});

for (const plan of ["starter", "standard", "premium"] as const) {
  Deno.test(`Authenticated request validates ${plan} plan schema`, async () => {
    const jwt = await getJwt();
    if (!jwt) {
      console.warn(`⏭  Skipping ${plan}: TEST_USER_EMAIL/TEST_USER_PASSWORD not set`);
      return;
    }
    const res = await fetch(FN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${jwt}`,
      },
      // No payment_identifier → expect 400 "Paiement requis", NOT 401
      body: JSON.stringify({ plan, billing_period: "monthly" }),
    });
    const body = await res.json();
    // Accepted plan + valid JWT → must NOT be 401 anymore
    assert(res.status !== 401, `Got 401 for valid JWT on plan ${plan}: ${JSON.stringify(body)}`);
    // Either 200 (already activated path) or 400 (missing payment proof) is acceptable
    assert(
      [200, 400].includes(res.status),
      `Unexpected status ${res.status} for plan ${plan}: ${JSON.stringify(body)}`,
    );
  });
}
