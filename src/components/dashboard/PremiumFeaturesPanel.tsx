import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Crown, BarChart3, Headphones, Code2, Lock, Sparkles, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

interface Props {
  plan?: string | null;
  tokenBalance?: number;
}

/**
 * Features premium par pack. Pour compte Premium/Business : tout est actif.
 * Pour les autres : aperçu verrouillé avec CTA upgrade.
 * Aucun produit n'est jamais caché — c'est juste l'accès aux fonctionnalités avancées.
 */
const FEATURES = [
  {
    key: "analytics",
    icon: BarChart3,
    title: "Analytics avancées",
    description: "Tableaux de bord détaillés, segmentation acheteurs, prévisions IA",
    href: "/premium?tab=analytics",
  },
  {
    key: "manager",
    icon: Headphones,
    title: "Account manager dédié",
    description: "Un conseiller NukuConnect attribué pour vous accompagner",
    href: "/premium?tab=manager",
  },
  {
    key: "api",
    icon: Code2,
    title: "Intégration API",
    description: "Connectez votre système (ERP, e-commerce) à NukuConnect",
    href: "/premium?tab=api",
  },
];

const PREMIUM_PLANS = ["premium", "business", "pro"]; // pro inclus comme Premium

export default function PremiumFeaturesPanel({ plan, tokenBalance }: Props) {
  const planKey = (plan || "free").toLowerCase();
  const isPremium = PREMIUM_PLANS.includes(planKey);

  return (
    <Card className={isPremium ? "border-amber-500/30 bg-gradient-to-br from-amber-500/5 to-amber-500/0" : "border-border"}>
      <CardHeader className="p-3 sm:p-4">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Crown className={`w-4 h-4 ${isPremium ? "text-amber-500" : "text-muted-foreground"}`} />
            Fonctionnalités Premium
          </CardTitle>
          {isPremium ? (
            <Badge className="bg-amber-500/20 text-amber-700 dark:text-amber-300 text-[10px] gap-0.5">
              <Sparkles className="w-3 h-3" /> Actif
            </Badge>
          ) : (
            <Badge variant="outline" className="text-[10px] text-muted-foreground gap-0.5">
              <Lock className="w-3 h-3" /> Verrouillé
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-3 sm:p-4 pt-0 space-y-2">
        {FEATURES.map((f) => {
          const Icon = f.icon;
          const card = (
            <div className={`flex items-center gap-3 p-2.5 rounded-lg border transition-all ${
              isPremium
                ? "border-amber-500/20 bg-card hover:border-amber-500/40 hover:shadow-sm cursor-pointer"
                : "border-border bg-muted/30 opacity-70"
            }`}>
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                isPremium ? "bg-amber-500/15 text-amber-600" : "bg-muted text-muted-foreground"
              }`}>
                <Icon className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm font-semibold text-foreground flex items-center gap-1.5">
                  {f.title}
                  {!isPremium && <Lock className="w-3 h-3 text-muted-foreground" />}
                </p>
                <p className="text-[10px] sm:text-[11px] text-muted-foreground line-clamp-1">{f.description}</p>
              </div>
              {isPremium && <ArrowRight className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />}
            </div>
          );
          return isPremium ? <Link key={f.key} to={f.href}>{card}</Link> : <div key={f.key}>{card}</div>;
        })}

        {!isPremium && (
          <Link to="/plans" className="block pt-1">
            <Button variant="hero" size="sm" className="w-full gap-1.5 text-[11px] h-8">
              <Crown className="w-3.5 h-3.5" /> Passer en Premium
            </Button>
          </Link>
        )}

        {isPremium && tokenBalance != null && tokenBalance < 5 && (
          <Link to="/jetons" className="block pt-1">
            <Button variant="outline" size="sm" className="w-full gap-1.5 text-[11px] h-8 border-amber-500/30">
              ⚠️ Crédits faibles ({tokenBalance}) — Recharger
            </Button>
          </Link>
        )}
      </CardContent>
    </Card>
  );
}
