import watermarkLogo from "@/assets/nuku-watermark.png";

let cachedLogo: HTMLImageElement | null = null;

const loadLogo = (): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    if (cachedLogo) return resolve(cachedLogo);
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      cachedLogo = img;
      resolve(img);
    };
    img.onerror = reject;
    img.src = watermarkLogo;
  });

const fileToImage = (file: File): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(e);
    };
    img.src = url;
  });

/**
 * Apply a soft, professional Nukuconnect watermark to an image file.
 * The logo is placed in the bottom-right corner with low opacity and
 * a subtle blur for a "signed" look that survives downloads.
 */
export async function applyWatermark(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) return file;

  try {
    const [img, logo] = await Promise.all([fileToImage(file), loadLogo()]);

    // Cap very large photos to keep memory in check (mobile-safe)
    const MAX = 1600;
    let w = img.width;
    let h = img.height;
    if (Math.max(w, h) > MAX) {
      const r = MAX / Math.max(w, h);
      w = Math.round(w * r);
      h = Math.round(h * r);
    }

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;

    ctx.drawImage(img, 0, 0, w, h);

    // Watermark sized relative to the image (≈22% width)
    const targetW = Math.round(w * 0.22);
    const ratio = logo.height / logo.width;
    const targetH = Math.round(targetW * ratio);
    const margin = Math.round(Math.min(w, h) * 0.025);
    const x = w - targetW - margin;
    const y = h - targetH - margin;

    // Soft white plate behind the logo for legibility on any background
    ctx.save();
    ctx.globalAlpha = 0.18;
    ctx.fillStyle = "#ffffff";
    const pad = Math.round(targetW * 0.08);
    ctx.fillRect(x - pad, y - pad, targetW + pad * 2, targetH + pad * 2);
    ctx.restore();

    // Blurred logo pass (halo)
    ctx.save();
    ctx.globalAlpha = 0.35;
    (ctx as any).filter = "blur(2px)";
    ctx.drawImage(logo, x, y, targetW, targetH);
    ctx.restore();

    // Crisp logo pass on top
    ctx.save();
    ctx.globalAlpha = 0.55;
    (ctx as any).filter = "none";
    ctx.drawImage(logo, x, y, targetW, targetH);
    ctx.restore();

    const blob: Blob = await new Promise((resolve, reject) =>
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error("watermark failed"))),
        "image/jpeg",
        0.88
      )
    );

    const newName = file.name.replace(/\.(png|webp|heic|heif|jpe?g)$/i, "") + "-nuku.jpg";
    return new File([blob], newName, { type: "image/jpeg" });
  } catch (e) {
    console.warn("Watermark skipped:", e);
    return file;
  }
}
