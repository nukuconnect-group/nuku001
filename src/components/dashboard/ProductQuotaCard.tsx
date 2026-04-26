import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Package, Crown, Coins } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

interface Props {
  productsCount: number;
  maxProducts: number;
  plan?: string | null;
  tokenBalance?: number;
}

const PLAN_LABEL: Record<string, string> = {
  free: "Plan Gratuit",
  starter: "Pack Starter",
  standard: "Pack Standard",
  pro: "Pack Pro",
  premium: "Pack Premium",
  business: "Pack Business",
};

/**
 * Quota produits universel — affiché pour TOUS les plans (gratuit + payants).
 * Aucun blocage : juste rappel pour upgrade (free) ou recharge crédits (premium).
 */
export default function ProductQuotaCard({ productsCount, maxProducts, plan, tokenBalance }: Props) {
  const planKey = (plan || "free").toLowerCase();
  const isFree = planKey === "free";
  const isUnlimited = !maxProducts || maxProducts >= 9999;
  const limit = maxProducts || 5;
  const used = isUnlimited ? productsCount : Math.min(productsCount, limit);
  const percent = isUnlimited ? Math.min(100, (productsCount % 100)) : Math.min(100, Math.round((used / limit) * 100));
  const isFull = !isUnlimited && used >= limit;
  const remaining = isUnlimited ? Infinity : Math.max(0, limit - used);

  const planLabel = PLAN_LABEL[planKey] || `Pack ${planKey}`;

  // Subtitle adapté au plan (jamais bloquant)
  let subtitle: string;
  if (isUnlimited) {
    subtitle = `Publications illimitées — ${productsCount} produit${productsCount > 1 ? "s" : ""} actif${productsCount > 1 ? "s" : ""}`;
  } else if (isFull) {
    subtitle = isFree
      ? "Limite atteinte — passez à un pack payant pour publier plus."
      : "Limite atteinte — rechargez vos crédits pour publier plus.";
  } else {
    subtitle = `${remaining} publication${remaining > 1 ? "s" : ""} restante${remaining > 1 ? "s" : ""}`;
  }

  return (
    <Card className={`border ${isFull ? "border-amber-500/40 bg-amber-500/5" : "border-primary/20 bg-primary/5"}`}>
      <CardContent className="p-3 sm:p-4 space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${isFull ? "bg-amber-500/15" : "bg-primary/15"}`}>
              <Package className={`w-4 h-4 ${isFull ? "text-amber-600" : "text-primary"}`} />
            </div>
            <div className="min-w-0">
              <p className="text-xs sm:text-sm font-semibold text-foreground truncate">
                {planLabel} — Quota produits
              </p>
              <p className="text-[10px] sm:text-[11px] text-muted-foreground line-clamp-2">{subtitle}</p>
            </div>
          </div>
          <Badge className={`text-[10px] flex-shrink-0 ${isFull ? "bg-amber-500/15 text-amber-700 dark:text-amber-400" : "bg-primary/15 text-primary"}`}>
            {isUnlimited ? `${productsCount} ∞` : `${used} / ${limit}`}
          </Badge>
        </div>

        {!isUnlimited && (
          <Progress value={percent} className={`h-2 ${isFull ? "[&>div]:bg-amber-500" : ""}`} />
        )}

        {isFull && isFree && (
          <Link to="/plans">
            <Button variant="hero" size="sm" className="w-full gap-1.5 text-[11px] h-8 mt-1">
              <Crown className="w-3.5 h-3.5" />
              Devenir premium
            </Button>
          </Link>
        )}
        {isFull && !isFree && (
          <Link to="/jetons">
            <Button variant="hero" size="sm" className="w-full gap-1.5 text-[11px] h-8 mt-1">
              <Coins className="w-3.5 h-3.5" />
              Recharger mes crédits {tokenBalance != null ? `(${tokenBalance} restants)` : ""}
            </Button>
          </Link>
        )}
      </CardContent>
    </Card>
  );
}
