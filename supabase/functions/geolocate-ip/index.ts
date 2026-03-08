import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get client IP from headers
    const clientIp =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("cf-connecting-ip") ||
      req.headers.get("x-real-ip") ||
      "unknown";

    // Use ip-api.com (free, no key needed, 45 req/min)
    const geoRes = await fetch(`http://ip-api.com/json/${clientIp}?fields=status,country,regionName,city`);
    const geo = await geoRes.json();

    if (geo.status === "success") {
      return new Response(
        JSON.stringify({ country: geo.country, region: geo.regionName, city: geo.city }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ country: null, region: null, city: null }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Geolocation error:", error);
    return new Response(
      JSON.stringify({ country: null, region: null, city: null }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
