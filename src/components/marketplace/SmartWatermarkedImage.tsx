import { useEffect, useRef, useState, useCallback } from "react";
import { watermarked } from "@/lib/watermarkUrl";
import watermarkLogo from "@/assets/nuku-watermark.png";

interface SmartWatermarkedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  originalSrc: string;
  timeoutMs?: number;
  watermarkScale?: number;
  wrapperClassName?: string;
}

/**
 * Renders a product image with the Nukuconnect watermark BURNED INTO
 * the canvas pixel data. Right-click save, copy, drag — all include the watermark.
 * Falls back to CSS overlay if canvas rendering fails (CORS).
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
  const [mode, setMode] = useState<"canvas" | "fallback">("canvas");
  const [canvasReady, setCanvasReady] = useState(false);
  const attemptIdRef = useRef(0);

  // Resolve src: try server watermark proxy, fallback to original
  const wmUrl = watermarked(originalSrc);
  const resolvedSrc = wmUrl || originalSrc;

  const burnWatermark = useCallback(
    (src: string, attemptId: number) => {
      const canvas = canvasRef.current;
      if (!canvas) { setMode("fallback"); return; }

      const tryDraw = (useCORS: boolean) => {
        const img = new Image();
        if (useCORS) img.crossOrigin = "anonymous";
        img.onload = () => {
          if (attemptIdRef.current !== attemptId) return;
          const logo = new Image();
          // Logo is local asset — no CORS issue
          logo.onload = () => {
            if (attemptIdRef.current !== attemptId) return;
            try {
              const w = img.naturalWidth || img.width;
              const h = img.naturalHeight || img.height;
              canvas.width = w;
              canvas.height = h;
              const ctx = canvas.getContext("2d");
              if (!ctx) { setMode("fallback"); return; }

              ctx.drawImage(img, 0, 0, w, h);

              // Test for CORS taint
              try { ctx.getImageData(0, 0, 1, 1); } catch {
                if (useCORS) {
                  // Retry without CORS
                  tryDraw(false);
                  return;
                }
                setMode("fallback");
                return;
              }

              const targetW = Math.round(w * watermarkScale);
              const ratio = logo.naturalHeight / logo.naturalWidth;
              const targetH = Math.round(targetW * ratio);
              const x = Math.round((w - targetW) / 2);
              const y = Math.round((h - targetH) / 2);

              // Halo layer
              ctx.save();
              ctx.globalAlpha = 0.15;
              try { (ctx as any).filter = "blur(3px)"; } catch { /* older browsers */ }
              ctx.drawImage(logo, x, y, targetW, targetH);
              ctx.restore();

              // Crisp layer
              ctx.save();
              ctx.globalAlpha = 0.35;
              try { (ctx as any).filter = "none"; } catch {}
              ctx.drawImage(logo, x, y, targetW, targetH);
              ctx.restore();

              setCanvasReady(true);
            } catch {
              setMode("fallback");
            }
          };
          logo.onerror = () => setMode("fallback");
          logo.src = watermarkLogo;
        };
        img.onerror = () => {
          if (attemptIdRef.current !== attemptId) return;
          if (useCORS) {
            // Retry without CORS header
            tryDraw(false);
          } else {
            setMode("fallback");
          }
        };
        img.src = src;
      };

      tryDraw(true);
    },
    [watermarkScale]
  );

  useEffect(() => {
    const id = ++attemptIdRef.current;
    setCanvasReady(false);
    setMode("canvas");
    burnWatermark(resolvedSrc, id);

    // Timeout: if canvas isn't ready, try original src
    const t1 = window.setTimeout(() => {
      if (attemptIdRef.current === id && !canvasReady) {
        // Try with original src if we were using proxy
        if (resolvedSrc !== originalSrc) {
          burnWatermark(originalSrc, id);
        }
      }
    }, timeoutMs);

    // Final timeout: give up on canvas
    const t2 = window.setTimeout(() => {
      if (attemptIdRef.current === id && !canvasReady) {
        setMode("fallback");
      }
    }, timeoutMs + 3000);

    return () => { window.clearTimeout(t1); window.clearTimeout(t2); };
  }, [resolvedSrc, originalSrc, timeoutMs, burnWatermark]);

  // Canvas mode: watermark baked into pixel data
  if (mode === "canvas") {
    return (
      <div className={`relative w-full h-full ${wrapperClassName ?? ""}`}>
        <canvas
          ref={canvasRef}
          className={className}
          style={{
            display: canvasReady ? "block" : "none",
            width: "100%",
            height: "100%",
            objectFit: "cover" as any,
          }}
        />
        {!canvasReady && (
          <div className="w-full h-full bg-muted animate-pulse" />
        )}
      </div>
    );
  }

  // Fallback: CSS overlay (CORS-blocked images)
  return (
    <div className={`relative w-full h-full ${wrapperClassName ?? ""}`}>
      <img
        {...rest}
        src={originalSrc}
        alt={alt}
        className={className}
        onLoad={onLoad}
        onError={(e) => {
          onError?.(e);
        }}
      />
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
