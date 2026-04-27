import { useProductPriceTiers } from "@/hooks/useProductPriceTiers";
import { useLanguage } from "@/contexts/LanguageContext";
import { Badge } from "@/components/ui/badge";
import { Truck, Zap, Tag, ShoppingCart, Layers, TrendingDown, Crown } from "lucide-react";
import { formatShippingDelay } from "./ShippingDelayBadge";

interface Props {
  productId: string;
  unit: string;
  basePrice: number;
  minOrder?: number;
  shippingDays?: number | null;
}

/**
 * Bloc "Détail & Gros".
 * Affiche UNIQUEMENT les prix réels saisis par le vendeur.
 * - Prix au détail = prix de base saisi par le vendeur.
 * - Prix de gros  = paliers (product_price_tiers) saisis par le vendeur.
 * Aucune grille fictive n'est générée par la plateforme.
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
      <div
        className="rounded-xl border border-border bg-muted/20 h-32 animate-pulse"
        role="status"
        aria-live="polite"
        aria-label="Chargement des tarifs"
      />
    );
  }

  const isFast = (shippingDays ?? 1) <= 1;
  const ShipIcon = isFast ? Zap : Truck;

  const tiers = customTiers.map((t) => ({
    min: t.min_quantity,
    max: t.max_quantity,
    price: Number(t.price),
  }));
  const hasTiers = tiers.length > 0;

  // Best deal = lowest unit price (only meaningful if tiers exist)
  const bestIndex = hasTiers
    ? tiers.reduce((acc, t, i) => (t.price < tiers[acc].price ? i : acc), 0)
    : -1;
  const best = hasTiers ? tiers[bestIndex] : null;
  const bestSavings = best ? computeSavings(basePrice, best.price) : 0;
  const bestTierLabel = best
    ? best.max
      ? `${formatNum(best.min)} – ${formatNum(best.max)} ${unit}`
      : `≥ ${formatNum(best.min)} ${unit}`
    : "";

  return (
    <section
      className="rounded-2xl border-2 border-border bg-card overflow-hidden focus-within:ring-2 focus-within:ring-primary/40"
      aria-labelledby="pricing-title"
    >
      <h2 id="pricing-title" className="sr-only">
        Tarifs détail{hasTiers ? " et gros" : ""}
      </h2>

      {/* Top status band */}
      <div className="flex items-center gap-2 flex-wrap px-3 sm:px-4 py-2 bg-gradient-to-r from-primary/5 via-primary/10 to-transparent border-b-2 border-border">
        <Badge className="bg-primary/15 text-primary border border-primary/30 hover:bg-primary/20 gap-1 text-[10px] sm:text-xs font-semibold px-2 py-0.5">
          <ShipIcon className="w-3 h-3" aria-hidden="true" />
          {isFast ? "Prêt à être expédié" : formatShippingDelay(shippingDays)}
        </Badge>
        <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/40 gap-1 text-[10px] sm:text-xs font-semibold px-2 py-0.5">
          <Tag className="w-3 h-3" aria-hidden="true" />
          {hasTiers ? "Tarif détail & gros" : "Tarif détail"}
        </Badge>
      </div>

      {/* Header: Détail (+ Gros si paliers définis) */}
      <div className={hasTiers ? "grid grid-cols-2 divide-x-2 divide-border" : ""}>
        {/* Détail */}
        <div className="p-3 sm:p-4">
          <h3 className="flex items-center gap-1 text-[10px] sm:text-xs uppercase tracking-wide font-bold text-muted-foreground mb-1.5">
            <ShoppingCart className="w-3 h-3" aria-hidden="true" />
            Prix au détail
          </h3>
          <p
            className="flex items-baseline gap-1.5 flex-wrap"
            aria-label={`Prix au détail : ${formatPrice(basePrice)} par ${unit}`}
          >
            <span className="font-heading text-xl sm:text-3xl font-extrabold text-destructive leading-none tabular-nums">
              {formatPrice(basePrice)}
            </span>
            <span className="text-[11px] sm:text-xs text-muted-foreground" aria-hidden="true">
              / {unit}
            </span>
          </p>
          <p className="text-[10px] sm:text-[11px] text-muted-foreground mt-1.5">
            À partir de{" "}
            <span className="font-semibold text-foreground tabular-nums">
              {formatNum(minOrder)} {unit}
            </span>
          </p>
        </div>

        {/* Gros — uniquement si le vendeur a saisi des paliers */}
        {hasTiers && best && (
          <div
            className="relative p-3 sm:p-4 bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent"
            aria-label={`Meilleur prix de gros : ${formatPrice(best.price)} par ${unit}, à partir de ${formatNum(best.min)} ${unit}${bestSavings > 0 ? `, économie ${bestSavings}%` : ""}`}
          >
            {bestSavings > 0 && (
              <span
                className="absolute -top-1 right-2 sm:right-3 inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded-full bg-emerald-600 text-white text-[9px] sm:text-[10px] font-bold shadow-md border border-emerald-700"
                role="status"
              >
                <Crown className="w-2.5 h-2.5" aria-hidden="true" />
                Meilleur prix
              </span>
            )}
            <h3 className="flex items-center gap-1 text-[10px] sm:text-xs uppercase tracking-wide font-bold text-emerald-700 dark:text-emerald-400 mb-1.5">
              <Layers className="w-3 h-3" aria-hidden="true" />
              Prix de gros
            </h3>
            <p className="flex items-baseline gap-1.5 flex-wrap">
              <span className="font-heading text-xl sm:text-3xl font-extrabold text-emerald-700 dark:text-emerald-400 leading-none tabular-nums">
                {formatPrice(best.price)}
              </span>
              <span className="text-[11px] sm:text-xs text-muted-foreground" aria-hidden="true">
                / {unit}
              </span>
            </p>
            <p className="text-[10px] sm:text-[11px] text-muted-foreground mt-1.5 flex items-center gap-1 flex-wrap">
              Dès{" "}
              <span className="font-semibold text-foreground tabular-nums">
                {formatNum(best.min)} {unit}
              </span>
              {bestSavings > 0 && (
                <span className="inline-flex items-center gap-0.5 text-emerald-700 dark:text-emerald-400 font-bold">
                  <TrendingDown className="w-2.5 h-2.5" aria-hidden="true" />
                  −{bestSavings}%
                </span>
              )}
            </p>
          </div>
        )}
      </div>

      {/* Tier ladder — uniquement si paliers réels du vendeur */}
      {hasTiers && (
        <div className="border-t-2 border-border bg-muted/20">
          <div className="px-3 sm:px-4 py-2 bg-card border-b border-border">
            <h3 className="text-[10px] sm:text-xs uppercase tracking-wide font-bold text-muted-foreground">
              Détail des tranches
            </h3>
          </div>
          <table
            className="w-full text-xs sm:text-sm"
            aria-label="Grille des prix par tranche de quantité"
          >
            <thead>
              <tr className="bg-card border-b border-border">
                <th scope="col" className="text-left px-3 sm:px-4 py-2 text-[10px] sm:text-[11px] uppercase tracking-wide font-bold text-muted-foreground">
                  Quantité
                </th>
                <th scope="col" className="text-center px-3 sm:px-4 py-2 text-[10px] sm:text-[11px] uppercase tracking-wide font-bold text-muted-foreground">
                  Prix unitaire
                </th>
                <th scope="col" className="text-right px-3 sm:px-4 py-2 text-[10px] sm:text-[11px] uppercase tracking-wide font-bold text-muted-foreground">
                  Économies
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {/* Retail row (always shown to compare) */}
              <tr>
                <th scope="row" className="text-left px-3 sm:px-4 py-2 font-medium tabular-nums">
                  {formatNum(minOrder)}
                  {tiers[0].min > minOrder ? ` – ${formatNum(tiers[0].min - 1)}` : ""} {unit}
                </th>
                <td className="text-center px-3 sm:px-4 py-2 font-bold text-destructive tabular-nums">
                  {formatPrice(basePrice)}
                </td>
                <td className="text-right px-3 sm:px-4 py-2 text-muted-foreground" aria-label="Pas d'économie">
                  —
                </td>
              </tr>
              {tiers.map((t, i) => {
                const savings = computeSavings(basePrice, t.price);
                const isBest = i === bestIndex;
                const range = t.max ? `${formatNum(t.min)} – ${formatNum(t.max)}` : `≥ ${formatNum(t.min)}`;
                return (
                  <tr
                    key={`${t.min}-${t.max ?? "inf"}`}
                    className={isBest ? "bg-emerald-500/10 ring-1 ring-emerald-500/30" : ""}
                    aria-current={isBest ? "true" : undefined}
                  >
                    <th scope="row" className="text-left px-3 sm:px-4 py-2 font-medium tabular-nums flex items-center gap-1.5">
                      {range} {unit}
                      {isBest && (
                        <span
                          className="inline-flex items-center gap-0.5 px-1.5 py-0 rounded-full bg-emerald-600 text-white text-[9px] sm:text-[10px] font-bold border border-emerald-700"
                          aria-label={`Meilleur prix à partir de ${formatNum(t.min)} ${unit}`}
                        >
                          <Crown className="w-2.5 h-2.5" aria-hidden="true" />
                          Meilleur prix
                        </span>
                      )}
                    </th>
                    <td className={`text-center px-3 sm:px-4 py-2 font-bold tabular-nums ${isBest ? "text-emerald-700 dark:text-emerald-400" : "text-foreground"}`}>
                      {formatPrice(t.price)}
                    </td>
                    <td className="text-right px-3 sm:px-4 py-2">
                      {savings > 0 ? (
                        <Badge
                          className={`text-[9px] sm:text-[10px] font-bold px-1.5 py-0 ${
                            isBest
                              ? "bg-emerald-600 text-white hover:bg-emerald-600 border border-emerald-700"
                              : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/40"
                          }`}
                          aria-label={`Économie de ${savings} pour cent`}
                        >
                          −{savings}%
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground" aria-hidden="true">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {best && (
            <p className="text-[10px] sm:text-[11px] text-muted-foreground px-3 sm:px-4 py-2 border-t border-border bg-card flex items-center gap-1">
              <TrendingDown className="w-3 h-3 text-emerald-600" aria-hidden="true" />
              Meilleure offre :{" "}
              <span className="font-semibold text-foreground tabular-nums">
                {formatPrice(best.price)} / {unit}
              </span>{" "}
              à partir de{" "}
              <span className="font-semibold text-foreground tabular-nums">{bestTierLabel}</span>.
            </p>
          )}
        </div>
      )}
    </section>
  );
}

/* Helpers */

function computeSavings(base: number, tier: number): number {
  if (!base || base <= 0) return 0;
  const pct = ((base - tier) / base) * 100;
  return pct > 0 ? Math.round(pct) : 0;
}

function formatNum(n: number): string {
  return new Intl.NumberFormat("fr-FR").format(n);
}
