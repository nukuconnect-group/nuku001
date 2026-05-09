import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-moneroo-signature" };
const enc = new TextEncoder();
const hex = (buf: ArrayBuffer) => Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
async function sign(secret: string, payload: string) {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return hex(await crypto.subtle.sign("HMAC", key, enc.encode(payload)));
}
const safeEqual = (a: string, b: string) => a.length === b.length && [...a].every((ch, i) => ch === b[i]);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const raw = await req.text();
  const secret = Deno.env.get("MONEROO_WEBHOOK_SECRET") || Deno.env.get("MONEROO_SECRET_KEY") || "";
  const signature = req.headers.get("X-Moneroo-Signature") || req.headers.get("x-moneroo-signature") || "";
  if (!secret || !safeEqual(signature, await sign(secret, raw))) {
    return new Response(JSON.stringify({ error: "Signature invalide" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
  const payload = JSON.parse(raw || "{}");
  const paymentId = payload?.data?.id;
  const status = String(payload?.data?.status || payload?.event?.replace("payment.", "") || "pending").toLowerCase();
  if (paymentId) {
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    await admin.from("moneroo_transactions").update({ status: status === "completed" ? "success" : status, provider_response: payload?.data || payload, verified_at: new Date().toISOString(), completed_at: status === "success" ? new Date().toISOString() : null }).eq("payment_id", paymentId);
  }
  return new Response(JSON.stringify({ received: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
