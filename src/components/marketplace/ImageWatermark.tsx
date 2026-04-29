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
      className="w-auto h-auto opacity-70"
      style={{
        width: `${scale * 100}%`,
        maxWidth: "75%",
        filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.55)) drop-shadow(0 0 2px rgba(0,0,0,0.4))",
      }}
    />
  </div>
);

export default ImageWatermark;
