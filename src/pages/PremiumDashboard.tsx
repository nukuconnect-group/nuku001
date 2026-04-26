import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
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
import { BarChart3, Headphones, Code2, Crown, Loader2, Copy, Plus, Trash2, KeyRound, Send, MessageSquare, Lock } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from "recharts";
import { Link } from "react-router-dom";

const PREMIUM_PLANS = ["pro", "premium", "business"];

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

const PremiumDashboard = () => {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") || "analytics";
  const { user, profile, isReady } = useProfile();
  const { subscription, isLoading: subLoading } = useSubscription();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [apiKeys, setApiKeys] = useState<any[]>([]);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [creatingKey, setCreatingKey] = useState(false);
  const [supportMsg, setSupportMsg] = useState("");
  const [supportThread, setSupportThread] = useState<any[]>([]);
  const [sending, setSending] = useState(false);

  const planKey = (subscription?.plan || "free").toLowerCase();
  const isPremium = PREMIUM_PLANS.includes(planKey);

  useEffect(() => {
    if (!isReady) return;
    if (!user) { navigate("/auth", { replace: true }); return; }

    const load = async () => {
      if (!profile) return;
      const [ordersRes, productsRes, keysRes, threadRes] = await Promise.all([
        supabase.from("orders").select("*").eq("seller_id", profile.id).order("created_at", { ascending: false }).limit(500),
        supabase.from("products").select("id, name, category, created_at").eq("producer_id", profile.id),
        supabase.from("api_keys" as any).select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
        supabase.from("support_messages").select("*").eq("user_id", user.id).order("created_at", { ascending: true }).limit(100),
      ]);
      setOrders(ordersRes.data || []);
      setProducts(productsRes.data || []);
      setApiKeys((keysRes.data as any[]) || []);
      setSupportThread(threadRes.data || []);
      setLoading(false);
    };
    load();
  }, [isReady, user, profile, navigate]);

  // Realtime support thread
  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel("premium-support-" + user.id)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "support_messages", filter: `user_id=eq.${user.id}` }, (payload) => {
        setSupportThread((prev) => [...prev, payload.new]);
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user]);

  // ============ Analytics derived data ============
  const analytics = useMemo(() => {
    const last30 = Array.from({ length: 30 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (29 - i));
      const key = d.toISOString().slice(0, 10);
      return { date: key, label: d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" }), revenue: 0, orders: 0 };
    });
    const map = new Map(last30.map((d) => [d.date, d]));
    let totalRevenue = 0, totalOrders = 0;
    const byCategory: Record<string, number> = {};
    orders.forEach((o) => {
      const k = (o.created_at || "").slice(0, 10);
      const slot = map.get(k);
      if (slot) {
        slot.revenue += Number(o.total_price) || 0;
        slot.orders += 1;
      }
      totalRevenue += Number(o.total_price) || 0;
      totalOrders += 1;
      const prod = products.find((p) => p.id === o.product_id);
      if (prod) byCategory[prod.category] = (byCategory[prod.category] || 0) + (Number(o.total_price) || 0);
    });
    const aov = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    const catData = Object.entries(byCategory).map(([name, revenue]) => ({ name, revenue }));
    // Forecast simple: moyenne 7 derniers jours * 30
    const last7 = last30.slice(-7);
    const avg7 = last7.reduce((s, d) => s + d.revenue, 0) / 7;
    const forecast30 = avg7 * 30;
    return { series: last30, totalRevenue, totalOrders, aov, catData, forecast30 };
  }, [orders, products]);

  // ============ API Keys handlers ============
  const createKey = async () => {
    if (!user) return;
    setCreatingKey(true);
    const raw = generateApiKey();
    const hash = await sha256Hex(raw);
    const prefix = raw.slice(0, 14);
    const { error } = await supabase.from("api_keys" as any).insert({
      user_id: user.id,
      name: `Clé du ${new Date().toLocaleDateString("fr-FR")}`,
      key_prefix: prefix,
      key_hash: hash,
    });
    setCreatingKey(false);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      return;
    }
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

  // ============ Account Manager (support prio) ============
  const sendSupport = async () => {
    if (!user || !supportMsg.trim()) return;
    setSending(true);
    const { error } = await supabase.from("support_messages").insert({
      user_id: user.id,
      content: supportMsg.trim(),
      sender_role: "user",
      user_name: profile?.full_name || null,
      subject: "Demande Account Manager (Premium)",
    });
    setSending(false);
    if (error) { toast({ title: "Erreur", description: error.message, variant: "destructive" }); return; }
    setSupportMsg("");
    toast({ title: "Message envoyé", description: "Votre conseiller vous répondra rapidement." });
  };

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
                <Button variant="hero" className="gap-2">
                  <Crown className="w-4 h-4" /> Passer Premium
                </Button>
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
        <div className="flex items-center gap-2 mb-4">
          <Crown className="w-5 h-5 text-amber-500" />
          <h1 className="text-lg sm:text-2xl font-bold">Espace Premium</h1>
          <Badge className="bg-amber-500/20 text-amber-700 dark:text-amber-300 ml-auto text-[10px] capitalize">{planKey}</Badge>
        </div>

        <Tabs value={tab} onValueChange={(v) => setParams({ tab: v })} className="space-y-4">
          <TabsList className="grid grid-cols-3 w-full max-w-xl">
            <TabsTrigger value="analytics" className="gap-1.5 text-xs"><BarChart3 className="w-3.5 h-3.5" /> Analytics</TabsTrigger>
            <TabsTrigger value="manager" className="gap-1.5 text-xs"><Headphones className="w-3.5 h-3.5" /> Conseiller</TabsTrigger>
            <TabsTrigger value="api" className="gap-1.5 text-xs"><Code2 className="w-3.5 h-3.5" /> API</TabsTrigger>
          </TabsList>

          {/* ======================= ANALYTICS ======================= */}
          <TabsContent value="analytics" className="space-y-4">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { label: "Revenu 30j", value: `${Math.round(analytics.totalRevenue).toLocaleString()} F`, color: "text-primary" },
                { label: "Commandes 30j", value: analytics.totalOrders, color: "text-secondary" },
                { label: "Panier moyen", value: `${Math.round(analytics.aov).toLocaleString()} F`, color: "text-amber-600" },
                { label: "Prévision 30j (IA)", value: `${Math.round(analytics.forecast30).toLocaleString()} F`, color: "text-emerald-600" },
              ].map((s, i) => (
                <Card key={i}>
                  <CardContent className="p-3">
                    <p className="text-[10px] text-muted-foreground">{s.label}</p>
                    <p className={`text-base sm:text-lg font-bold ${s.color}`}>{s.value}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card>
              <CardHeader className="p-3 sm:p-4 pb-2">
                <CardTitle className="text-sm">Évolution du revenu (30 derniers jours)</CardTitle>
                <CardDescription className="text-[11px]">Données réelles de vos commandes</CardDescription>
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
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", fontSize: 12 }} />
                    <Area type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" fill="url(#rev)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
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
                      <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", fontSize: 12 }} />
                      <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ======================= ACCOUNT MANAGER ======================= */}
          <TabsContent value="manager" className="space-y-4">
            <Card>
              <CardHeader className="p-3 sm:p-4 pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Headphones className="w-4 h-4 text-primary" /> Votre conseiller dédié
                </CardTitle>
                <CardDescription className="text-[11px]">
                  Réponse prioritaire sous 4h ouvrées. Vos messages sont vus par l'équipe NukuConnect.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-3 sm:p-4 pt-0 space-y-3">
                <div className="border border-border rounded-lg bg-muted/30 max-h-[360px] overflow-y-auto p-3 space-y-2">
                  {supportThread.length === 0 ? (
                    <div className="text-center py-8">
                      <MessageSquare className="w-8 h-8 mx-auto text-muted-foreground/40 mb-2" />
                      <p className="text-xs text-muted-foreground">Démarrez la conversation avec votre conseiller.</p>
                    </div>
                  ) : (
                    supportThread.map((m) => (
                      <div key={m.id} className={`flex ${m.sender_role === "admin" ? "justify-start" : "justify-end"}`}>
                        <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-xs ${m.sender_role === "admin" ? "bg-primary/10 text-foreground" : "bg-primary text-primary-foreground"}`}>
                          <p>{m.content}</p>
                          <p className="text-[9px] opacity-70 mt-0.5">{new Date(m.created_at).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="Écrivez votre message..."
                    value={supportMsg}
                    onChange={(e) => setSupportMsg(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendSupport(); } }}
                    className="text-xs h-9"
                    disabled={sending}
                  />
                  <Button onClick={sendSupport} disabled={sending || !supportMsg.trim()} variant="hero" size="sm" className="gap-1">
                    {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ======================= API KEYS ======================= */}
          <TabsContent value="api" className="space-y-4">
            <Card>
              <CardHeader className="p-3 sm:p-4 pb-2 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Code2 className="w-4 h-4 text-primary" /> Clés API
                  </CardTitle>
                  <CardDescription className="text-[11px]">
                    Connectez votre ERP/e-commerce. Endpoint: <code className="text-[10px] bg-muted px-1 rounded">https://api.nukuconnect.com/v1</code>
                  </CardDescription>
                </div>
                <Button onClick={createKey} disabled={creatingKey} variant="hero" size="sm" className="gap-1 text-xs h-8">
                  {creatingKey ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />} Créer une clé
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

            <Card>
              <CardHeader className="p-3 sm:p-4 pb-2">
                <CardTitle className="text-sm">Documentation rapide</CardTitle>
              </CardHeader>
              <CardContent className="p-3 sm:p-4 pt-0 text-xs space-y-2">
                <p className="text-muted-foreground">Authentifiez-vous avec un en-tête <code className="bg-muted px-1 rounded">Authorization: Bearer VOTRE_CLE</code>.</p>
                <pre className="bg-muted/40 border border-border p-2 rounded text-[10px] overflow-x-auto">
{`curl https://api.nukuconnect.com/v1/products \\
  -H "Authorization: Bearer nuku_live_XXXX..."`}
                </pre>
                <p className="text-muted-foreground">Endpoints disponibles : <code>/products</code>, <code>/orders</code>, <code>/inventory</code>.</p>
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
