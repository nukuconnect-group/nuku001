import { ImgHTMLAttributes } from "react";
import watermark from "@/assets/nuku-watermark.png";
import { cn } from "@/lib/utils";

interface WatermarkedImageProps extends ImgHTMLAttributes<HTMLImageElement> {
  /** Watermark size relative to container width. Default 28%. */
  watermarkScale?: number;
  /** Hide the overlay (e.g. for tiny thumbnails). */
  showWatermark?: boolean;
  /** Class applied to the wrapper div. */
  wrapperClassName?: string;
}

/**
 * Renders a product image with a soft, professional Nukuconnect watermark
 * overlaid in the bottom-right corner. The watermark is a pure CSS overlay
 * so it instantly applies to ALL existing marketplace images without
 * touching the underlying files.
 */
const WatermarkedImage = ({
  watermarkScale = 0.28,
  showWatermark = true,
  wrapperClassName,
  className,
  ...imgProps
}: WatermarkedImageProps) => {
  return (
    <div className={cn("relative w-full h-full", wrapperClassName)}>
      <img {...imgProps} className={className} />
      {showWatermark && (
        <div
          aria-hidden
          className="pointer-events-none absolute bottom-1.5 right-1.5 select-none"
          style={{ width: `${watermarkScale * 100}%`, maxWidth: "140px" }}
        >
          {/* Soft white plate for legibility on any background */}
          <div className="absolute inset-0 -m-1 rounded-md bg-white/15 backdrop-blur-[1px]" />
          {/* Blurred halo */}
          <img
            src={watermark}
            alt=""
            className="absolute inset-0 w-full h-auto opacity-40 blur-[2px]"
            draggable={false}
          />
          {/* Crisp logo */}
          <img
            src={watermark}
            alt=""
            className="relative w-full h-auto opacity-60 mix-blend-luminosity"
            style={{ mixBlendMode: "normal" }}
            draggable={false}
          />
        </div>
      )}
    </div>
  );
};

export default WatermarkedImage;
