import watermark from "@/assets/nuku-watermark.png";
import { cn } from "@/lib/utils";

interface Props {
  /** Width relative to parent (0-1). Default 0.55 */
  scale?: number;
  className?: string;
}

/**
 * Centered Nukuconnect watermark overlay.
 * Drop inside any `relative` image container — the white logo
 * is rendered with low opacity in the middle of the image.
 */
const ImageWatermark = ({ scale = 0.55, className }: Props) => (
  <div
    aria-hidden
    className={cn(
      "pointer-events-none absolute inset-0 flex items-center justify-center select-none z-10",
      className,
    )}
  >
    <img
      src={watermark}
      alt=""
      draggable={false}
      className="w-auto h-auto opacity-40 mix-blend-overlay drop-shadow-sm"
      style={{ width: `${scale * 100}%`, maxWidth: "70%" }}
    />
  </div>
);

export default ImageWatermark;
