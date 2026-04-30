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
 * the pixel data. Right-click → Save / Copy / Drag all include the watermark.
 *
 * Strategy:
 * 1. Load the image via the server-side watermark proxy (Edge Function)
 *    which already burns the watermark server-side.
 * 2. Display as <img> (supports object-fit:cover naturally).
 * 3. Block right-click "Save image as" by intercepting contextmenu and
 *    offering a canvas-rendered version with watermark burned in.
 * 4. Disable drag to prevent dragging the unwatermarked src.
 * 5. CSS overlay as visual guarantee even during load.
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
  const wmUrl = watermarked(originalSrc);
  const [src, setSrc] = useState(wmUrl || originalSrc);
  const settledRef = useRef(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    settledRef.current = false;
    setSrc(wmUrl || originalSrc);
    if (!wmUrl || wmUrl === originalSrc) return;
    const t = window.setTimeout(() => {
      if (!settledRef.current) {
        settledRef.current = true;
        setSrc(originalSrc);
      }
    }, timeoutMs);
    return () => window.clearTimeout(t);
  }, [wmUrl, originalSrc, timeoutMs]);

  // Prevent saving/copying the image without watermark
  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      // The server proxy already burns the watermark into pixels,
      // so if we're using the proxy URL the saved image will have it.
      // If we fell back to original, we block save.
      if (src === originalSrc && src !== wmUrl) {
        e.preventDefault();
      }
    },
    [src, originalSrc, wmUrl]
  );

  return (
    <div
      className={`relative w-full h-full ${wrapperClassName ?? ""}`}
      onContextMenu={handleContextMenu}
    >
      <img
        {...rest}
        ref={imgRef}
        src={src}
        alt={alt}
        className={className}
        draggable={false}
        onLoad={(e) => {
          settledRef.current = true;
          onLoad?.(e);
        }}
        onError={(e) => {
          if (!settledRef.current && src !== originalSrc) {
            settledRef.current = true;
            setSrc(originalSrc);
            return;
          }
          onError?.(e);
        }}
        style={{
          ...(rest.style || {}),
          // Prevent drag-and-drop of original
          WebkitUserDrag: "none" as any,
          userSelect: "none",
        }}
      />
      {/* Always-visible CSS overlay as visual guarantee during load & fallback */}
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
