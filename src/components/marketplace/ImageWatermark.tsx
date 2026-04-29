import watermark from "@/assets/nuku-watermark.png";
import { cn } from "@/lib/utils";

interface Props {
  /** Width relative to parent (0-1). Default 0.28 */
  scale?: number;
  className?: string;
}

/**
 * Absolute-positioned Nukuconnect watermark overlay.
 * Drop this inside any `relative` image container to brand
 * the image without modifying the underlying file.
 */
const ImageWatermark = ({ scale = 0.28, className }: Props) => (
  <div
    aria-hidden
    className={cn(
      "pointer-events-none absolute bottom-1.5 right-1.5 select-none z-10",
      className,
    )}
    style={{ width: `${scale * 100}%`, maxWidth: 130 }}
  >
    {/* Soft white plate for legibility on any background */}
    <div className="absolute -inset-1 rounded-md bg-white/10 backdrop-blur-[1px]" />
    {/* Blurred halo */}
    <img
      src={watermark}
      alt=""
      draggable={false}
      className="absolute inset-0 w-full h-auto opacity-40 blur-[2px]"
    />
    {/* Crisp logo */}
    <img
      src={watermark}
      alt=""
      draggable={false}
      className="relative w-full h-auto opacity-65"
    />
  </div>
);

export default ImageWatermark;
