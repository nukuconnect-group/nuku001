// Fetches a public URL and extracts <title>, meta tags, OG, Twitter and JSON-LD
// so the admin can see what crawlers actually receive.
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function pickAttr(tag: string, attr: string): string | null {
  const re = new RegExp(`${attr}\\s*=\\s*"([^"]*)"`, "i");
  const m = tag.match(re);
  if (m) return m[1];
  const re2 = new RegExp(`${attr}\\s*=\\s*'([^']*)'`, "i");
  const m2 = tag.match(re2);
  return m2 ? m2[1] : null;
}

function extract(html: string) {
  const head = (html.match(/<head[\s\S]*?<\/head>/i)?.[0]) || html;
  const title = head.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim() || null;
  const metas: Array<{ name?: string; property?: string; content?: string }> = [];
  const tagRegex = /<meta\b[^>]*>/gi;
  let m;
  while ((m = tagRegex.exec(head)) !== null) {
    const t = m[0];
    metas.push({
      name: pickAttr(t, "name") || undefined,
      property: pickAttr(t, "property") || undefined,
      content: pickAttr(t, "content") || undefined,
    });
  }
  const canonical = (() => {
    const linkRegex = /<link\b[^>]*rel\s*=\s*["']canonical["'][^>]*>/i;
    const tag = head.match(linkRegex)?.[0];
    return tag ? pickAttr(tag, "href") : null;
  })();
  const get = (key: string, kind: "name" | "property") =>
    metas.find(x => (x as any)[kind]?.toLowerCase() === key.toLowerCase())?.content || null;
  const jsonLd: unknown[] = [];
  const ldRegex = /<script[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let lm;
  while ((lm = ldRegex.exec(head)) !== null) {
    try { jsonLd.push(JSON.parse(lm[1].trim())); } catch { /* ignore */ }
  }
  return {
    title,
    description: get("description", "name"),
    keywords: get("keywords", "name"),
    robots: get("robots", "name"),
    canonical,
    og: {
      title: get("og:title", "property"),
      description: get("og:description", "property"),
      image: get("og:image", "property"),
      url: get("og:url", "property"),
      type: get("og:type", "property"),
    },
    twitter: {
      card: get("twitter:card", "name"),
      title: get("twitter:title", "name"),
      description: get("twitter:description", "name"),
      image: get("twitter:image", "name"),
    },
    jsonLd,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization") || "";
    if (!auth) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const supa = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: u } = await supa.auth.getUser(auth.replace("Bearer ", ""));
    if (!u?.user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const { data: roleRow } = await supa.from("user_roles").select("role").eq("user_id", u.user.id).eq("role", "admin").maybeSingle();
    if (!roleRow) return new Response(JSON.stringify({ error: "Admin only" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { url } = await req.json();
    if (!url || typeof url !== "string" || !/^https?:\/\//i.test(url)) {
      return new Response(JSON.stringify({ error: "URL invalide" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const resp = await fetch(url, {
      headers: { "User-Agent": "facebookexternalhit/1.1 (NukuConnect SEO Inspector)" },
      redirect: "follow",
    });
    const html = await resp.text();
    const tags = extract(html);
    return new Response(JSON.stringify({ success: true, status: resp.status, finalUrl: resp.url, tags }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
