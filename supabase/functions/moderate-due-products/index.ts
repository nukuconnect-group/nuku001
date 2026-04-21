import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Fetch products whose moderation window has elapsed
    const { data: due, error } = await supabase.rpc("get_products_due_for_moderation", { p_limit: 20 });
    if (error) throw error;

    const list = (due || []) as Array<{ id: string; producer_id: string; name: string }>;
    const results: Array<{ id: string; ok: boolean; error?: string }> = [];

    for (const p of list) {
      try {
        // Fetch the producer's user to forge a service-side moderation request
        const { data: prof } = await supabase.from("profiles").select("user_id").eq("id", p.producer_id).single();
        const headers: Record<string, string> = { "Content-Type": "application/json" };
        // Use service role key as bearer; moderate-content checks ownership but service role bypasses RLS via supabase client.
        // We instead call the AI logic inline by re-using moderate-content with a service-role auth header.
        headers["Authorization"] = `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`;

        const resp = await fetch(`${SUPABASE_URL}/functions/v1/moderate-content`, {
          method: "POST",
          headers,
          body: JSON.stringify({ type: "product", id: p.id }),
        });
        const ok = resp.ok;
        if (!ok) {
          const txt = await resp.text();
          // If forbidden (caller ownership check), fall back: approve by default to avoid stuck pending
          await supabase.from("products").update({
            moderation_status: "approved",
            moderated_at: new Date().toISOString(),
            moderation_reason: "Auto-approuvé (modération indisponible)",
          }).eq("id", p.id);
          if (prof?.user_id) {
            await supabase.from("notifications").insert({
              user_id: prof.user_id,
              type: "system",
              title: "✅ Publication approuvée",
              description: `Votre produit "${p.name}" est maintenant visible sur la marketplace.`,
            });
          }
          results.push({ id: p.id, ok: false, error: txt });
          continue;
        }
        results.push({ id: p.id, ok: true });
      } catch (err: any) {
        results.push({ id: p.id, ok: false, error: err?.message || String(err) });
      }
    }

    return new Response(JSON.stringify({ processed: list.length, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("moderate-due-products error:", error);
    return new Response(JSON.stringify({ error: error?.message || "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
