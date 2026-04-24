import { useProductPriceTiers } from "@/hooks/useProductPriceTiers";
import { useLanguage } from "@/contexts/LanguageContext";
import { Layers } from "lucide-react";

interface Props {
  productId: string;
  unit: string;
  basePrice: number;
  compact?: boolean;
}

/** Affichage type Alibaba : 15 229 F CFA (1+) | 15 171 F CFA (≥50) */
export default function PriceTiersDisplay({ productId, unit, basePrice, compact = false }: Props) {
  const { data: tiers = [], isLoading } = useProductPriceTiers(productId);
  const { formatPrice } = useLanguage();

  if (isLoading || tiers.length === 0) return null;

  if (compact) {
    // Inline compact display for product cards
    return (
      <div className="flex items-baseline gap-2 text-[10px] text-muted-foreground flex-wrap">
        {tiers.slice(0, 2).map((t) => (
          <span key={t.id} className="inline-flex items-baseline gap-0.5">
            <span className="font-semibold text-destructive text-xs">{formatPrice(t.price)}</span>
            <span className="text-[9px]">/{unit} ≥{t.min_quantity}</span>
          </span>
        ))}
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2">
      <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
        <Layers className="w-3.5 h-3.5 text-primary" />
        Tarifs dégressifs
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {tiers.map((t) => (
          <div key={t.id} className="text-center p-2 rounded-md bg-card border border-border/60">
            <div className="font-heading text-base font-bold text-destructive leading-tight">{formatPrice(t.price)}</div>
            <div className="text-[9px] text-muted-foreground">/{unit}</div>
            <div className="text-[10px] text-foreground mt-0.5">
              {t.max_quantity ? `${t.min_quantity}–${t.max_quantity}` : `≥${t.min_quantity}`} {unit}
            </div>
          </div>
        ))}
      </div>
      <p className="text-[9px] text-muted-foreground text-center">Prix base : {formatPrice(basePrice)}/{unit}</p>
    </div>
  );
}
