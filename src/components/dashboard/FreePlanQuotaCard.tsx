import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Package, Crown } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

interface Props {
  productsCount: number;
  maxProducts: number;
  plan?: string | null;
}

/**
 * Quota produits visuel pour le plan gratuit (5 produits max).
 * Affiche une barre de progression claire et bloque visuellement si la limite est atteinte.
 */
export default function FreePlanQuotaCard({ productsCount, maxProducts, plan }: Props) {
  if (plan && plan !== "free") return null;
  const limit = maxProducts || 5;
  const used = Math.min(productsCount, limit);
  const percent = Math.min(100, Math.round((used / limit) * 100));
  const isFull = used >= limit;
  const remaining = Math.max(0, limit - used);

  return (
    <Card className={`border ${isFull ? "border-destructive/40 bg-destructive/5" : "border-primary/20 bg-primary/5"}`}>
      <CardContent className="p-3 sm:p-4 space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${isFull ? "bg-destructive/15" : "bg-primary/15"}`}>
              <Package className={`w-4 h-4 ${isFull ? "text-destructive" : "text-primary"}`} />
            </div>
            <div className="min-w-0">
              <p className="text-xs sm:text-sm font-semibold text-foreground">Plan gratuit — Quota produits</p>
              <p className="text-[10px] sm:text-[11px] text-muted-foreground">
                {isFull ? "Limite atteinte — passez à un plan payant pour publier plus." : `${remaining} produit${remaining > 1 ? "s" : ""} restant${remaining > 1 ? "s" : ""}`}
              </p>
            </div>
          </div>
          <Badge className={`text-[10px] flex-shrink-0 ${isFull ? "bg-destructive/15 text-destructive" : "bg-primary/15 text-primary"}`}>
            {used} / {limit}
          </Badge>
        </div>

        <Progress value={percent} className={`h-2 ${isFull ? "[&>div]:bg-destructive" : ""}`} />

        {isFull && (
          <Link to="/plans">
            <Button variant="hero" size="sm" className="w-full gap-1.5 text-[11px] h-8 mt-1">
              <Crown className="w-3.5 h-3.5" />
              Débloquer plus de produits
            </Button>
          </Link>
        )}
      </CardContent>
    </Card>
  );
}
