import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assert, assertEquals, assertMatch } from "https://deno.land/std@0.224.0/assert/mod.ts";

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL") || Deno.env.get("SUPABASE_URL");
const ANON_KEY = Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY") || Deno.env.get("SUPABASE_ANON_KEY");

const endpoint = (params: Record<string, string>) => {
  assert(SUPABASE_URL, "SUPABASE_URL is required");
  const url = new URL(`${SUPABASE_URL}/functions/v1/share-og`);
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
  return url.toString();
};

const fetchText = async (url: string) => {
  const response = await fetch(url, { headers: ANON_KEY ? { apikey: ANON_KEY } : undefined });
  const text = await response.text();
  assertEquals(response.status, 200);
  return text;
};

const assertOgHtml = (html: string, expectedTitlePart: string) => {
  assertMatch(html, /<meta property="og:title" content="[^"]+" \/>/);
  assertMatch(html, /<meta property="og:description" content="[^"]+" \/>/);
  assertMatch(html, /<meta property="og:image" content="https?:\/\/[^\"]+" \/>/);
  assertMatch(html, /<meta name="twitter:card" content="summary_large_image" \/>/);
  assert(html.includes(expectedTitlePart), `Expected title to include ${expectedTitlePart}`);
  assert(!html.includes("supabase.co/functions/v1/share-og"), "Shared preview HTML must not expose technical function URLs");
};

Deno.test("share-og returns complete OG tags for product links, including fallback", async () => {
  const html = await fetchText(endpoint({ type: "product", id: "incubateur-moderne-clarias-togo" }));
  assertOgHtml(html, "Incubateur");
});

Deno.test("share-og returns complete OG tags for supplier profile links, including shop-name fallback", async () => {
  const html = await fetchText(endpoint({ type: "shop", id: "00000000-0000-4000-8000-000000000000", name: "Boutique Test NukuConnect" }));
  assertOgHtml(html, "Boutique Test NukuConnect");
});

Deno.test("share-og diagnostic reports title, description and image as present", async () => {
  const response = await fetch(endpoint({ type: "shop", name: "Boutique Diagnostic", format: "json" }), {
    headers: ANON_KEY ? { apikey: ANON_KEY } : undefined,
  });
  const text = await response.text();
  assertEquals(response.status, 200);
  const json = JSON.parse(text);
  assertEquals(json.meta.hasTitle, true);
  assertEquals(json.meta.hasDescription, true);
  assertEquals(json.meta.hasImage, true);
  assertEquals(json.twitter.card, "summary_large_image");
});