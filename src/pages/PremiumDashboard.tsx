import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/contexts/ProfileContext";
import { useSubscription } from "@/hooks/useSubscription";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import MobileBottomNav from "@/components/layout/MobileBottomNav";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft, BarChart3, Headphones, Code2, Crown, Loader2, Copy, Plus, Trash2, KeyRound, Send,
  MessageSquare, Lock, Download, AlertTriangle, Activity, TrendingUp, Sparkles
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar,
  LineChart, Line, PieChart, Pie, Cell, Legend
} from "recharts";

const PREMIUM_PLANS = ["pro", "premium", "business"];
const COLORS = ["hsl(var(--primary))", "hsl(var(--secondary))", "hsl(var(--accent))", "hsl(var(--destructive))"];

function generateApiKey() {
  const arr = new Uint8Array(24);
  crypto.getRandomValues(arr);
  const hex = Array.from(arr).map((b) => b.toString(16).padStart(2, "0")).join("");
  return `nuku_live_${hex}`;
}
async function sha256Hex(s: string) {
  const buf = new TextEncoder().encode(s);
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function downloadFile(name: string, content: string, mime = "text/csv") {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

const PremiumDashboard = () => {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") || "analytics";
  const { user, profile, isReady } = useProfile();
  const { subscription, isLoading: subLoading, refreshSubscription } = useSubscription();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [apiKeys, setApiKeys] = useState<any[]>([]);
  const [apiUsage, setApiUsage] = useState<any[]>([]);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [creatingKey, setCreatingKey] = useState(false);
  const [supportMsg, setSupportMsg] = useState("");
  const [supportThread, setSupportThread] = useState<any[]>([]);
  const [sending, setSending] = useState(false);
  const [aiThinking, setAiThinking] = useState(false);

  const planKey = (subscription?.plan || "free").toLowerCase();
  const isPremium = PREMIUM_PLANS.includes(planKey);
  const expiresAt = subscription && (subscription as any).expires_at ? new Date((subscription as any).expires_at) : null;
  const isExpired = expiresAt ? expiresAt.getTime() < Date.now() : false;
  const daysLeft = expiresAt ? Math.ceil((expiresAt.getTime() - Date.now()) / 86400000) : null;

  useEffect(() => {
    if (!isReady) return;
    if (!user) { navigate("/auth", { replace: true }); return; }

    const load = async () => {
      if (!profile) return;
      const [ordersRes, productsRes, keysRes, threadRes, usageRes] = await Promise.all([
        supabase.from("orders").select("*").eq("seller_id", profile.id).order("created_at", { ascending: false }).limit(500),
        supabase.from("products").select("id, name, category, created_at").eq("producer_id", profile.id),
        supabase.from("api_keys" as any).select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
        supabase.from("support_messages").select("*").eq("user_id", user.id).order("created_at", { ascending: true }).limit(100),
        supabase.from("api_key_usage" as any).select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(100),
      ]);
      setOrders(ordersRes.data || []);
      setProducts(productsRes.data || []);
      setApiKeys((keysRes.data as any[]) || []);
      setSupportThread(threadRes.data || []);
      setApiUsage((usageRes.data as any[]) || []);
      setLoading(false);
    };
    load();
  }, [isReady, user, profile, navigate]);

  // Realtime support thread + subscription updates
  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel("premium-realtime-" + user.id)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "support_messages", filter: `user_id=eq.${user.id}` },
        (payload) => setSupportThread((prev) => [...prev, payload.new]))
      .on("postgres_changes", { event: "*", schema: "public", table: "subscriptions", filter: `user_id=eq.${user.id}` },
        () => refreshSubscription())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, refreshSubscription]);

  // ============ Analytics ============
  const analytics = useMemo(() => {
    const last30 = Array.from({ length: 30 }, (_, i) => {
      const d = new Date(); d.setDate(d.getDate() - (29 - i));
      const key = d.toISOString().slice(0, 10);
      return { date: key, label: d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" }), revenue: 0, orders: 0 };
    });
    const map = new Map(last30.map((d) => [d.date, d]));
    let totalRevenue = 0, totalOrders = 0, completed = 0, cancelled = 0;
    const byCategory: Record<string, number> = {};
    const byStatus: Record<string, number> = {};
    const byHour: Record<number, number> = {};
    orders.forEach((o) => {
      const k = (o.created_at || "").slice(0, 10);
      const slot = map.get(k);
      const rev = Number(o.total_price) || 0;
      if (slot) { slot.revenue += rev; slot.orders += 1; }
      totalRevenue += rev;
      totalOrders += 1;
      if (o.status === "completed") completed += 1;
      if (o.status === "cancelled") cancelled += 1;
      byStatus[o.status] = (byStatus[o.status] || 0) + 1;
      const prod = products.find((p) => p.id === o.product_id);
      if (prod) byCategory[prod.category] = (byCategory[prod.category] || 0) + rev;
      const hr = new Date(o.created_at).getHours();
      byHour[hr] = (byHour[hr] || 0) + 1;
    });
    const aov = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    const conversionRate = totalOrders > 0 ? (completed / totalOrders) * 100 : 0;
    const cancelRate = totalOrders > 0 ? (cancelled / totalOrders) * 100 : 0;
    const catData = Object.entries(byCategory).map(([name, revenue]) => ({ name, revenue }));
    const statusData = Object.entries(byStatus).map(([name, value]) => ({ name, value }));
    const hourData = Array.from({ length: 24 }, (_, h) => ({ hour: `${h}h`, orders: byHour[h] || 0 }));
    const last7 = last30.slice(-7);
    const avg7 = last7.reduce((s, d) => s + d.revenue, 0) / 7;
    const forecast30 = avg7 * 30;
    // Top 5 products by revenue
    const productRev: Record<string, { name: string; revenue: number; count: number }> = {};
    orders.forEach((o) => {
      const p = products.find((pp) => pp.id === o.product_id);
      if (!p) return;
      productRev[p.id] = productRev[p.id] || { name: p.name, revenue: 0, count: 0 };
      productRev[p.id].revenue += Number(o.total_price) || 0;
      productRev[p.id].count += 1;
    });
    const topProducts = Object.values(productRev).sort((a, b) => b.revenue - a.revenue).slice(0, 5);
    return { series: last30, totalRevenue, totalOrders, aov, catData, forecast30, conversionRate, cancelRate, statusData, hourData, topProducts };
  }, [orders, products]);

  const exportAnalyticsCSV = () => {
    const rows = [
      ["Métrique", "Valeur"],
      ["Plan actif", planKey],
      ["Période", "30 derniers jours"],
      ["Revenu total (FCFA)", Math.round(analytics.totalRevenue).toString()],
      ["Commandes", analytics.totalOrders.toString()],
      ["Panier moyen (FCFA)", Math.round(analytics.aov).toString()],
      ["Taux de conversion (%)", analytics.conversionRate.toFixed(2)],
      ["Taux d'annulation (%)", analytics.cancelRate.toFixed(2)],
      ["Prévision IA 30j (FCFA)", Math.round(analytics.forecast30).toString()],
      [],
      ["Date", "Revenu", "Commandes"],
      ...analytics.series.map((s) => [s.date, s.revenue.toString(), s.orders.toString()]),
      [],
      ["Top produits", "Revenu", "Commandes"],
      ...analytics.topProducts.map((p) => [p.name, p.revenue.toString(), p.count.toString()]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${(c || "").toString().replace(/"/g, '""')}"`).join(",")).join("\n");
    downloadFile(`nukuconnect-analytics-${new Date().toISOString().slice(0, 10)}.csv`, csv);
    toast({ title: "Rapport exporté", description: "CSV téléchargé." });
  };

  const exportAnalyticsHTML = () => {
    const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><title>Rapport NukuConnect</title>
<style>body{font-family:system-ui;padding:40px;color:#222}h1{color:#0f5132}table{border-collapse:collapse;width:100%;margin-top:16px}th,td{border:1px solid #ddd;padding:8px;text-align:left;font-size:13px}th{background:#f4f4f4}.kpi{display:inline-block;margin:8px 16px 8px 0;padding:12px 16px;background:#f9f9f9;border-radius:8px}.kpi b{display:block;font-size:18px;color:#0f5132}</style></head>
<body>
<h1>Rapport Analytics — NukuConnect Premium</h1>
<p>Plan : <strong>${planKey}</strong> · Période : 30 derniers jours · Généré le ${new Date().toLocaleString("fr-FR")}</p>
<div>
  <div class="kpi"><b>${Math.round(analytics.totalRevenue).toLocaleString()} F</b>Revenu</div>
  <div class="kpi"><b>${analytics.totalOrders}</b>Commandes</div>
  <div class="kpi"><b>${Math.round(analytics.aov).toLocaleString()} F</b>Panier moyen</div>
  <div class="kpi"><b>${analytics.conversionRate.toFixed(1)}%</b>Conversion</div>
  <div class="kpi"><b>${Math.round(analytics.forecast30).toLocaleString()} F</b>Prévision 30j (IA)</div>
</div>
<h2>Top produits</h2>
<table><thead><tr><th>Produit</th><th>Revenu</th><th>Commandes</th></tr></thead><tbody>
${analytics.topProducts.map((p) => `<tr><td>${p.name}</td><td>${p.revenue.toLocaleString()} F</td><td>${p.count}</td></tr>`).join("")}
</tbody></table>
<h2>Évolution journalière</h2>
<table><thead><tr><th>Date</th><th>Revenu</th><th>Commandes</th></tr></thead><tbody>
${analytics.series.map((s) => `<tr><td>${s.date}</td><td>${s.revenue.toLocaleString()} F</td><td>${s.orders}</td></tr>`).join("")}
</tbody></table>
<p style="margin-top:32px;font-size:11px;color:#888">© NukuConnect — Rapport confidentiel.</p>
<script>window.print()</script>
</body></html>`;
    const w = window.open("", "_blank");
    if (w) { w.document.write(html); w.document.close(); }
    toast({ title: "Rapport prêt", description: "Imprimez ou enregistrez en PDF depuis la fenêtre." });
  };

  // ============ API Keys ============
  const createKey = async () => {
    if (!user) return;
    setCreatingKey(true);
    const raw = generateApiKey();
    const hash = await sha256Hex(raw);
    const prefix = raw.slice(0, 14);
    const { error } = await supabase.from("api_keys" as any).insert({
      user_id: user.id, name: `Clé du ${new Date().toLocaleDateString("fr-FR")}`,
      key_prefix: prefix, key_hash: hash,
    });
    setCreatingKey(false);
    if (error) { toast({ title: "Erreur", description: error.message, variant: "destructive" }); return; }
    setNewKey(raw);
    const { data } = await supabase.from("api_keys" as any).select("*").eq("user_id", user.id).order("created_at", { ascending: false });
    setApiKeys((data as any[]) || []);
    toast({ title: "Clé créée", description: "Copiez-la maintenant, elle ne sera plus affichée." });
  };

  const revokeKey = async (id: string) => {
    if (!confirm("Révoquer cette clé ? Les intégrations qui l'utilisent cesseront de fonctionner.")) return;
    const { error } = await supabase.from("api_keys" as any).update({ is_active: false, revoked_at: new Date().toISOString() }).eq("id", id);
    if (error) { toast({ title: "Erreur", description: error.message, variant: "destructive" }); return; }
    setApiKeys((prev) => prev.map((k) => (k.id === id ? { ...k, is_active: false } : k)));
    toast({ title: "Clé révoquée" });
  };

  const copyKey = async (s: string) => {
    await navigator.clipboard.writeText(s);
    toast({ title: "Copié dans le presse-papiers" });
  };

  // ============ Account Manager (with AI auto-reply) ============
  const sendSupport = async () => {
    if (!user || !supportMsg.trim()) return;
    const message = supportMsg.trim();
    setSending(true);
    const { error } = await supabase.from("support_messages").insert({
      user_id: user.id, content: message, sender_role: "user",
      user_name: profile?.full_name || null, subject: "Demande Account Manager (Premium)",
    });
    setSending(false);
    if (error) { toast({ title: "Erreur", description: error.message, variant: "destructive" }); return; }
    setSupportMsg("");

    // Trigger AI auto-reply
    setAiThinking(true);
    try {
      await supabase.functions.invoke("advisor-ai-reply", {
        body: { user_id: user.id, user_message: message },
      });
    } catch (e) {
      console.error(e);
    } finally {
      setAiThinking(false);
    }
  };

  const apiEndpoint = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/api-public`;

  if (subLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!isPremium) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <main className="flex-1 max-w-3xl mx-auto px-4 py-12 w-full">
          <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")} className="mb-4 gap-1.5">
            <ArrowLeft className="w-4 h-4" /> Retour au tableau de bord
          </Button>
          <Card className="border-amber-500/30 bg-gradient-to-br from-amber-500/5 to-transparent">
            <CardContent className="p-6 sm:p-10 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-amber-500/15 mx-auto flex items-center justify-center">
                <Lock className="w-8 h-8 text-amber-500" />
              </div>
              <h1 className="text-xl sm:text-2xl font-bold">Espace Premium réservé</h1>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Les Analytics avancées, l'Account manager dédié et l'intégration API sont disponibles avec un abonnement <strong>Pro</strong>, <strong>Premium</strong> ou <strong>Business</strong>.
              </p>
              <Link to="/plans">
                <Button variant="hero" className="gap-2"><Crown className="w-4 h-4" /> Passer Premium</Button>
              </Link>
            </CardContent>
          </Card>
        </main>
        <Footer />
        <MobileBottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1 max-w-6xl mx-auto px-3 sm:px-4 py-4 sm:py-8 w-full pb-20 lg:pb-8">
        {/* Back button */}
        <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")} className="mb-3 gap-1.5 text-xs h-8 -ml-2">
          <ArrowLeft className="w-4 h-4" /> Retour au tableau de bord
        </Button>

        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <Crown className="w-5 h-5 text-amber-500" />
          <h1 className="text-lg sm:text-2xl font-bold">Espace Premium</h1>
          <Badge className="bg-amber-500/20 text-amber-700 dark:text-amber-300 ml-auto text-[10px] capitalize">{planKey}</Badge>
          {expiresAt && !isExpired && daysLeft !== null && daysLeft <= 7 && (
            <Badge variant="outline" className="text-[10px] border-amber-500/40 text-amber-700">
              ⏳ {daysLeft}j restants
            </Badge>
          )}
          {isExpired && <Badge variant="destructive" className="text-[10px]">Expiré</Badge>}
        </div>

        {/* Expired state banner */}
        {isExpired && (
          <Card className="mb-4 border-destructive/40 bg-destructive/5">
            <CardContent className="p-4 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-destructive">Votre abonnement {planKey} a expiré</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Vos produits restent visibles, mais l'accès aux fonctionnalités premium (analytics, conseiller IA, API) est limité. Renouvelez pour réactiver.
                </p>
                <div className="flex gap-2 mt-3 flex-wrap">
                  <Link to="/plans"><Button size="sm" variant="hero" className="gap-1 h-8 text-xs"><Crown className="w-3.5 h-3.5" /> Renouveler</Button></Link>
                  <Link to="/jetons"><Button size="sm" variant="outline" className="h-8 text-xs">Recharger jetons</Button></Link>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Tabs value={tab} onValueChange={(v) => setParams({ tab: v })} className="space-y-4">
          <TabsList className="grid grid-cols-3 w-full max-w-xl">
            <TabsTrigger value="analytics" className="gap-1.5 text-xs"><BarChart3 className="w-3.5 h-3.5" /> Analytics</TabsTrigger>
            <TabsTrigger value="manager" className="gap-1.5 text-xs"><Headphones className="w-3.5 h-3.5" /> Conseiller IA</TabsTrigger>
            <TabsTrigger value="api" className="gap-1.5 text-xs"><Code2 className="w-3.5 h-3.5" /> API</TabsTrigger>
          </TabsList>

          {/* ======================= ANALYTICS ======================= */}
          <TabsContent value="analytics" className="space-y-4">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <p className="text-xs text-muted-foreground">Données réelles sur 30 jours.</p>
              <div className="flex gap-2">
                <Button onClick={exportAnalyticsCSV} variant="outline" size="sm" className="h-8 text-xs gap-1"><Download className="w-3.5 h-3.5" /> CSV</Button>
                <Button onClick={exportAnalyticsHTML} variant="outline" size="sm" className="h-8 text-xs gap-1"><Download className="w-3.5 h-3.5" /> Rapport PDF</Button>
              </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { label: "Revenu 30j", value: `${Math.round(analytics.totalRevenue).toLocaleString()} F`, color: "text-primary" },
                { label: "Commandes", value: analytics.totalOrders, color: "text-secondary" },
                { label: "Panier moyen", value: `${Math.round(analytics.aov).toLocaleString()} F`, color: "text-amber-600" },
                { label: "Prévision 30j", value: `${Math.round(analytics.forecast30).toLocaleString()} F`, color: "text-emerald-600" },
                { label: "Conversion", value: `${analytics.conversionRate.toFixed(1)}%`, color: "text-blue-600" },
                { label: "Annulations", value: `${analytics.cancelRate.toFixed(1)}%`, color: "text-destructive" },
                { label: "Produits actifs", value: products.length, color: "text-foreground" },
                { label: "Top produit", value: analytics.topProducts[0]?.name?.slice(0, 14) || "—", color: "text-foreground" },
              ].map((s, i) => (
                <Card key={i}>
                  <CardContent className="p-3">
                    <p className="text-[10px] text-muted-foreground">{s.label}</p>
                    <p className={`text-sm sm:text-base font-bold ${s.color}`}>{s.value}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card>
              <CardHeader className="p-3 sm:p-4 pb-2">
                <CardTitle className="text-sm">Évolution du revenu (30 derniers jours)</CardTitle>
              </CardHeader>
              <CardContent className="p-2 sm:p-4 pt-0">
                <ResponsiveContainer width="100%" height={240}>
                  <AreaChart data={analytics.series}>
                    <defs>
                      <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                        <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={10} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} />
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", color: "hsl(var(--foreground))", fontSize: 12 }} />
                    <Area type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" fill="url(#rev)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="p-3 sm:p-4 pb-2">
                  <CardTitle className="text-sm">Activité par heure</CardTitle>
                  <CardDescription className="text-[11px]">Identifiez vos pics de commande.</CardDescription>
                </CardHeader>
                <CardContent className="p-2 sm:p-4 pt-0">
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={analytics.hourData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="hour" stroke="hsl(var(--muted-foreground))" fontSize={9} interval={2} />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} />
                      <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", color: "hsl(var(--foreground))", fontSize: 12 }} />
                      <Line type="monotone" dataKey="orders" stroke="hsl(var(--secondary))" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="p-3 sm:p-4 pb-2">
                  <CardTitle className="text-sm">Statuts des commandes</CardTitle>
                </CardHeader>
                <CardContent className="p-2 sm:p-4 pt-0">
                  {analytics.statusData.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-8">Aucune donnée.</p>
                  ) : (
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie data={analytics.statusData} dataKey="value" nameKey="name" outerRadius={70} label={(e: any) => e.name}>
                          {analytics.statusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                        </Pie>
                        <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", color: "hsl(var(--foreground))", fontSize: 12 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader className="p-3 sm:p-4 pb-2">
                <CardTitle className="text-sm flex items-center gap-2"><TrendingUp className="w-4 h-4 text-primary" /> Top 5 produits</CardTitle>
              </CardHeader>
              <CardContent className="p-2 sm:p-4 pt-0">
                {analytics.topProducts.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-6">Aucune vente encore.</p>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={analytics.topProducts} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={10} />
                      <YAxis dataKey="name" type="category" stroke="hsl(var(--muted-foreground))" fontSize={10} width={100} />
                      <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", color: "hsl(var(--foreground))", fontSize: 12 }} />
                      <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[0, 6, 6, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="p-3 sm:p-4 pb-2">
                <CardTitle className="text-sm">Répartition par catégorie</CardTitle>
              </CardHeader>
              <CardContent className="p-2 sm:p-4 pt-0">
                {analytics.catData.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-8">Aucune commande encore.</p>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={analytics.catData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={10} />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} />
                      <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", color: "hsl(var(--foreground))", fontSize: 12 }} />
                      <Bar dataKey="revenue" fill="hsl(var(--secondary))" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ======================= ACCOUNT MANAGER (AI auto-reply) ======================= */}
          <TabsContent value="manager" className="space-y-4">
            <Card>
              <CardHeader className="p-3 sm:p-4 pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" /> Nuku Conseiller (réponses IA instantanées)
                </CardTitle>
                <CardDescription className="text-[11px]">
                  Réponses automatiques sous quelques secondes, propulsées par Nuku AI. Un humain reprend la main si besoin.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-3 sm:p-4 pt-0 space-y-3">
                <div className="border border-border rounded-lg bg-muted/30 max-h-[420px] overflow-y-auto p-3 space-y-2">
                  {supportThread.length === 0 ? (
                    <div className="text-center py-8">
                      <MessageSquare className="w-8 h-8 mx-auto text-muted-foreground/40 mb-2" />
                      <p className="text-xs text-muted-foreground">Démarrez la conversation. L'IA répond instantanément.</p>
                    </div>
                  ) : (
                    supportThread.map((m) => (
                      <div key={m.id} className={`flex ${m.sender_role === "admin" ? "justify-start" : "justify-end"}`}>
                        <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-xs ${m.sender_role === "admin" ? "bg-primary/10 text-foreground" : "bg-primary text-primary-foreground"}`}>
                          {m.sender_role === "admin" && m.user_name && <p className="text-[9px] font-semibold opacity-70 mb-0.5">{m.user_name}</p>}
                          <p className="whitespace-pre-wrap">{m.content}</p>
                          <p className="text-[9px] opacity-70 mt-0.5">{new Date(m.created_at).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}</p>
                        </div>
                      </div>
                    ))
                  )}
                  {aiThinking && (
                    <div className="flex justify-start">
                      <div className="bg-primary/10 rounded-2xl px-3 py-2 text-xs flex items-center gap-2">
                        <Loader2 className="w-3 h-3 animate-spin" /> Nuku Conseiller réfléchit…
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="Posez votre question…"
                    value={supportMsg}
                    onChange={(e) => setSupportMsg(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendSupport(); } }}
                    className="text-xs h-9"
                    disabled={sending || aiThinking}
                  />
                  <Button onClick={sendSupport} disabled={sending || aiThinking || !supportMsg.trim()} variant="hero" size="sm" className="gap-1">
                    {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ======================= API ======================= */}
          <TabsContent value="api" className="space-y-4">
            <Card>
              <CardHeader className="p-3 sm:p-4 pb-2 flex flex-row items-center justify-between gap-2">
                <div className="min-w-0">
                  <CardTitle className="text-sm flex items-center gap-2"><Code2 className="w-4 h-4 text-primary" /> Clés API</CardTitle>
                  <CardDescription className="text-[11px] break-all">
                    Endpoint : <code className="text-[10px] bg-muted px-1 rounded">{apiEndpoint}</code>
                  </CardDescription>
                </div>
                <Button onClick={createKey} disabled={creatingKey} variant="hero" size="sm" className="gap-1 text-xs h-8 flex-shrink-0">
                  {creatingKey ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />} Créer
                </Button>
              </CardHeader>
              <CardContent className="p-3 sm:p-4 pt-0 space-y-2">
                {newKey && (
                  <div className="border-2 border-amber-500/40 bg-amber-500/5 rounded-lg p-3">
                    <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 mb-1">⚠️ Copiez cette clé maintenant — elle ne sera plus affichée.</p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 text-[11px] bg-card border border-border rounded px-2 py-1.5 break-all">{newKey}</code>
                      <Button size="sm" variant="outline" className="h-8 gap-1" onClick={() => copyKey(newKey)}>
                        <Copy className="w-3 h-3" /> Copier
                      </Button>
                    </div>
                    <Button variant="ghost" size="sm" className="text-[10px] mt-2" onClick={() => setNewKey(null)}>J'ai sauvegardé la clé</Button>
                  </div>
                )}

                {apiKeys.length === 0 && !newKey ? (
                  <div className="text-center py-8">
                    <KeyRound className="w-8 h-8 mx-auto text-muted-foreground/40 mb-2" />
                    <p className="text-xs text-muted-foreground">Aucune clé API. Créez-en une pour commencer.</p>
                  </div>
                ) : (
                  apiKeys.map((k) => (
                    <div key={k.id} className="flex items-center justify-between gap-2 p-2.5 border border-border rounded-lg">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold flex items-center gap-2">
                          {k.name}
                          {!k.is_active && <Badge variant="destructive" className="text-[9px]">Révoquée</Badge>}
                          {k.is_active && k.last_used_at && (
                            <Badge variant="outline" className="text-[9px]">Utilisée {new Date(k.last_used_at).toLocaleDateString("fr-FR")}</Badge>
                          )}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          <code>{k.key_prefix}…</code> • Créée le {new Date(k.created_at).toLocaleDateString("fr-FR")}
                        </p>
                      </div>
                      {k.is_active && (
                        <Button variant="ghost" size="sm" onClick={() => revokeKey(k.id)} className="h-7 text-destructive hover:text-destructive hover:bg-destructive/10">
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* API Usage History */}
            <Card>
              <CardHeader className="p-3 sm:p-4 pb-2">
                <CardTitle className="text-sm flex items-center gap-2"><Activity className="w-4 h-4 text-primary" /> Historique d'utilisation</CardTitle>
                <CardDescription className="text-[11px]">100 derniers appels.</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {apiUsage.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-8">Aucun appel API enregistré.</p>
                ) : (
                  <div className="max-h-[300px] overflow-y-auto divide-y divide-border">
                    {apiUsage.map((u) => (
                      <div key={u.id} className="flex items-center gap-2 p-2 text-[11px] hover:bg-muted/30">
                        <Badge variant="outline" className="text-[9px] h-4 font-mono">{u.method}</Badge>
                        <code className="flex-1 truncate text-muted-foreground">{u.endpoint}</code>
                        <Badge variant={u.status_code >= 400 ? "destructive" : "outline"} className="text-[9px] h-4">{u.status_code}</Badge>
                        <span className="text-[9px] text-muted-foreground whitespace-nowrap">{new Date(u.created_at).toLocaleTimeString("fr-FR")}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="p-3 sm:p-4 pb-2">
                <CardTitle className="text-sm">Documentation rapide</CardTitle>
              </CardHeader>
              <CardContent className="p-3 sm:p-4 pt-0 text-xs space-y-2">
                <p className="text-muted-foreground">Authentifiez-vous avec un en-tête <code className="bg-muted px-1 rounded">Authorization: Bearer VOTRE_CLE</code>.</p>
                <pre className="bg-muted/40 border border-border p-2 rounded text-[10px] overflow-x-auto">
{`curl ${apiEndpoint}/products \\
  -H "Authorization: Bearer nuku_live_XXXX..."`}
                </pre>
                <p className="text-muted-foreground">Endpoints : <code>/products</code>, <code>/orders</code>, <code>/inventory</code>.</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
      <Footer />
      <MobileBottomNav />
    </div>
  );
};

export default PremiumDashboard;
