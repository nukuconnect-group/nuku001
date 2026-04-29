import { useEffect, useRef, useState } from "react";
import { watermarked } from "@/lib/watermarkUrl";

interface SmartWatermarkedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  /** Original (un-watermarked) source. Required. */
  originalSrc: string;
  /** ms before we fall back to the original image. Default 5000. */
  timeoutMs?: number;
}

/**
 * Renders a product image through the watermark proxy, but if the
 * proxy fails OR takes too long, transparently swaps to the original
 * URL so the preview never breaks.
 */
const SmartWatermarkedImage = ({
  originalSrc,
  timeoutMs = 5000,
  onError,
  onLoad,
  ...rest
}: SmartWatermarkedImageProps) => {
  const wmUrl = watermarked(originalSrc);
  const [src, setSrc] = useState(wmUrl || originalSrc);
  const fellBackRef = useRef(false);

  useEffect(() => {
    fellBackRef.current = false;
    setSrc(wmUrl || originalSrc);
    if (!wmUrl || wmUrl === originalSrc) return;
    const t = window.setTimeout(() => {
      if (!fellBackRef.current) {
        fellBackRef.current = true;
        setSrc(originalSrc);
      }
    }, timeoutMs);
    return () => window.clearTimeout(t);
  }, [wmUrl, originalSrc, timeoutMs]);

  return (
    <img
      {...rest}
      src={src}
      onLoad={(e) => {
        fellBackRef.current = true; // cancel timeout fallback once loaded
        onLoad?.(e);
      }}
      onError={(e) => {
        if (!fellBackRef.current && src !== originalSrc) {
          fellBackRef.current = true;
          setSrc(originalSrc);
          return;
        }
        onError?.(e);
      }}
    />
  );
};

export default SmartWatermarkedImage;
