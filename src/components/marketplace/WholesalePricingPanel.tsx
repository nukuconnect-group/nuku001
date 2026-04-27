import { useProductPriceTiers } from "@/hooks/useProductPriceTiers";
import { useLanguage } from "@/contexts/LanguageContext";
import { Badge } from "@/components/ui/badge";
import { Truck, Zap, Tag, ShoppingCart, Layers, TrendingDown } from "lucide-react";
import { formatShippingDelay } from "./ShippingDelayBadge";

interface Props {
  productId: string;
  unit: string;
  basePrice: number;
  minOrder?: number;
  shippingDays?: number | null;
}

/**
 * Bloc "Détail & Gros" — inspiré Alibaba / AliExpress.
 * - Affiche TOUJOURS un onglet "Prix au détail" + "Prix de gros" pro.
 * - Si pas de paliers configurés, propose une grille de gros par défaut (-3% / -7% / -12%)
 *   pour que le fournisseur soit perçu comme professionnel.
 */
export default function WholesalePricingPanel({
  productId,
  unit,
  basePrice,
  minOrder = 1,
  shippingDays,
}: Props) {
  const { data: customTiers = [], isLoading } = useProductPriceTiers(productId);
  const { formatPrice } = useLanguage();

  if (isLoading) {
    return (
      <div className="rounded-xl border border-border bg-muted/20 h-32 animate-pulse" aria-busy="true" />
    );
  }

  const isFast = (shippingDays ?? 1) <= 1;
  const ShipIcon = isFast ? Zap : Truck;

  // Use admin-defined tiers if any, otherwise build a default progressive ladder
  const hasCustom = customTiers.length > 0;
  const tiers = hasCustom
    ? customTiers.map((t) => ({
        min: t.min_quantity,
        max: t.max_quantity,
        price: Number(t.price),
      }))
    : buildDefaultLadder(basePrice, minOrder);

  return (
    <section
      className="rounded-2xl border border-border bg-card overflow-hidden"
      aria-label="Tarifs détail et gros"
    >
      {/* Top status band */}
      <div className="flex items-center gap-2 flex-wrap px-3 sm:px-4 py-2 bg-gradient-to-r from-primary/5 via-primary/10 to-transparent border-b border-border">
        <Badge className="bg-primary/15 text-primary border border-primary/20 hover:bg-primary/20 gap-1 text-[10px] sm:text-xs font-semibold px-2 py-0.5">
          <ShipIcon className="w-3 h-3" aria-hidden="true" />
          {isFast ? "Prêt à être expédié" : formatShippingDelay(shippingDays)}
        </Badge>
        <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 gap-1 text-[10px] sm:text-xs font-semibold px-2 py-0.5">
          <Tag className="w-3 h-3" aria-hidden="true" />
          Tarif détail & gros
        </Badge>
        {!hasCustom && (
          <span className="text-[9px] sm:text-[10px] text-muted-foreground italic ml-auto">
            Grille indicative
          </span>
        )}
      </div>

      {/* Two-column header: Détail | Gros */}
      <div className="grid grid-cols-2 divide-x divide-border">
        {/* Détail */}
        <div className="p-3 sm:p-4">
          <div className="flex items-center gap-1 text-[10px] sm:text-xs uppercase tracking-wide font-semibold text-muted-foreground mb-1">
            <ShoppingCart className="w-3 h-3" aria-hidden="true" />
            Prix au détail
          </div>
          <div className="flex items-baseline gap-1.5 flex-wrap">
            <span className="font-heading text-xl sm:text-3xl font-bold text-destructive leading-none">
              {formatPrice(basePrice)}
            </span>
            <span className="text-[11px] sm:text-xs text-muted-foreground">/ {unit}</span>
          </div>
          <p className="text-[10px] sm:text-[11px] text-muted-foreground mt-1.5">
            À partir de <span className="font-semibold text-foreground">{minOrder} {unit}</span>
          </p>
        </div>

        {/* Gros — best deal */}
        <div className="p-3 sm:p-4 bg-gradient-to-br from-emerald-500/5 to-transparent">
          <div className="flex items-center gap-1 text-[10px] sm:text-xs uppercase tracking-wide font-semibold text-emerald-700 dark:text-emerald-400 mb-1">
            <Layers className="w-3 h-3" aria-hidden="true" />
            Prix de gros
          </div>
          {(() => {
            const best = tiers[tiers.length - 1];
            const savings = computeSavings(basePrice, best.price);
            return (
              <>
                <div className="flex items-baseline gap-1.5 flex-wrap">
                  <span className="font-heading text-xl sm:text-3xl font-bold text-emerald-700 dark:text-emerald-400 leading-none">
                    {formatPrice(best.price)}
                  </span>
                  <span className="text-[11px] sm:text-xs text-muted-foreground">/ {unit}</span>
                </div>
                <p className="text-[10px] sm:text-[11px] text-muted-foreground mt-1.5 flex items-center gap-1">
                  Dès <span className="font-semibold text-foreground">{best.min} {unit}</span>
                  {savings > 0 && (
                    <span className="inline-flex items-center gap-0.5 text-emerald-600 font-semibold">
                      <TrendingDown className="w-2.5 h-2.5" aria-hidden="true" />
                      −{savings}%
                    </span>
                  )}
                </p>
              </>
            );
          })()}
        </div>
      </div>

      {/* Tier ladder table — Alibaba style */}
      <div className="border-t border-border bg-muted/20">
        <div className="grid grid-cols-3 text-[10px] sm:text-[11px] uppercase tracking-wide font-semibold text-muted-foreground px-3 sm:px-4 py-2 border-b border-border bg-card">
          <span>Quantité</span>
          <span className="text-center">Prix unitaire</span>
          <span className="text-right">Économies</span>
        </div>
        <ul className="divide-y divide-border">
          {/* Retail row */}
          <li className="grid grid-cols-3 items-center px-3 sm:px-4 py-2 text-xs sm:text-sm">
            <span className="font-medium">
              {minOrder} – {tiers[0].min - 1 > minOrder ? tiers[0].min - 1 : minOrder} {unit}
            </span>
            <span className="text-center font-semibold text-destructive">
              {formatPrice(basePrice)}
            </span>
            <span className="text-right text-muted-foreground">—</span>
          </li>
          {tiers.map((t, i) => {
            const savings = computeSavings(basePrice, t.price);
            const isBest = i === tiers.length - 1;
            return (
              <li
                key={`${t.min}-${t.max ?? "inf"}`}
                className={`grid grid-cols-3 items-center px-3 sm:px-4 py-2 text-xs sm:text-sm transition-colors ${
                  isBest ? "bg-emerald-500/5" : ""
                }`}
              >
                <span className="font-medium">
                  {t.max ? `${t.min} – ${t.max}` : `≥ ${t.min}`} {unit}
                </span>
                <span
                  className={`text-center font-semibold ${
                    isBest ? "text-emerald-700 dark:text-emerald-400" : "text-foreground"
                  }`}
                >
                  {formatPrice(t.price)}
                </span>
                <span className="text-right">
                  {savings > 0 ? (
                    <Badge
                      className={`text-[9px] sm:text-[10px] font-bold px-1.5 py-0 ${
                        isBest
                          ? "bg-emerald-600 text-white hover:bg-emerald-600"
                          : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30"
                      }`}
                    >
                      −{savings}%
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </span>
              </li>
            );
          })}
        </ul>
        <p className="text-[10px] sm:text-[11px] text-muted-foreground px-3 sm:px-4 py-2 border-t border-border bg-card flex items-center gap-1">
          <TrendingDown className="w-3 h-3 text-emerald-600" aria-hidden="true" />
          Plus la quantité est élevée, plus le prix unitaire baisse.
        </p>
      </div>
    </section>
  );
}

/* Helpers */

function computeSavings(base: number, tier: number): number {
  if (!base || base <= 0) return 0;
  const pct = ((base - tier) / base) * 100;
  return pct > 0 ? Math.round(pct) : 0;
}

/**
 * Default progressive ladder when no admin tiers are configured.
 * Discounts: −3% / −7% / −12% applied above predictable thresholds.
 */
function buildDefaultLadder(basePrice: number, minOrder: number) {
  const start = Math.max(minOrder, 1);
  const t1Min = Math.max(start * 5, 10);
  const t2Min = Math.max(start * 20, 50);
  const t3Min = Math.max(start * 100, 200);
  const round = (n: number) => Math.max(1, Math.round(n));
  return [
    { min: t1Min, max: t2Min - 1, price: round(basePrice * 0.97) },
    { min: t2Min, max: t3Min - 1, price: round(basePrice * 0.93) },
    { min: t3Min, max: null as number | null, price: round(basePrice * 0.88) },
  ];
}
