import { ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface VerifiedBadgeProps {
  verified: boolean;
  /** "compact" = icon-only chip, "full" = "Fournisseur Vérifié" label */
  variant?: "compact" | "full";
  className?: string;
}

/**
 * Standardised verified-supplier badge.
 * Use the same component everywhere a supplier's verified status is shown,
 * so the wording, colour and accessibility label stay consistent.
 */
export default function VerifiedBadge({ verified, variant = "full", className }: VerifiedBadgeProps) {
  if (verified) {
    return (
      <Badge
        role="status"
        aria-label="Fournisseur vérifié par NukuConnect"
        className={cn(
          "bg-emerald-500 text-white hover:bg-emerald-500 border-transparent gap-0.5",
          variant === "compact" ? "text-[9px] px-1.5 py-0" : "text-[10px] px-2 py-0.5",
          className,
        )}
      >
        <ShieldCheck className={variant === "compact" ? "w-2.5 h-2.5" : "w-3 h-3"} aria-hidden="true" />
        {variant === "full" ? "Fournisseur Vérifié" : "Vérifié"}
      </Badge>
    );
  }

  return (
    <Badge
      variant="outline"
      role="status"
      aria-label="Fournisseur non vérifié"
      className={cn(
        "text-muted-foreground border-muted-foreground/30 gap-0.5",
        variant === "compact" ? "text-[9px] px-1.5 py-0" : "text-[10px] px-2 py-0.5",
        className,
      )}
    >
      Non vérifié
    </Badge>
  );
}
