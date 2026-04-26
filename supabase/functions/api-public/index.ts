// Public REST API authenticated by user-issued API keys (Bearer nuku_live_*)
// Endpoints: GET /products, GET /orders, GET /inventory
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

async function sha256Hex(s: string) {
  const buf = new TextEncoder().encode(s);
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const url = new URL(req.url);
  // strip /functions/v1/api-public prefix
  const path = url.pathname.replace(/^.*\/api-public/, "") || "/";
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";

  try {
    const auth = req.headers.get("authorization") || "";
    const token = auth.replace(/^Bearer\s+/i, "").trim();

    if (!token.startsWith("nuku_live_")) {
      return new Response(JSON.stringify({ error: "missing or invalid api key" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const hash = await sha256Hex(token);
    const { data: validation, error: vErr } = await admin.rpc("validate_api_key", { p_key_hash: hash });
    if (vErr || !validation || (validation as any[]).length === 0) {
      return new Response(JSON.stringify({ error: "invalid or revoked api key" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { user_id, api_key_id } = (validation as any[])[0];

    // Resolve profile
    const { data: profile } = await admin.from("profiles").select("id").eq("user_id", user_id).maybeSingle();
    if (!profile) {
      return new Response(JSON.stringify({ error: "no profile" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let status = 200;
    let body: any = { error: "not found" };

    if (req.method === "GET" && /^\/products\/?$/.test(path)) {
      const { data, error } = await admin.from("products").select("id, name, category, price, unit, quantity_available, stock_status, is_organic, created_at").eq("producer_id", profile.id).limit(200);
      if (error) { status = 500; body = { error: error.message }; }
      else body = { count: data?.length || 0, items: data || [] };
    } else if (req.method === "GET" && /^\/orders\/?$/.test(path)) {
      const { data, error } = await admin.from("orders").select("id, product_id, quantity, total_price, status, created_at").eq("seller_id", profile.id).order("created_at", { ascending: false }).limit(200);
      if (error) { status = 500; body = { error: error.message }; }
      else body = { count: data?.length || 0, items: data || [] };
    } else if (req.method === "GET" && /^\/inventory\/?$/.test(path)) {
      const { data, error } = await admin.from("products").select("id, name, quantity_available, stock_status").eq("producer_id", profile.id);
      if (error) { status = 500; body = { error: error.message }; }
      else body = { count: data?.length || 0, items: data || [] };
    } else if (req.method === "GET" && (path === "/" || path === "")) {
      body = { ok: true, name: "NukuConnect Public API", version: "v1", endpoints: ["/products", "/orders", "/inventory"] };
    } else {
      status = 404;
      body = { error: "endpoint not found", path };
    }

    // Log usage (fire and forget)
    try {
      await admin.rpc("log_api_call", {
        p_api_key_id: api_key_id,
        p_user_id: user_id,
        p_endpoint: path,
        p_method: req.method,
        p_status: status,
        p_ip: ip,
      });
    } catch { /* ignore */ }

    return new Response(JSON.stringify(body), {
      status, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "internal error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
