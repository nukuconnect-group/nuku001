import { useState, useCallback, useEffect } from "react";
import { ImageOff, RefreshCw, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

interface KycImageProps {
  src?: string | null;
  alt: string;
  className?: string;
  onClick?: () => void;
}

/**
 * Parse a Supabase storage URL and return { bucket, path } if it matches a
 * KYC bucket (driver-kyc / supplier-kyc). We need this because those buckets
 * are PRIVATE — `getPublicUrl` returns a non-working URL, so we must mint a
 * signed URL on the fly for admin viewers.
 */
const parseKycStorageUrl = (
  url: string,
): { bucket: string; path: string } | null => {
  try {
    const u = new URL(url);
    // Pattern: /storage/v1/object/(public|sign|authenticated)/<bucket>/<path>
    const m = u.pathname.match(
      /\/storage\/v1\/object\/(?:public|sign|authenticated)\/([^/]+)\/(.+)$/,
    );
    if (!m) return null;
    const [, bucket, path] = m;
    if (bucket !== "driver-kyc" && bucket !== "supplier-kyc") return null;
    return { bucket, path: decodeURIComponent(path.split("?")[0]) };
  } catch {
    return null;
  }
};

/**
 * KYC image with built-in fallback (placeholder + manual retry). Automatically
 * signs URLs for private KYC storage buckets so the admin viewer never shows
 * a broken visual.
 */
export const KycImage = ({ src, alt, className, onClick }: KycImageProps) => {
  const [status, setStatus] = useState<"loading" | "ok" | "error">(
    src ? "loading" : "error",
  );
  const [resolvedSrc, setResolvedSrc] = useState<string | null>(src ?? null);
  const [bust, setBust] = useState(0);

  // Resolve the displayable URL: if it's a private KYC storage path, mint a
  // signed URL; otherwise use the URL as-is.
  useEffect(() => {
    let cancelled = false;
    if (!src) {
      setResolvedSrc(null);
      setStatus("error");
      return;
    }
    setStatus("loading");

    const parsed = parseKycStorageUrl(src);
    if (!parsed) {
      setResolvedSrc(src);
      return;
    }

    (async () => {
      const { data, error } = await supabase.storage
        .from(parsed.bucket)
        .createSignedUrl(parsed.path, 60 * 60); // 1h
      if (cancelled) return;
      if (error || !data?.signedUrl) {
        setStatus("error");
        return;
      }
      setResolvedSrc(data.signedUrl);
    })();

    return () => {
      cancelled = true;
    };
  }, [src, bust]);

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
          className,
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
    <div
      className={cn("relative overflow-hidden bg-muted/30", className)}
      onClick={onClick}
    >
      {status === "loading" && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/40">
          <Loader2
            className="w-5 h-5 animate-spin text-muted-foreground"
            aria-hidden="true"
          />
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
      ) : resolvedSrc ? (
        <img
          key={bust}
          src={resolvedSrc}
          alt={alt}
          loading="lazy"
          className="w-full h-full object-cover"
          onLoad={() => setStatus("ok")}
          onError={() => setStatus("error")}
        />
      ) : null}
    </div>
  );
};

export default KycImage;
