// deno-lint-ignore-file no-explicit-any
// Watermark proxy: fetches a remote image, burns the centered Nukuconnect
// watermark into the pixel data using Jimp (pure JS, no WASM, works in
// the Supabase Edge Runtime). Watermark size adapts to the image aspect
// ratio. Original mime type (jpeg / png) is preserved when possible.
// Errors are logged to public.watermark_error_logs for admin review.
import { Jimp } from "npm:jimp@1.6.0";
import { createClient } from "npm:@supabase/supabase-js@2";
import { LOGO_B64 } from "./_logo.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function b64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

function toArrayBuffer(u8: Uint8Array): ArrayBuffer {
  // Slice yields a fresh ArrayBuffer (Jimp accepts ArrayBuffer / Buffer only).
  return u8.buffer.slice(u8.byteOffset, u8.byteOffset + u8.byteLength) as ArrayBuffer;
}

let logoPromise: Promise<any> | null = null;
const loadLogo = async () => {
  if (!logoPromise) {
    logoPromise = Jimp.fromBuffer(toArrayBuffer(b64ToBytes(LOGO_B64)));
  }
  return await logoPromise;
};

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const adminClient = supabaseUrl && serviceKey ? createClient(supabaseUrl, serviceKey) : null;

async function logError(payload: {
  source_url: string | null;
  error_kind: string;
  error_message?: string;
  upstream_status?: number;
  duration_ms?: number;
}) {
  try {
    if (!adminClient) return;
    await adminClient.from("watermark_error_logs").insert(payload);
  } catch (e) {
    console.error("watermark log insert failed", e);
  }
}

type Fmt = { mime: "image/png" | "image/jpeg" };

function resolveFormat(reqFormat: string | null, contentType: string | null, target: string): Fmt {
  const want = (reqFormat || "").toLowerCase();
  const ct = (contentType || "").toLowerCase();
  const lowerUrl = target.toLowerCase();
  const isPng = want === "png" || ct.includes("png") || /\.png(\?|$)/.test(lowerUrl);
  // WebP/AVIF not natively supported by Jimp — fall back to JPEG output.
  if (isPng) return { mime: "image/png" };
  return { mime: "image/jpeg" };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const started = Date.now();
  const url = new URL(req.url);
  const target = url.searchParams.get("url");
  const reqFormat = url.searchParams.get("format");

  if (!target || !/^https?:\/\//i.test(target)) {
    await logError({ source_url: target, error_kind: "invalid_url" });
    return new Response("invalid url", { status: 400, headers: corsHeaders });
  }

  let upstreamStatus = 0;
  try {
    const upstream = await fetch(target);
    upstreamStatus = upstream.status;
    if (!upstream.ok) {
      await logError({
        source_url: target,
        error_kind: "upstream_error",
        upstream_status: upstreamStatus,
        duration_ms: Date.now() - started,
      });
      return new Response("upstream error", { status: 502, headers: corsHeaders });
    }
    const srcBytes = new Uint8Array(await upstream.arrayBuffer());
    const fmt = resolveFormat(reqFormat, upstream.headers.get("content-type"), target);

    const [img, logoOriginal] = await Promise.all([Jimp.read(srcBytes), loadLogo()]);

    // Cap size for memory
    const MAX = 1400;
    let w = img.bitmap.width;
    let h = img.bitmap.height;
    if (Math.max(w, h) > MAX) {
      const r = MAX / Math.max(w, h);
      w = Math.round(w * r);
      h = Math.round(h * r);
      img.resize({ w, h });
    }

    // Aspect-aware sizing relative to the shortest side
    const ratio = w / h;
    const pctOfShort = ratio > 1.4 ? 0.65 : ratio < 0.75 ? 0.7 : 0.6;
    const shortSide = Math.min(w, h);
    let targetW = Math.round(shortSide * pctOfShort);
    const logoRatio = logoOriginal.bitmap.height / logoOriginal.bitmap.width;
    let targetH = Math.round(targetW * logoRatio);
    if (targetW > w * 0.8) {
      targetW = Math.round(w * 0.8);
      targetH = Math.round(targetW * logoRatio);
    }
    if (targetH > h * 0.8) {
      targetH = Math.round(h * 0.8);
      targetW = Math.round(targetH / logoRatio);
    }

    // Clone + resize the logo so we don't mutate the cached one
    const logo = logoOriginal.clone();
    logo.resize({ w: targetW, h: targetH });

    const x = Math.round((w - targetW) / 2);
    const y = Math.round((h - targetH) / 2);

    img.composite(logo, x, y, { opacitySource: 0.55 } as any);

    const out: Uint8Array = await img.getBuffer(fmt.mime, fmt.mime === "image/jpeg" ? { quality: 86 } : undefined as any);

    return new Response(out, {
      headers: {
        ...corsHeaders,
        "Content-Type": fmt.mime,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("watermark-image error", msg);
    await logError({
      source_url: target,
      error_kind: "magick_failure",
      error_message: msg.slice(0, 500),
      upstream_status: upstreamStatus || undefined,
      duration_ms: Date.now() - started,
    });
    return new Response("error", { status: 500, headers: corsHeaders });
  }
});
