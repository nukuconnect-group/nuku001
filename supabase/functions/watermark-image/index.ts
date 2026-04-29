// deno-lint-ignore-file no-explicit-any
// Watermark proxy: fetches a remote image, burns the centered Nukuconnect
// watermark into the pixels, and returns it. Because the watermark is part
// of the image bytes, it survives download, screenshot, zoom, etc.
import { ImageMagick, initializeImageMagick, MagickFormat } from "https://deno.land/x/[email protected]/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

let magickReady: Promise<void> | null = null;
const ensureMagick = () => (magickReady ??= initializeImageMagick());

let logoBytes: Uint8Array | null = null;
const loadLogo = async () => {
  if (logoBytes) return logoBytes;
  const url = new URL("./_logo.png", import.meta.url);
  logoBytes = new Uint8Array(await Deno.readFile(url));
  return logoBytes;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const target = url.searchParams.get("url");
    if (!target) return new Response("missing url", { status: 400, headers: corsHeaders });

    // Only allow http(s)
    if (!/^https?:\/\//i.test(target)) {
      return new Response("invalid url", { status: 400, headers: corsHeaders });
    }

    // Fetch the source image
    const upstream = await fetch(target);
    if (!upstream.ok) {
      return new Response("upstream error", { status: 502, headers: corsHeaders });
    }
    const srcBytes = new Uint8Array(await upstream.arrayBuffer());

    await ensureMagick();
    const logo = await loadLogo();

    const out: Uint8Array = await new Promise((resolve, reject) => {
      try {
        ImageMagick.read(srcBytes, (img) => {
          // Cap big images to keep memory reasonable
          const MAX = 1600;
          let w = img.width, h = img.height;
          if (Math.max(w, h) > MAX) {
            const r = MAX / Math.max(w, h);
            w = Math.round(w * r);
            h = Math.round(h * r);
            img.resize(w, h);
          }

          ImageMagick.read(logo, (lg) => {
            // Logo ≈ 55% of image width, centered
            const targetW = Math.round(w * 0.55);
            const targetH = Math.round((lg.height / lg.width) * targetW);
            lg.resize(targetW, targetH);
            // Soft transparency for a watermark feel
            lg.evaluate(0 as any, 1 as any, "Multiply" as any, 0.55).catch?.(() => {});

            const x = Math.round((w - targetW) / 2);
            const y = Math.round((h - targetH) / 2);
            img.composite(lg, x, y, 4 /* Over */);

            img.quality = 86;
            img.write(MagickFormat.Jpeg, (data: Uint8Array) => resolve(data));
          });
        });
      } catch (e) {
        reject(e);
      }
    });

    return new Response(out, {
      headers: {
        ...corsHeaders,
        "Content-Type": "image/jpeg",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (e) {
    console.error("watermark-image error", e);
    return new Response("error", { status: 500, headers: corsHeaders });
  }
});
