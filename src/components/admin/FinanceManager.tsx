import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  DollarSign, HandCoins, Crown, ShoppingCart, Search, Loader2,
  User, TrendingUp, Wallet, ArrowUpRight, ArrowDownRight
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell
} from "recharts";

const COLORS = ['hsl(var(--primary))', 'hsl(142 76% 36%)', 'hsl(217 91% 60%)', 'hsl(45 93% 47%)'];

const COMMISSION_RATES: Record<string, number> = {
  free: 8, pro: 5, business: 2,
};

interface Props {
  orders: any[];
  users: any[];
  stats: any;
}

const FinanceManager = ({ orders, users, stats }: Props) => {
  const { formatPrice } = useLanguage();
  const [search, setSearch] = useState("");
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [loadingW, setLoadingW] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("withdrawals")
        .select("*, profiles:profile_id(full_name)")
        .order("created_at", { ascending: false });
      setWithdrawals(data || []);
      setLoadingW(false);
    };
    load();
  }, []);

  // Build per-user revenue data
  const sellerRevenue: Record<string, { name: string; sales: number; commission: number; net: number; plan: string; orderCount: number }> = {};
  orders.forEach((o: any) => {
    const sellerId = o.seller_name || "Unknown";
    if (!sellerRevenue[sellerId]) {
      const userMatch = users.find((u: any) => u.full_name === o.seller_name);
      const plan = userMatch?.subscription?.plan || "free";
      sellerRevenue[sellerId] = { name: sellerId, sales: 0, commission: 0, net: 0, plan, orderCount: 0 };
    }
    const amount = Number(o.total_price || 0);
    const rate = COMMISSION_RATES[sellerRevenue[sellerId].plan] || 8;
    const commission = Math.round(amount * rate / 100);
    sellerRevenue[sellerId].sales += amount;
    sellerRevenue[sellerId].commission += commission;
    sellerRevenue[sellerId].net += (amount - commission);
    sellerRevenue[sellerId].orderCount += 1;
  });

  const sellerList = Object.values(sellerRevenue)
    .sort((a, b) => b.sales - a.sales)
    .filter(s => !search || s.name.toLowerCase().includes(search.toLowerCase()));

  const totalRevenue = Number(stats?.total_revenue || 0);
  const proSubs = Number(stats?.pro_subscriptions || 0);
  const avgRate = sellerList.length > 0
    ? sellerList.reduce((s, r) => s + COMMISSION_RATES[r.plan], 0) / sellerList.length
    : 8;
  const totalCommissions = sellerList.reduce((s, r) => s + r.commission, 0);
  const subRevenue = proSubs * 5000;
  const platformTotal = totalCommissions + subRevenue;

  const totalPaidOut = withdrawals.filter(w => w.status === "completed").reduce((s, w) => s + Number(w.amount || 0), 0);
  const pendingPayouts = withdrawals.filter(w => w.status === "pending").reduce((s, w) => s + Number(w.amount || 0), 0);

  // Chart: top sellers
  const topSellers = sellerList.slice(0, 8).map(s => ({ name: s.name.split(" ")[0], ventes: s.sales, commission: s.commission }));

  // Revenue breakdown pie
  const revenuePie = [
    { name: "Commissions", value: totalCommissions },
    { name: "Abonnements", value: subRevenue },
  ];

  return (
    <div className="space-y-4">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        {[
          { label: "Ventes totales", value: formatPrice(totalRevenue), icon: ShoppingCart, color: "text-green-600", bg: "bg-green-500/10" },
          { label: "Commissions", value: formatPrice(totalCommissions), icon: HandCoins, color: "text-primary", bg: "bg-primary/10" },
          { label: "Abonnements", value: formatPrice(subRevenue), icon: Crown, color: "text-yellow-600", bg: "bg-yellow-500/10" },
          { label: "Revenus plateforme", value: formatPrice(platformTotal), icon: DollarSign, color: "text-blue-600", bg: "bg-blue-500/10" },
          { label: "Payé aux vendeurs", value: formatPrice(totalPaidOut), icon: ArrowUpRight, color: "text-purple-600", bg: "bg-purple-500/10" },
          { label: "En attente paiement", value: formatPrice(pendingPayouts), icon: Wallet, color: "text-orange-600", bg: "bg-orange-500/10" },
        ].map(c => (
          <Card key={c.label}>
            <CardContent className="p-3">
              <div className={`w-8 h-8 rounded-lg ${c.bg} flex items-center justify-center mb-1.5`}>
                <c.icon className={`w-4 h-4 ${c.color}`} />
              </div>
              <p className="text-[10px] text-muted-foreground">{c.label}</p>
              <p className="text-sm font-bold">{c.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="p-3 pb-0">
            <CardTitle className="text-sm">Top vendeurs</CardTitle>
          </CardHeader>
          <CardContent className="p-3">
            {topSellers.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={topSellers}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" fontSize={10} stroke="hsl(var(--muted-foreground))" />
                  <YAxis fontSize={10} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '11px' }} />
                  <Bar dataKey="ventes" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Ventes" />
                  <Bar dataKey="commission" fill="hsl(142 76% 36%)" radius={[4, 4, 0, 0]} name="Commission" />
                </BarChart>
              </ResponsiveContainer>
            ) : <p className="text-xs text-muted-foreground text-center py-8">Aucune donnée</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-3 pb-0">
            <CardTitle className="text-sm">Répartition revenus</CardTitle>
          </CardHeader>
          <CardContent className="p-3">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={revenuePie} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={5} dataKey="value"
                  label={({ name, value }) => `${name}: ${formatPrice(value)}`}>
                  {revenuePie.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Commission rates */}
      <Card>
        <CardHeader className="p-3 pb-2">
          <CardTitle className="text-sm">Grille de commissions</CardTitle>
        </CardHeader>
        <CardContent className="p-3 pt-0">
          <div className="grid grid-cols-4 gap-2">
            {[
              { plan: "Gratuit", rate: "8%", bg: "bg-muted" },
              { plan: "Pro", rate: "5%", bg: "bg-primary/10" },
              { plan: "Business", rate: "3%", bg: "bg-blue-500/10" },
              { plan: "Entreprise", rate: "2%", bg: "bg-yellow-500/10" },
            ].map(item => (
              <div key={item.plan} className={`${item.bg} rounded-xl p-2.5 text-center`}>
                <p className="text-[10px] text-muted-foreground">{item.plan}</p>
                <p className="text-lg font-bold">{item.rate}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Per-user revenue table */}
      <Card>
        <CardHeader className="p-3 sm:p-4 pb-2">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <div className="flex-1">
              <CardTitle className="text-sm">Revenus par vendeur</CardTitle>
              <CardDescription className="text-[11px]">{sellerList.length} vendeurs actifs</CardDescription>
            </div>
            <div className="relative w-full sm:w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input placeholder="Rechercher vendeur..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-8 text-xs" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-3 sm:p-4 pt-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-1.5 font-medium text-muted-foreground">Vendeur</th>
                  <th className="text-center py-2 px-1.5 font-medium text-muted-foreground">Plan</th>
                  <th className="text-center py-2 px-1.5 font-medium text-muted-foreground">Commandes</th>
                  <th className="text-right py-2 px-1.5 font-medium text-muted-foreground">Ventes</th>
                  <th className="text-right py-2 px-1.5 font-medium text-muted-foreground">Commission</th>
                  <th className="text-right py-2 px-1.5 font-medium text-muted-foreground">Net vendeur</th>
                </tr>
              </thead>
              <tbody>
                {sellerList.map((s, i) => (
                  <tr key={i} className="border-b border-border/30 hover:bg-muted/30">
                    <td className="py-2 px-1.5 font-medium">{s.name}</td>
                    <td className="py-2 px-1.5 text-center">
                      <Badge variant={s.plan === "pro" ? "default" : "secondary"} className="text-[8px]">
                        {s.plan === "pro" ? "Pro" : s.plan === "business" ? "Business" : "Gratuit"}
                      </Badge>
                    </td>
                    <td className="py-2 px-1.5 text-center">{s.orderCount}</td>
                    <td className="py-2 px-1.5 text-right font-semibold">{formatPrice(s.sales)}</td>
                    <td className="py-2 px-1.5 text-right text-primary font-semibold">{formatPrice(s.commission)}</td>
                    <td className="py-2 px-1.5 text-right font-bold text-green-600">{formatPrice(s.net)}</td>
                  </tr>
                ))}
                {sellerList.length === 0 && (
                  <tr><td colSpan={6} className="py-8 text-center text-muted-foreground">Aucun vendeur avec des ventes</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Recent withdrawals summary */}
      <Card>
        <CardHeader className="p-3 pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Wallet className="w-4 h-4 text-primary" />
            Derniers paiements effectués
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 pt-0">
          {loadingW ? (
            <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
          ) : withdrawals.filter(w => w.status === "completed").length > 0 ? (
            <div className="space-y-1.5">
              {withdrawals.filter(w => w.status === "completed").slice(0, 10).map(w => (
                <div key={w.id} className="flex items-center justify-between py-1.5 border-b border-border/30 last:border-0">
                  <div className="flex items-center gap-2">
                    <ArrowUpRight className="w-3.5 h-3.5 text-green-600" />
                    <span className="text-xs">{w.profiles?.full_name || "Vendeur"}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-semibold text-green-600">{formatPrice(Number(w.amount))}</span>
                    <span className="text-[9px] text-muted-foreground ml-2">
                      {new Date(w.processed_at || w.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground text-center py-4">Aucun paiement effectué</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default FinanceManager;
