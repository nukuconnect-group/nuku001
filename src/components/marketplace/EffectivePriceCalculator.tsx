import { useMemo } from "react";
import { useProductPriceTiers, getEffectivePrice } from "@/hooks/useProductPriceTiers";
import { useLanguage } from "@/contexts/LanguageContext";
import { Calculator, TrendingDown } from "lucide-react";

interface Props {
  productId: string;
  unit: string;
  basePrice: number;
  quantity: number;
}

/** Real-time effective price calculator — shown on the product detail page next to the quantity selector. */
export default function EffectivePriceCalculator({ productId, unit, basePrice, quantity }: Props) {
  const { data: tiers = [] } = useProductPriceTiers(productId);
  const { formatPrice } = useLanguage();

  const effective = useMemo(
    () => getEffectivePrice(tiers, quantity, basePrice),
    [tiers, quantity, basePrice]
  );
  const total = effective * quantity;
  const savings = (basePrice - effective) * quantity;

  if (tiers.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-muted/30 p-2.5 text-xs">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Total ({quantity} {unit})</span>
          <span className="font-bold text-base text-primary">{formatPrice(total)}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-primary/30 bg-primary/5 p-2.5 space-y-1.5">
      <div className="flex items-center gap-1.5 text-[10px] font-semibold text-primary uppercase tracking-wide">
        <Calculator className="w-3 h-3" />
        Prix effectif
      </div>
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">Prix unitaire ({quantity} {unit}) :</span>
        <span className="font-bold text-destructive text-sm">{formatPrice(effective)}/{unit}</span>
      </div>
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">Total :</span>
        <span className="font-bold text-base text-primary">{formatPrice(total)}</span>
      </div>
      {savings > 0 && (
        <div className="flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-medium pt-1 border-t border-border/40">
          <TrendingDown className="w-3 h-3" />
          Vous économisez {formatPrice(savings)} grâce au tarif gros !
        </div>
      )}
    </div>
  );
}
