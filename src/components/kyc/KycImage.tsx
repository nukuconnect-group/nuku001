import { useState, useCallback } from "react";
import { ImageOff, RefreshCw, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface KycImageProps {
  src?: string | null;
  alt: string;
  className?: string;
  /** Optional click handler (e.g. zoom) */
  onClick?: () => void;
}

/**
 * KYC image with built-in fallback (placeholder + manual retry) so a
 * broken or slow URL never shows a broken visual.
 */
export const KycImage = ({ src, alt, className, onClick }: KycImageProps) => {
  const [status, setStatus] = useState<"loading" | "ok" | "error">(
    src ? "loading" : "error"
  );
  const [bust, setBust] = useState(0);

  const retry = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    setStatus("loading");
    setBust((b) => b + 1);
  }, []);

  if (!src) {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center gap-1 bg-muted/40 border border-dashed border-border rounded-lg text-muted-foreground",
          className
        )}
        role="img"
        aria-label={`${alt} non fourni`}
      >
        <ImageOff className="w-5 h-5" aria-hidden="true" />
        <span className="text-[10px]">Non fourni</span>
      </div>
    );
  }

  return (
    <div className={cn("relative overflow-hidden bg-muted/30", className)} onClick={onClick}>
      {status === "loading" && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/40">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" aria-hidden="true" />
        </div>
      )}
      {status === "error" ? (
        <button
          type="button"
          onClick={retry}
          className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-muted/40 text-muted-foreground hover:bg-muted/60 transition-colors"
          aria-label={`${alt} non disponible — réessayer`}
        >
          <ImageOff className="w-5 h-5" aria-hidden="true" />
          <span className="text-[10px] font-medium">Image cassée</span>
          <span className="text-[9px] flex items-center gap-1">
            <RefreshCw className="w-2.5 h-2.5" aria-hidden="true" /> Réessayer
          </span>
        </button>
      ) : (
        <img
          key={bust}
          src={bust ? `${src}${src.includes("?") ? "&" : "?"}r=${bust}` : src}
          alt={alt}
          loading="lazy"
          className="w-full h-full object-cover"
          onLoad={() => setStatus("ok")}
          onError={() => setStatus("error")}
        />
      )}
    </div>
  );
};

export default KycImage;
