// deno-lint-ignore-file no-explicit-any
// Watermark proxy: fetches a remote image, burns the centered Nukuconnect
// watermark into the pixel data, and returns the new image. Because the
// watermark is part of the bytes themselves, it remains visible after
// download, screenshot, zoom, sharing, etc.
import {
  ImageMagick,
  initializeImageMagick,
  MagickFormat,
  CompositeOperator,
} from "https://deno.land/x/[email protected]/mod.ts";

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

const burnWatermark = (src: Uint8Array, logo: Uint8Array): Promise<Uint8Array> =>
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
          const targetW = Math.round(w * 0.55);
          const targetH = Math.round((lg.height / lg.width) * targetW);
          lg.resize(targetW, targetH);

          const x = Math.round((w - targetW) / 2);
          const y = Math.round((h - targetH) / 2);
          img.composite(lg, x, y, CompositeOperator.Over);

          img.quality = 86;
          img.write(MagickFormat.Jpeg, (data) => resolve(new Uint8Array(data)));
        });
      });
    } catch (e) {
      reject(e);
    }
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const target = url.searchParams.get("url");
    if (!target || !/^https?:\/\//i.test(target)) {
      return new Response("invalid url", { status: 400, headers: corsHeaders });
    }

    const upstream = await fetch(target);
    if (!upstream.ok) {
      return new Response("upstream error", { status: 502, headers: corsHeaders });
    }
    const srcBytes = new Uint8Array(await upstream.arrayBuffer());

    await ensureMagick();
    const logo = await loadLogo();
    const out = await burnWatermark(srcBytes, logo);

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
