import { useEffect, useRef, useState } from "react";
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
 * Renders a product image with a guaranteed-visible Nukuconnect
 * watermark overlay (CSS layer). Also tries to load a server-side
 * "burned-in" version through the watermark proxy; if the proxy
 * fails or is slow, it transparently falls back to the original URL
 * — but the CSS overlay is ALWAYS shown so the logo is visible
 * everywhere on the marketplace, no matter what.
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

  return (
    <div className={`relative w-full h-full ${wrapperClassName ?? ""}`}>
      <img
        {...rest}
        src={src}
        alt={alt}
        className={className}
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
      />
      {/* Always-visible Nukuconnect watermark overlay */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 flex items-center justify-center select-none z-10"
      >
        <img
          src={watermarkLogo}
          alt=""
          draggable={false}
          className="opacity-70"
          style={{
            width: `${watermarkScale * 100}%`,
            maxWidth: "75%",
            filter:
              "drop-shadow(0 2px 6px rgba(0,0,0,0.55)) drop-shadow(0 0 2px rgba(0,0,0,0.4))",
          }}
        />
      </div>
    </div>
  );
};

export default SmartWatermarkedImage;
