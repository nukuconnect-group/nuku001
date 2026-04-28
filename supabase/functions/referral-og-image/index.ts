// Dynamic Open Graph image generator for affiliation links.
// URL: /functions/v1/referral-og-image?code=NUKUABCDEF
// Returns an SVG (served as image/svg+xml) showing the referrer's name + code.
//
// Used by the auth page meta tags so when someone shares a referral link
// (https://nukuconnect.com/auth?ref=CODE) on WhatsApp / Facebook / X,
// the preview shows a personalised image.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

const escapeXml = (s: string): string =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");

const initialsOf = (name: string): string => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "N";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const code = (url.searchParams.get("code") || "").trim().toUpperCase();

    let referrerName = "Un membre Nukuconnect";
    let safeCode = code || "NUKU";

    if (code) {
      const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
      const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

      const { data: ref } = await admin
        .from("referrals")
        .select("referrer_id, referral_code")
        .eq("referral_code", code)
        .maybeSingle();

      if (ref?.referrer_id) {
        safeCode = ref.referral_code;
        const { data: profile } = await admin
          .from("profiles")
          .select("full_name, business_name")
          .eq("user_id", ref.referrer_id)
          .maybeSingle();
        referrerName = profile?.business_name || profile?.full_name || referrerName;
      }
    }

    const initials = escapeXml(initialsOf(referrerName));
    const nameXml = escapeXml(referrerName.length > 36 ? referrerName.slice(0, 33) + "…" : referrerName);
    const codeXml = escapeXml(safeCode);

    // 1200x630 SVG — green/blue Nukuconnect palette
    const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#0b3d2e"/>
      <stop offset="0.55" stop-color="#13794f"/>
      <stop offset="1" stop-color="#0e4f8a"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.85" cy="0.15" r="0.7">
      <stop offset="0" stop-color="#facc15" stop-opacity="0.35"/>
      <stop offset="1" stop-color="#facc15" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <rect width="1200" height="630" fill="url(#glow)"/>

  <!-- Brand header -->
  <text x="80" y="100" fill="#bbf7d0" font-family="Inter, Arial, sans-serif" font-size="26" font-weight="600" letter-spacing="3">NUKUCONNECT · AFFILIATION</text>

  <!-- Avatar circle with initials -->
  <circle cx="170" cy="320" r="86" fill="#ffffff" fill-opacity="0.12" stroke="#bbf7d0" stroke-width="3"/>
  <text x="170" y="345" fill="#ffffff" font-family="Inter, Arial, sans-serif" font-size="62" font-weight="800" text-anchor="middle">${initials}</text>

  <!-- Headline -->
  <text x="290" y="270" fill="#ffffff" font-family="Inter, Arial, sans-serif" font-size="56" font-weight="800">${nameXml}</text>
  <text x="290" y="335" fill="#bbf7d0" font-family="Inter, Arial, sans-serif" font-size="34" font-weight="500">vous invite sur Nukuconnect</text>

  <!-- Code chip -->
  <rect x="290" y="370" rx="14" ry="14" width="${Math.min(660, 70 + codeXml.length * 22)}" height="64" fill="#ffffff" fill-opacity="0.14" stroke="#facc15" stroke-width="2"/>
  <text x="312" y="412" fill="#facc15" font-family="Menlo, Consolas, monospace" font-size="32" font-weight="700">CODE · ${codeXml}</text>

  <!-- Benefits row -->
  <g transform="translate(80,500)">
    <rect width="490" height="80" rx="16" fill="#ffffff" fill-opacity="0.12"/>
    <text x="32" y="38" fill="#facc15" font-family="Inter, Arial, sans-serif" font-size="34" font-weight="800">10%</text>
    <text x="110" y="34" fill="#ffffff" font-family="Inter, Arial, sans-serif" font-size="20" font-weight="600">sur les abonnements</text>
    <text x="110" y="60" fill="#bbf7d0" font-family="Inter, Arial, sans-serif" font-size="16">payants des filleuls</text>
  </g>
  <g transform="translate(610,500)">
    <rect width="510" height="80" rx="16" fill="#ffffff" fill-opacity="0.12"/>
    <text x="32" y="38" fill="#facc15" font-family="Inter, Arial, sans-serif" font-size="34" font-weight="800">2%</text>
    <text x="92" y="34" fill="#ffffff" font-family="Inter, Arial, sans-serif" font-size="20" font-weight="600">sur les achats</text>
    <text x="92" y="60" fill="#bbf7d0" font-family="Inter, Arial, sans-serif" font-size="16">des filleuls — à vie</text>
  </g>
</svg>`;

    return new Response(svg, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "image/svg+xml; charset=utf-8",
        // 5 min cache so social crawlers can refetch quickly when name changes
        "Cache-Control": "public, max-age=300, s-maxage=300",
      },
    });
  } catch (e) {
    console.error("referral-og-image error", e);
    return new Response("error", { status: 500, headers: corsHeaders });
  }
});
