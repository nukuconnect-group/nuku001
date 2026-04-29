// deno-lint-ignore-file no-explicit-any
// Watermark proxy: fetches a remote image, burns a centered Nukuconnect
// watermark into the pixel data, and returns the new image. Watermark
// size adapts to the image aspect ratio (square / portrait / landscape).
// The original mime type (jpeg / png / webp) is preserved when possible.
// Errors are logged to public.watermark_error_logs for admin review.
import {
  ImageMagick,
  initializeImageMagick,
  MagickFormat,
  CompositeOperator,
} from "https://deno.land/x/imagemagick_deno@0.0.31/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// magick.wasm needs an absolute URL when running in Supabase Edge Runtime
// (relative `magick.wasm` lookups fail with "Invalid URL").
const WASM_URL = new URL("https://deno.land/x/imagemagick_deno@0.0.31/wasm/magick.wasm");
let magickReady: Promise<void> | null = null;
const ensureMagick = () => (magickReady ??= initializeImageMagick(WASM_URL));

let logoBytes: Uint8Array | null = null;
const loadLogo = async () => {
  if (logoBytes) return logoBytes;
  const url = new URL("./_logo.png", import.meta.url);
  logoBytes = new Uint8Array(await Deno.readFile(url));
  return logoBytes;
};

// Lazy admin client for error logging (uses service-role)
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

type Fmt = { magick: MagickFormat; mime: string; ext: string };

function resolveFormat(reqFormat: string | null, contentType: string | null, target: string): Fmt {
  const want = (reqFormat || "").toLowerCase();
  const ct = (contentType || "").toLowerCase();
  const lowerUrl = target.toLowerCase();

  const isPng = want === "png" || ct.includes("png") || /\.png(\?|$)/.test(lowerUrl);
  const isWebp = want === "webp" || ct.includes("webp") || /\.webp(\?|$)/.test(lowerUrl);

  if (isPng) return { magick: MagickFormat.Png, mime: "image/png", ext: "png" };
  if (isWebp) return { magick: MagickFormat.WebP, mime: "image/webp", ext: "webp" };
  return { magick: MagickFormat.Jpeg, mime: "image/jpeg", ext: "jpg" };
}

const burnWatermark = (src: Uint8Array, logo: Uint8Array, fmt: Fmt): Promise<Uint8Array> =>
  new Promise((resolve, reject) => {
    try {
      ImageMagick.read(src, (img) => {
        const MAX = 1600;
        let w = img.width;
        let h = img.height;
        if (Math.max(w, h) > MAX) {
          const r = MAX / Math.max(w, h);
          w = Math.round(w * r);
          h = Math.round(h * r);
          img.resize(w, h);
        }

        ImageMagick.read(logo, (lg) => {
          // Aspect-aware sizing: target a percentage of the SHORTEST side
          // so the watermark stays readable on portrait/landscape/square.
          const ratio = w / h;
          let pctOfShort: number;
          if (ratio > 1.4) {
            // landscape — slimmer logo, scaled to height
            pctOfShort = 0.65;
          } else if (ratio < 0.75) {
            // portrait — keep watermark compact relative to width
            pctOfShort = 0.7;
          } else {
            // square-ish
            pctOfShort = 0.6;
          }
          const shortSide = Math.min(w, h);
          let targetW = Math.round(shortSide * pctOfShort);
          let targetH = Math.round((lg.height / lg.width) * targetW);
          // Safety: never exceed 80% of either dimension
          if (targetW > w * 0.8) {
            targetW = Math.round(w * 0.8);
            targetH = Math.round((lg.height / lg.width) * targetW);
          }
          if (targetH > h * 0.8) {
            targetH = Math.round(h * 0.8);
            targetW = Math.round((lg.width / lg.height) * targetH);
          }
          lg.resize(targetW, targetH);

          const x = Math.round((w - targetW) / 2);
          const y = Math.round((h - targetH) / 2);
          img.composite(lg, x, y, CompositeOperator.Over);

          if (fmt.magick === MagickFormat.Jpeg) img.quality = 86;
          else if (fmt.magick === MagickFormat.WebP) img.quality = 88;

          img.write(fmt.magick, (data) => resolve(new Uint8Array(data)));
        });
      });
    } catch (e) {
      reject(e);
    }
  });

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

    await ensureMagick();
    const logo = await loadLogo();
    const out = await burnWatermark(srcBytes, logo, fmt);

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
