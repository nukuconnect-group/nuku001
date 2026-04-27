import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Rocket, Clock, CalendarDays, TrendingUp, Eye, MousePointerClick,
  ShieldCheck, QrCode, Sparkles, CheckCircle2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useProductBoosts } from "@/hooks/useBoosts";

interface Props {
  productId: string;
  productName?: string;
  /** Si true, affiche le format "succès" (juste après boost) */
  successMode?: boolean;
}

const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString("fr-FR", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });

const ProductBoostStats = ({ productId, productName, successMode = false }: Props) => {
  const { data: boosts = [], isLoading } = useProductBoosts(productId);
  const [views, setViews] = useState<number | null>(null);
  const [orders, setOrders] = useState<number | null>(null);

  const active = boosts.find(
    (b) => b.is_active && new Date(b.expires_at) > new Date(),
  );

  useEffect(() => {
    if (!active) return;
    (async () => {
      const since = active.started_at;
      // Vues issues du tracking analytics si dispo
      const { count: viewCount } = await supabase
        .from("analytics_visits")
        .select("id", { count: "exact", head: true })
        .ilike("page_path", `%${productId}%`)
        .gte("created_at", since);
      setViews(viewCount ?? 0);

      const { count: orderCount } = await supabase
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("product_id", productId)
        .gte("created_at", since);
      setOrders(orderCount ?? 0);
    })();
  }, [active, productId]);

  if (isLoading) return null;

  if (!active) {
    return (
      <Card className="border-dashed">
        <CardContent className="p-4 text-center text-xs text-muted-foreground">
          Aucun boost actif sur ce produit.
        </CardContent>
      </Card>
    );
  }

  const start = new Date(active.started_at).getTime();
  const end = new Date(active.expires_at).getTime();
  const now = Date.now();
  const total = end - start;
  const elapsed = Math.max(0, Math.min(total, now - start));
  const percent = total > 0 ? Math.round((elapsed / total) * 100) : 0;
  const remainingMs = Math.max(0, end - now);
  const remainingDays = Math.floor(remainingMs / (1000 * 60 * 60 * 24));
  const remainingHours = Math.floor((remainingMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

  return (
    <Card className="overflow-hidden border-primary/30 shadow-elevated">
      <div className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground p-4">
        <div className="flex items-center gap-2 mb-1">
          {successMode ? (
            <CheckCircle2 className="w-5 h-5" />
          ) : (
            <Rocket className="w-5 h-5" />
          )}
          <span className="font-heading font-bold text-sm">
            {successMode ? "🚀 Boost activé avec succès" : "Boost actif"}
          </span>
          <Badge className="ml-auto bg-white/20 text-white border-0 text-[10px]">
            {active.plan_name === "basic" ? "7 jours" : `${active.days} jours`}
          </Badge>
        </div>
        {productName && (
          <p className="text-xs opacity-90 line-clamp-1">{productName}</p>
        )}
      </div>

      <CardContent className="p-4 space-y-3">
        {/* Progression dans le temps */}
        <div>
          <div className="flex items-center justify-between text-[11px] mb-1">
            <span className="text-muted-foreground flex items-center gap-1">
              <Clock className="w-3 h-3" /> Temps écoulé
            </span>
            <span className="font-semibold text-foreground">{percent}%</span>
          </div>
          <Progress value={percent} className="h-2" />
          <p className="text-[10px] text-muted-foreground mt-1">
            {remainingDays > 0
              ? `${remainingDays}j ${remainingHours}h restant${remainingDays > 1 ? "s" : ""}`
              : `${remainingHours}h restantes`}
          </p>
        </div>

        {/* Détails période */}
        <div className="grid grid-cols-2 gap-2 text-[11px]">
          <div className="rounded-lg bg-muted/50 p-2">
            <p className="text-muted-foreground flex items-center gap-1 mb-0.5">
              <CalendarDays className="w-3 h-3" /> Démarré
            </p>
            <p className="font-semibold text-foreground">{formatDateTime(active.started_at)}</p>
          </div>
          <div className="rounded-lg bg-muted/50 p-2">
            <p className="text-muted-foreground flex items-center gap-1 mb-0.5">
              <CalendarDays className="w-3 h-3" /> Expire le
            </p>
            <p className="font-semibold text-foreground">{formatDateTime(active.expires_at)}</p>
          </div>
        </div>

        {/* Statistiques live */}
        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border">
          <div className="text-center">
            <Eye className="w-4 h-4 mx-auto text-primary mb-1" />
            <p className="text-sm font-bold text-foreground">{views ?? "…"}</p>
            <p className="text-[9px] text-muted-foreground">Vues depuis le boost</p>
          </div>
          <div className="text-center">
            <MousePointerClick className="w-4 h-4 mx-auto text-primary mb-1" />
            <p className="text-sm font-bold text-foreground">{orders ?? "…"}</p>
            <p className="text-[9px] text-muted-foreground">Commandes</p>
          </div>
          <div className="text-center">
            <TrendingUp className="w-4 h-4 mx-auto text-primary mb-1" />
            <p className="text-sm font-bold text-foreground">+{Math.round(percent / 4)}%</p>
            <p className="text-[9px] text-muted-foreground">Visibilité estimée</p>
          </div>
        </div>

        {/* Actions traçabilité + historique */}
        <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-border">
          <Button asChild size="sm" variant="outline" className="flex-1 text-xs h-8">
            <Link to={`/tracabilite?product=${productId}`}>
              <QrCode className="w-3.5 h-3.5 mr-1" /> Voir la traçabilité
            </Link>
          </Button>
          <Button asChild size="sm" variant="hero" className="flex-1 text-xs h-8">
            <Link to={`/produit/${productId}`}>
              <ShieldCheck className="w-3.5 h-3.5 mr-1" /> Voir le produit
            </Link>
          </Button>
        </div>

        {/* Historique des boosts */}
        {boosts.length > 1 && (
          <div className="pt-2 border-t border-border">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> Historique ({boosts.length} boost{boosts.length > 1 ? "s" : ""})
            </p>
            <ul className="space-y-1 max-h-32 overflow-y-auto">
              {boosts.map((b) => {
                const isActiveBoost = b.id === active.id;
                return (
                  <li
                    key={b.id}
                    className="flex items-center justify-between text-[10px] py-1 px-2 rounded bg-muted/30"
                  >
                    <span className="text-muted-foreground">
                      {formatDateTime(b.started_at)} · {b.days}j
                    </span>
                    <Badge
                      variant={isActiveBoost ? "default" : "secondary"}
                      className="text-[9px] h-4 px-1.5"
                    >
                      {isActiveBoost
                        ? "Actif"
                        : new Date(b.expires_at) > new Date()
                          ? "En cours"
                          : "Terminé"}
                    </Badge>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ProductBoostStats;
