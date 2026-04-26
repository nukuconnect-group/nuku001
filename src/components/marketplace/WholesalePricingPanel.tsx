import { useProductPriceTiers } from "@/hooks/useProductPriceTiers";
import { useLanguage } from "@/contexts/LanguageContext";
import { Badge } from "@/components/ui/badge";
import { Truck, Zap, Tag } from "lucide-react";
import { formatShippingDelay } from "./ShippingDelayBadge";

interface Props {
  productId: string;
  unit: string;
  basePrice: number;
  minOrder?: number;
  shippingDays?: number | null;
}

/**
 * Bloc Aliexpress : "Prêt à être expédié" + tableau de tranches de prix.
 * Affiché UNIQUEMENT s'il y a des paliers configurés. Sinon affiche le prix de base + min order.
 */
export default function WholesalePricingPanel({ productId, unit, basePrice, minOrder = 1, shippingDays }: Props) {
  const { data: tiers = [], isLoading } = useProductPriceTiers(productId);
  const { formatPrice } = useLanguage();

  if (isLoading) return null;

  const isFast = (shippingDays ?? 1) <= 1;
  const ShipIcon = isFast ? Zap : Truck;

  return (
    <div className="space-y-2">
      {/* Header pill : Prêt à expédié */}
      <div className="flex items-center gap-2 flex-wrap">
        <Badge className="bg-primary/10 text-primary border border-primary/20 hover:bg-primary/15 gap-1 text-[10px] sm:text-xs font-semibold px-2 py-0.5">
          <ShipIcon className="w-3 h-3" />
          {isFast ? "Prêt à être expédié" : formatShippingDelay(shippingDays)}
        </Badge>
        {tiers.length > 0 && (
          <Badge className="bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive/15 gap-1 text-[10px] sm:text-xs font-semibold px-2 py-0.5">
            <Tag className="w-3 h-3" />
            Prix de gros disponibles
          </Badge>
        )}
      </div>

      {/* Prix : multi-tranches (Alibaba) ou simple */}
      {tiers.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-3 sm:p-4">
          <div className="flex items-baseline gap-2">
            <span className="font-heading text-2xl sm:text-3xl font-bold text-destructive">{formatPrice(basePrice)}</span>
            <span className="text-xs text-muted-foreground">/{unit}</span>
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">
            Commande minimale : {minOrder} {unit}
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card p-3 sm:p-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {/* Prix de base = première colonne */}
            <div>
              <div className="font-heading text-lg sm:text-2xl font-bold text-destructive leading-tight">
                {formatPrice(basePrice)}
              </div>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                /{unit} • Min. {minOrder} {unit}
              </p>
            </div>
            {/* Paliers dégressifs */}
            {tiers.map((t) => (
              <div key={t.id}>
                <div className="font-heading text-lg sm:text-2xl font-bold text-destructive leading-tight">
                  {formatPrice(t.price)}
                </div>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  /{unit} • {t.max_quantity ? `${t.min_quantity}–${t.max_quantity}` : `≥ ${t.min_quantity}`} {unit}
                </p>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-muted-foreground mt-3 pt-2 border-t border-border/50">
            Plus la quantité est élevée, plus le prix unitaire est bas.
          </p>
        </div>
      )}
    </div>
  );
}
