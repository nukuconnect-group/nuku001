import { useEffect, useRef, useState, useCallback } from "react";
import { watermarked } from "@/lib/watermarkUrl";
import watermarkLogo from "@/assets/nuku-watermark.png";

interface SmartWatermarkedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  /** Original (un-watermarked) source. Required. */
  originalSrc: string;
  /** ms before we fall back to the original image. Default 4000. */
  timeoutMs?: number;
  /** Width of the watermark relative to its container (0–1). Default 0.55. */
  watermarkScale?: number;
  /** Wrapper class (positioning is handled internally with `relative`). */
  wrapperClassName?: string;
}

/**
 * Renders a product image with a Nukuconnect watermark BURNED INTO
 * the pixel data via an off-screen canvas. This means:
 * - Right-click → Save image = watermark included
 * - Copy image = watermark included
 * - Drag & drop = watermark included
 * - Screenshot = watermark included
 *
 * Falls back to CSS overlay if canvas fails.
 */
const SmartWatermarkedImage = ({
  originalSrc,
  timeoutMs = 4000,
  watermarkScale = 0.55,
  wrapperClassName,
  className,
  onError,
  onLoad,
  alt,
  ...rest
}: SmartWatermarkedImageProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [canvasFailed, setCanvasFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const drawAttempted = useRef(false);

  // Try server-side watermarked URL first, fall back to original
  const wmUrl = watermarked(originalSrc);
  const [imgSrc, setImgSrc] = useState(wmUrl || originalSrc);
  const settledRef = useRef(false);

  useEffect(() => {
    settledRef.current = false;
    drawAttempted.current = false;
    setCanvasFailed(false);
    setLoaded(false);
    setImgSrc(wmUrl || originalSrc);
    if (!wmUrl || wmUrl === originalSrc) return;
    const t = window.setTimeout(() => {
      if (!settledRef.current) {
        settledRef.current = true;
        setImgSrc(originalSrc);
      }
    }, timeoutMs);
    return () => window.clearTimeout(t);
  }, [wmUrl, originalSrc, timeoutMs]);

  const burnWatermark = useCallback(() => {
    if (drawAttempted.current) return;
    drawAttempted.current = true;

    const canvas = canvasRef.current;
    if (!canvas) {
      setCanvasFailed(true);
      return;
    }

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const logo = new Image();
      logo.crossOrigin = "anonymous";
      logo.onload = () => {
        try {
          const w = img.naturalWidth;
          const h = img.naturalHeight;
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            setCanvasFailed(true);
            return;
          }

          // Draw original image
          ctx.drawImage(img, 0, 0, w, h);

          // Calculate watermark dimensions
          const targetW = Math.round(w * watermarkScale);
          const ratio = logo.naturalHeight / logo.naturalWidth;
          const targetH = Math.round(targetW * ratio);
          const x = Math.round((w - targetW) / 2);
          const y = Math.round((h - targetH) / 2);

          // Layer 1: blurred halo for depth
          ctx.save();
          ctx.globalAlpha = 0.15;
          (ctx as any).filter = "blur(3px)";
          ctx.drawImage(logo, x, y, targetW, targetH);
          ctx.restore();

          // Layer 2: crisp watermark
          ctx.save();
          ctx.globalAlpha = 0.35;
          (ctx as any).filter = "none";
          ctx.drawImage(logo, x, y, targetW, targetH);
          ctx.restore();

          setLoaded(true);
        } catch {
          setCanvasFailed(true);
        }
      };
      logo.onerror = () => setCanvasFailed(true);
      logo.src = watermarkLogo;
    };
    img.onerror = () => setCanvasFailed(true);
    // Use the resolved src (could be server-watermarked or original)
    img.src = imgSrc;
  }, [imgSrc, watermarkScale]);

  // Burn watermark once src settles
  useEffect(() => {
    if (imgSrc) {
      drawAttempted.current = false;
      setCanvasFailed(false);
      setLoaded(false);
      burnWatermark();
    }
  }, [imgSrc, burnWatermark]);

  // Canvas mode: watermark burned into pixels
  if (!canvasFailed) {
    return (
      <div className={`relative w-full h-full ${wrapperClassName ?? ""}`}>
        <canvas
          ref={canvasRef}
          className={className}
          style={{
            display: loaded ? "block" : "none",
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
          onContextMenu={(e) => {
            // Allow right-click — the watermark is baked in
          }}
        />
        {/* Show placeholder while canvas loads */}
        {!loaded && (
          <div className="w-full h-full bg-muted animate-pulse" />
        )}
      </div>
    );
  }

  // Fallback: CSS overlay (if canvas fails due to CORS etc.)
  return (
    <div className={`relative w-full h-full ${wrapperClassName ?? ""}`}>
      <img
        {...rest}
        src={imgSrc}
        alt={alt}
        className={className}
        onLoad={(e) => {
          settledRef.current = true;
          onLoad?.(e);
        }}
        onError={(e) => {
          if (!settledRef.current && imgSrc !== originalSrc) {
            settledRef.current = true;
            setImgSrc(originalSrc);
            return;
          }
          onError?.(e);
        }}
      />
      {/* CSS overlay fallback */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 flex items-center justify-center select-none z-10"
      >
        <img
          src={watermarkLogo}
          alt=""
          draggable={false}
          className="opacity-40"
          style={{
            width: `${watermarkScale * 100}%`,
            maxWidth: "75%",
            filter:
              "drop-shadow(0 1px 3px rgba(0,0,0,0.35)) drop-shadow(0 0 1px rgba(0,0,0,0.25))",
          }}
        />
      </div>
    </div>
  );
};

export default SmartWatermarkedImage;
