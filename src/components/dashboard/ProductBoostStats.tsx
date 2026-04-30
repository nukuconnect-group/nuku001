import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Rocket, Clock, CalendarDays, TrendingUp, Eye, MousePointerClick,
  ShieldCheck, QrCode, Sparkles, CheckCircle2, MessageCircle, ShoppingCart,
  AlertTriangle, Users, XCircle, History, Filter, Phone,
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

interface BoostMetrics {
  impressions: number;     // total page views (analytics_visits)
  uniqueVisitors: number;  // distinct sessions
  clicks: number;          // alias of impressions for now
  conversations: number;   // discussions ouvertes sur ce produit
  orders: number;          // commandes générées
  revenue: number;         // CA généré pendant le boost
}

const ProductBoostStats = ({ productId, productName, successMode = false }: Props) => {
  const { data: boosts = [], isLoading } = useProductBoosts(productId);
  const [metrics, setMetrics] = useState<BoostMetrics | null>(null);
  const [history, setHistory] = useState<Array<{ id: string; type: string; label: string; at: string }>>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Filtres date pour la section historique
  const [filterFrom, setFilterFrom] = useState<string>("");
  const [filterTo, setFilterTo] = useState<string>("");
  const [tick, setTick] = useState(0); // déclencheur d'auto-refresh

  const now = Date.now();
  const active = boosts.find(
    (b) => b.is_active && new Date(b.expires_at).getTime() > now,
  );
  // Dernier boost terminé pour afficher un statut final si pas d'actif
  const lastFinished = !active
    ? boosts
        .filter((b) => new Date(b.expires_at).getTime() <= now)
        .sort((a, b) => new Date(b.expires_at).getTime() - new Date(a.expires_at).getTime())[0]
    : null;

  const reference = active || lastFinished;

  // Période effective utilisée pour metrics + historique (filtres > boost)
  const period = useMemo(() => {
    if (!reference) return null;
    const defaultFrom = reference.started_at;
    const defaultTo = new Date(reference.expires_at).getTime() < now
      ? reference.expires_at
      : new Date().toISOString();
    return {
      from: filterFrom ? new Date(filterFrom).toISOString() : defaultFrom,
      to: filterTo ? new Date(filterTo + "T23:59:59").toISOString() : defaultTo,
    };
  }, [reference?.id, filterFrom, filterTo, tick]);

  // Auto-refresh toutes les 15s tant que le boost est actif
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setTick((t) => t + 1), 15_000);
    return () => clearInterval(id);
  }, [active?.id]);

  // Realtime: refresh instantanément sur insertion de visites/conversations/commandes/messages
  useEffect(() => {
    if (!active) return;
    const channel = supabase
      .channel(`boost-stats-${productId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "analytics_visits" }, (payload: any) => {
        const path = payload?.new?.page_path || "";
        if (path.includes(productId)) setTick((t) => t + 1);
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "conversations", filter: `product_id=eq.${productId}` }, () => setTick((t) => t + 1))
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "orders", filter: `product_id=eq.${productId}` }, () => setTick((t) => t + 1))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [active?.id, productId]);

  useEffect(() => {
    if (!reference || !period) { setMetrics(null); return; }
    let cancelled = false;
    (async () => {
      const since = period.from;
      const until = period.to;

      // Vues / impressions
      const { data: visits } = await supabase
        .from("analytics_visits")
        .select("session_id")
        .ilike("page_path", `%${productId}%`)
        .gte("created_at", since)
        .lte("created_at", until);
      const impressions = visits?.length ?? 0;
      const uniqueVisitors = new Set((visits || []).map((v: any) => v.session_id).filter(Boolean)).size;

      // Conversations / discussions
      const { count: convCount } = await supabase
        .from("conversations")
        .select("id", { count: "exact", head: true })
        .eq("product_id", productId)
        .gte("created_at", since)
        .lte("created_at", until);

      // Commandes & revenu
      const { data: orderRows } = await supabase
        .from("orders")
        .select("id,total_price,status")
        .eq("product_id", productId)
        .gte("created_at", since)
        .lte("created_at", until);
      const orders = orderRows?.length ?? 0;
      const EXCLUDED = new Set(["cancelled", "canceled", "refunded", "failed", "rejected"]);
      const revenue = (orderRows || [])
        .filter((o: any) => !EXCLUDED.has(String(o.status || "").toLowerCase()))
        .reduce((s: number, o: any) => s + (Number(o.total_price) || 0), 0);

      if (cancelled) return;
      setMetrics({
        impressions,
        uniqueVisitors,
        clicks: impressions,
        conversations: convCount ?? 0,
        orders,
        revenue,
      });
    })();
    return () => { cancelled = true; };
  }, [reference?.id, productId, period?.from, period?.to]);

  // Historique détaillé (conversations, commandes, visites) sur la période
  useEffect(() => {
    if (!reference || !period) { setHistory([]); return; }
    let cancelled = false;
    setHistoryLoading(true);
    (async () => {
      const since = period.from;
      const until = period.to;

      const [convRes, orderRes, visitRes] = await Promise.all([
        supabase
          .from("conversations")
          .select("id, created_at")
          .eq("product_id", productId)
          .gte("created_at", since)
          .lte("created_at", until)
          .order("created_at", { ascending: false })
          .limit(50),
        supabase
          .from("orders")
          .select("id, created_at, total_price, status, quantity")
          .eq("product_id", productId)
          .gte("created_at", since)
          .lte("created_at", until)
          .order("created_at", { ascending: false })
          .limit(50),
        supabase
          .from("analytics_visits")
          .select("id, created_at, page_path")
          .ilike("page_path", `%${productId}%`)
          .gte("created_at", since)
          .lte("created_at", until)
          .order("created_at", { ascending: false })
          .limit(50),
      ]);

      const items: Array<{ id: string; type: string; label: string; at: string }> = [];
      (convRes.data || []).forEach((c: any) =>
        items.push({ id: `c-${c.id}`, type: "Discussion", label: "Nouvelle conversation ouverte", at: c.created_at })
      );
      (orderRes.data || []).forEach((o: any) =>
        items.push({
          id: `o-${o.id}`,
          type: o.status === "cancelled" || o.status === "failed" ? "Essai d'achat" : "Commande",
          label: `${o.quantity || 1} unité(s) — ${(Number(o.total_price) || 0).toLocaleString("fr-FR")} F · ${o.status}`,
          at: o.created_at,
        })
      );
      (visitRes.data || []).forEach((v: any) =>
        items.push({ id: `v-${v.id}`, type: "Visite", label: "Vue de la fiche produit", at: v.created_at })
      );

      items.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
      if (!cancelled) {
        setHistory(items.slice(0, 100));
        setHistoryLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [reference?.id, productId, period?.from, period?.to]);

  if (isLoading) return null;

  if (!reference) {
    return (
      <Card className="border-dashed">
        <CardContent className="p-4 text-center text-xs text-muted-foreground">
          Aucun boost lancé sur ce produit.
        </CardContent>
      </Card>
    );
  }

  const start = new Date(reference.started_at).getTime();
  const end = new Date(reference.expires_at).getTime();
  const total = end - start;
  const elapsed = Math.max(0, Math.min(total, now - start));
  const percent = total > 0 ? Math.round((elapsed / total) * 100) : 0;
  const remainingMs = Math.max(0, end - now);
  const remainingDays = Math.floor(remainingMs / (1000 * 60 * 60 * 24));
  const remainingHours = Math.floor((remainingMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

  // Statut final pour boost terminé : on considère "réussi" s'il y a eu des impressions ou des commandes
  const isFinished = !!lastFinished;
  const m = metrics;
  const success = m ? (m.impressions > 0 || m.orders > 0) : false;
  const hasNoData = m && m.impressions === 0 && m.uniqueVisitors === 0 && m.conversations === 0 && m.orders === 0;

  // Couleur entête selon état
  const headerClass = isFinished
    ? success
      ? "bg-gradient-to-r from-emerald-500 to-emerald-600 text-white"
      : "bg-gradient-to-r from-destructive to-destructive/80 text-white"
    : "bg-gradient-to-r from-primary to-primary/80 text-primary-foreground";

  return (
    <Card className="overflow-hidden border-primary/30 shadow-elevated">
      <div className={`${headerClass} p-4`}>
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          {successMode || (isFinished && success) ? (
            <CheckCircle2 className="w-5 h-5" />
          ) : isFinished && !success ? (
            <XCircle className="w-5 h-5" />
          ) : (
            <Rocket className="w-5 h-5" />
          )}
          <span className="font-heading font-bold text-sm">
            {successMode
              ? "🚀 Boost activé avec succès"
              : isFinished
              ? success
                ? "✅ Boost terminé — Réussi"
                : "❌ Boost terminé — Sans impact"
              : "Boost actif"}
          </span>
          <Badge className="ml-auto bg-white/20 text-white border-0 text-[10px]">
            {reference.plan_name === "basic" ? "7 jours" : `${reference.days} jours`}
          </Badge>
        </div>
        {productName && (
          <p className="text-xs opacity-90 line-clamp-1">{productName}</p>
        )}
        {isFinished && !success && (
          <p className="text-[11px] mt-1.5 opacity-95 flex items-start gap-1">
            <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" />
            Raison probable : aucune visite enregistrée. Vérifiez la qualité de vos photos, le titre et le prix, puis relancez un boost.
          </p>
        )}
      </div>

      <CardContent className="p-4 space-y-3">
        {/* Progression dans le temps */}
        <div>
          <div className="flex items-center justify-between text-[11px] mb-1">
            <span className="text-muted-foreground flex items-center gap-1">
              <Clock className="w-3 h-3" /> {isFinished ? "Durée" : "Temps écoulé"}
            </span>
            <span className="font-semibold text-foreground">{percent}%</span>
          </div>
          <Progress value={percent} className="h-2" />
          <p className="text-[10px] text-muted-foreground mt-1">
            {isFinished
              ? `Terminé le ${formatDateTime(reference.expires_at)}`
              : remainingDays > 0
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
            <p className="font-semibold text-foreground">{formatDateTime(reference.started_at)}</p>
          </div>
          <div className="rounded-lg bg-muted/50 p-2">
            <p className="text-muted-foreground flex items-center gap-1 mb-0.5">
              <CalendarDays className="w-3 h-3" /> {isFinished ? "Terminé le" : "Expire le"}
            </p>
            <p className="font-semibold text-foreground">{formatDateTime(reference.expires_at)}</p>
          </div>
        </div>

        {/* Statistiques détaillées de mise en avant */}
        <div className="pt-2 border-t border-border">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1">
            <TrendingUp className="w-3 h-3" /> Performances détaillées
          </p>
          <div className="grid grid-cols-3 gap-2">
            <div className="text-center rounded-lg bg-muted/40 p-2">
              <Eye className="w-4 h-4 mx-auto text-primary mb-1" />
              <p className="text-sm font-bold text-foreground">{m?.impressions ?? "…"}</p>
              <p className="text-[9px] text-muted-foreground">Impressions</p>
            </div>
            <div className="text-center rounded-lg bg-muted/40 p-2">
              <Users className="w-4 h-4 mx-auto text-blue-500 mb-1" />
              <p className="text-sm font-bold text-foreground">{m?.uniqueVisitors ?? "…"}</p>
              <p className="text-[9px] text-muted-foreground">Visiteurs uniques</p>
            </div>
            <div className="text-center rounded-lg bg-muted/40 p-2">
              <MousePointerClick className="w-4 h-4 mx-auto text-amber-500 mb-1" />
              <p className="text-sm font-bold text-foreground">{m?.clicks ?? "…"}</p>
              <p className="text-[9px] text-muted-foreground">Clics fiche</p>
            </div>
            <div className="text-center rounded-lg bg-muted/40 p-2">
              <MessageCircle className="w-4 h-4 mx-auto text-green-600 mb-1" />
              <p className="text-sm font-bold text-foreground">{m?.conversations ?? "…"}</p>
              <p className="text-[9px] text-muted-foreground">Discussions</p>
            </div>
            <div className="text-center rounded-lg bg-muted/40 p-2">
              <ShoppingCart className="w-4 h-4 mx-auto text-primary mb-1" />
              <p className="text-sm font-bold text-foreground">{m?.orders ?? "…"}</p>
              <p className="text-[9px] text-muted-foreground">Commandes</p>
            </div>
            <div className="text-center rounded-lg bg-muted/40 p-2">
              <TrendingUp className="w-4 h-4 mx-auto text-emerald-600 mb-1" />
              <p className="text-sm font-bold text-foreground">
                {m ? (m.revenue > 0 ? `${(m.revenue / 1000).toFixed(0)}K` : "0") : "…"} F
              </p>
              <p className="text-[9px] text-muted-foreground">Revenus</p>
            </div>
          </div>
          {hasNoData && !isFinished && (
            <p className="text-[10px] text-muted-foreground mt-2 italic">
              Pas encore de données — donnez quelques heures au boost pour générer du trafic.
            </p>
          )}
        </div>

        {/* Tableau détaillé par métrique (auto-refresh pendant boost actif) */}
        <div className="pt-2 border-t border-border">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
              <TrendingUp className="w-3 h-3" /> Tableau détaillé
            </p>
            {active && (
              <Badge variant="secondary" className="text-[9px] h-4 px-1.5 gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Mise à jour auto
              </Badge>
            )}
          </div>
          <div className="rounded-md border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-[10px] h-8">Métrique</TableHead>
                  <TableHead className="text-[10px] h-8 text-right">Valeur</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="text-[11px] py-1.5"><span className="inline-flex items-center gap-1.5"><Eye className="w-3 h-3 text-primary" />Impressions</span></TableCell>
                  <TableCell className="text-[11px] py-1.5 text-right font-semibold">{m?.impressions ?? "…"}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="text-[11px] py-1.5"><span className="inline-flex items-center gap-1.5"><Users className="w-3 h-3 text-blue-500" />Visiteurs uniques</span></TableCell>
                  <TableCell className="text-[11px] py-1.5 text-right font-semibold">{m?.uniqueVisitors ?? "…"}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="text-[11px] py-1.5"><span className="inline-flex items-center gap-1.5"><MousePointerClick className="w-3 h-3 text-amber-500" />Clics fiche</span></TableCell>
                  <TableCell className="text-[11px] py-1.5 text-right font-semibold">{m?.clicks ?? "…"}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="text-[11px] py-1.5"><span className="inline-flex items-center gap-1.5"><MessageCircle className="w-3 h-3 text-green-600" />Discussions</span></TableCell>
                  <TableCell className="text-[11px] py-1.5 text-right font-semibold">{m?.conversations ?? "…"}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="text-[11px] py-1.5"><span className="inline-flex items-center gap-1.5"><ShoppingCart className="w-3 h-3 text-primary" />Commandes</span></TableCell>
                  <TableCell className="text-[11px] py-1.5 text-right font-semibold">{m?.orders ?? "…"}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="text-[11px] py-1.5"><span className="inline-flex items-center gap-1.5"><TrendingUp className="w-3 h-3 text-emerald-600" />Revenus générés</span></TableCell>
                  <TableCell className="text-[11px] py-1.5 text-right font-semibold">
                    {m ? `${(m.revenue || 0).toLocaleString("fr-FR")} F` : "…"}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Historique produit avec filtres date */}
        <div className="pt-2 border-t border-border">
          <div className="flex items-center justify-between mb-2 flex-wrap gap-1">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
              <History className="w-3 h-3" /> Historique produit ({history.length})
            </p>
            <div className="flex items-center gap-1">
              <Filter className="w-3 h-3 text-muted-foreground" />
              <Input
                type="date"
                value={filterFrom}
                onChange={(e) => setFilterFrom(e.target.value)}
                className="h-6 text-[10px] px-1.5 w-[110px]"
                aria-label="Date de début"
              />
              <span className="text-[10px] text-muted-foreground">→</span>
              <Input
                type="date"
                value={filterTo}
                onChange={(e) => setFilterTo(e.target.value)}
                className="h-6 text-[10px] px-1.5 w-[110px]"
                aria-label="Date de fin"
              />
              {(filterFrom || filterTo) && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-[9px] px-1.5"
                  onClick={() => { setFilterFrom(""); setFilterTo(""); }}
                >
                  Reset
                </Button>
              )}
            </div>
          </div>
          {historyLoading ? (
            <p className="text-[10px] text-muted-foreground italic py-2">Chargement de l'historique…</p>
          ) : history.length === 0 ? (
            <p className="text-[10px] text-muted-foreground italic py-2">Aucune activité sur cette période.</p>
          ) : (
            <ul className="space-y-1 max-h-48 overflow-y-auto pr-1">
              {history.map((h) => {
                const Icon =
                  h.type === "Discussion" ? MessageCircle :
                  h.type === "Commande" ? ShoppingCart :
                  h.type === "Essai d'achat" ? AlertTriangle :
                  h.type === "Appel" ? Phone : Eye;
                return (
                  <li key={h.id} className="flex items-start gap-2 text-[10px] py-1 px-2 rounded bg-muted/30">
                    <Icon className="w-3 h-3 mt-0.5 text-primary flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-foreground truncate">{h.type}</p>
                      <p className="text-muted-foreground truncate">{h.label}</p>
                    </div>
                    <span className="text-muted-foreground whitespace-nowrap text-[9px]">
                      {formatDateTime(h.at)}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
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
                const isRef = b.id === reference.id;
                const ended = new Date(b.expires_at).getTime() <= now;
                return (
                  <li
                    key={b.id}
                    className="flex items-center justify-between text-[10px] py-1 px-2 rounded bg-muted/30"
                  >
                    <span className="text-muted-foreground">
                      {formatDateTime(b.started_at)} · {b.days}j
                    </span>
                    <Badge
                      variant={isRef && !ended ? "default" : "secondary"}
                      className="text-[9px] h-4 px-1.5"
                    >
                      {!ended ? "Actif" : "Terminé"}
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
