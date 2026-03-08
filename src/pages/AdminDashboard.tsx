import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  Users, Package, ShoppingCart, DollarSign, TrendingUp, Crown,
  Store, Eye, Loader2, Shield, BarChart3, MessageCircle, Star,
  Search, HandCoins, CheckCircle, Clock, XCircle, ChevronDown
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, Legend
} from 'recharts';

const COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--accent))',
  'hsl(142 76% 36%)',
  'hsl(var(--destructive))',
  'hsl(217 91% 60%)',
];

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { formatPrice } = useLanguage();
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/auth", { replace: true }); return; }

      // Check admin role
      const { data: roleCheck } = await supabase.rpc("has_role", {
        _user_id: session.user.id,
        _role: "admin",
      });

      if (!roleCheck) {
        if (isMounted) {
          toast({ title: "Accès refusé", description: "Vous n'êtes pas administrateur.", variant: "destructive" });
          navigate("/", { replace: true });
        }
        return;
      }

      if (isMounted) setIsAdmin(true);

      // Load all data in parallel
      const [statsRes, usersRes, ordersRes, subsRes] = await Promise.all([
        supabase.rpc("get_admin_stats"),
        supabase.rpc("get_admin_users"),
        supabase.rpc("get_admin_orders"),
        supabase.rpc("get_admin_subscriptions"),
      ]);

      if (isMounted) {
        setStats(statsRes.data);
        setUsers(usersRes.data || []);
        setOrders(ordersRes.data || []);
        setSubscriptions(subsRes.data || []);
        setIsLoading(false);
      }
    };

    load();
    return () => { isMounted = false; };
  }, [navigate, toast]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Shield className="w-12 h-12 mx-auto text-primary animate-pulse mb-3" />
          <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto" />
          <p className="text-sm text-muted-foreground mt-2">Chargement du panneau admin...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) return null;

  const filteredUsers = users.filter((u: any) =>
    !searchQuery || u.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.phone?.includes(searchQuery) || u.user_type?.includes(searchQuery.toLowerCase())
  );

  const userTypePieData = [
    { name: "Fournisseurs", value: Number(stats?.total_producers || 0) },
    { name: "Acheteurs", value: Number(stats?.total_buyers || 0) },
  ];

  const subscriptionPieData = [
    { name: "Pro", value: Number(stats?.pro_subscriptions || 0) },
    { name: "Gratuit", value: Number(stats?.free_subscriptions || 0) },
  ];

  const orderStatusData = [
    { name: "En attente", value: Number(stats?.pending_orders || 0), icon: Clock },
    { name: "Terminées", value: Number(stats?.completed_orders || 0), icon: CheckCircle },
    { name: "Autres", value: Math.max(0, Number(stats?.total_orders || 0) - Number(stats?.pending_orders || 0) - Number(stats?.completed_orders || 0)), icon: Package },
  ];

  const statCards = [
    { label: "Utilisateurs", value: stats?.total_users || 0, icon: Users, color: "bg-primary/15 text-primary" },
    { label: "Produits", value: stats?.total_products || 0, icon: Package, color: "bg-green-500/15 text-green-600" },
    { label: "Commandes", value: stats?.total_orders || 0, icon: ShoppingCart, color: "bg-accent/15 text-accent-foreground" },
    { label: "Revenus", value: formatPrice(Number(stats?.total_revenue || 0)), icon: DollarSign, color: "bg-yellow-500/15 text-yellow-600" },
    { label: "Abon. Pro", value: stats?.pro_subscriptions || 0, icon: Crown, color: "bg-purple-500/15 text-purple-600" },
    { label: "Demandes", value: stats?.total_demands || 0, icon: HandCoins, color: "bg-blue-500/15 text-blue-600" },
    { label: "Messages", value: stats?.total_conversations || 0, icon: MessageCircle, color: "bg-pink-500/15 text-pink-600" },
    { label: "Avis", value: stats?.total_reviews || 0, icon: Star, color: "bg-orange-500/15 text-orange-600" },
  ];

  const getStatusBadge = (status: string) => {
    const map: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      pending: { label: "En attente", variant: "secondary" },
      confirmed: { label: "Confirmée", variant: "default" },
      shipped: { label: "Expédiée", variant: "outline" },
      completed: { label: "Livrée", variant: "default" },
      cancelled: { label: "Annulée", variant: "destructive" },
    };
    const s = map[status] || { label: status, variant: "secondary" as const };
    return <Badge variant={s.variant} className="text-[10px]">{s.label}</Badge>;
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="py-4 sm:py-8">
        <div className="container mx-auto px-3 sm:px-4">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-primary/15 flex items-center justify-center">
                <Shield className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="font-heading text-lg sm:text-2xl font-bold text-foreground">
                  Panneau d'administration
                </h1>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Vue d'ensemble de NUKUCONNECT
                </p>
              </div>
            </div>
            <Badge className="w-fit gap-1.5 bg-primary/10 text-primary border-primary/20 px-3 py-1.5">
              <Shield className="w-3.5 h-3.5" />
              Administrateur
            </Badge>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-4 mb-6">
            {statCards.map((stat) => (
              <Card key={stat.label} className="overflow-hidden">
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${stat.color}`}>
                      <stat.icon className="w-4.5 h-4.5 sm:w-5 sm:h-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] sm:text-xs text-muted-foreground truncate">{stat.label}</p>
                      <p className="font-heading text-sm sm:text-lg font-bold text-foreground truncate">{stat.value}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {/* User Types Pie */}
            <Card>
              <CardHeader className="p-3 sm:p-4 pb-0">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Users className="w-4 h-4 text-primary" />
                  Répartition utilisateurs
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 sm:p-4">
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={userTypePieData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={5} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                      {userTypePieData.map((_, idx) => (
                        <Cell key={idx} fill={COLORS[idx]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Subscriptions Pie */}
            <Card>
              <CardHeader className="p-3 sm:p-4 pb-0">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Crown className="w-4 h-4 text-primary" />
                  Abonnements
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 sm:p-4">
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={subscriptionPieData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={5} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                      {subscriptionPieData.map((_, idx) => (
                        <Cell key={idx} fill={COLORS[idx + 2]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Orders Status */}
            <Card>
              <CardHeader className="p-3 sm:p-4 pb-0">
                <CardTitle className="text-sm flex items-center gap-2">
                  <ShoppingCart className="w-4 h-4 text-primary" />
                  Statut commandes
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 sm:p-4">
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={orderStatusData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" fontSize={10} stroke="hsl(var(--muted-foreground))" />
                    <YAxis fontSize={10} stroke="hsl(var(--muted-foreground))" />
                    <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }} />
                    <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList className="bg-muted p-1 w-full overflow-x-auto flex justify-start sm:justify-center scrollbar-hide">
              <TabsTrigger value="overview" className="gap-1.5 text-[11px] sm:text-sm px-3 flex-shrink-0">
                <BarChart3 className="w-3.5 h-3.5" />
                Vue d'ensemble
              </TabsTrigger>
              <TabsTrigger value="users" className="gap-1.5 text-[11px] sm:text-sm px-3 flex-shrink-0">
                <Users className="w-3.5 h-3.5" />
                Utilisateurs ({users.length})
              </TabsTrigger>
              <TabsTrigger value="orders" className="gap-1.5 text-[11px] sm:text-sm px-3 flex-shrink-0">
                <ShoppingCart className="w-3.5 h-3.5" />
                Commandes ({orders.length})
              </TabsTrigger>
              <TabsTrigger value="subscriptions" className="gap-1.5 text-[11px] sm:text-sm px-3 flex-shrink-0">
                <Crown className="w-3.5 h-3.5" />
                Abonnements ({subscriptions.length})
              </TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Recent Users */}
                <Card>
                  <CardHeader className="p-3 sm:p-4 pb-2">
                    <CardTitle className="text-sm">Derniers inscrits</CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 sm:p-4 pt-0">
                    <div className="space-y-2">
                      {users.slice(0, 5).map((u: any) => (
                        <div key={u.id} className="flex items-center gap-3 p-2 rounded-lg bg-muted/50">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                            {u.avatar_url ? (
                              <img src={u.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                            ) : (
                              <Users className="w-4 h-4 text-primary" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium truncate">{u.full_name || "Sans nom"}</p>
                            <p className="text-[10px] text-muted-foreground">{u.user_type === "producer" ? "Fournisseur" : "Acheteur"}</p>
                          </div>
                          <Badge variant="outline" className="text-[9px]">
                            {u.subscription?.plan || "free"}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Recent Orders */}
                <Card>
                  <CardHeader className="p-3 sm:p-4 pb-2">
                    <CardTitle className="text-sm">Dernières commandes</CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 sm:p-4 pt-0">
                    <div className="space-y-2">
                      {orders.slice(0, 5).map((o: any) => (
                        <div key={o.id} className="flex items-center gap-3 p-2 rounded-lg bg-muted/50">
                          <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0">
                            <Package className="w-4 h-4 text-accent-foreground" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium truncate">{o.product_name || "Produit"}</p>
                            <p className="text-[10px] text-muted-foreground">{o.buyer_name} → {o.seller_name}</p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            {getStatusBadge(o.status)}
                            <p className="text-xs font-bold text-primary mt-0.5">{formatPrice(Number(o.total_price))}</p>
                          </div>
                        </div>
                      ))}
                      {orders.length === 0 && (
                        <p className="text-xs text-muted-foreground text-center py-4">Aucune commande</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Users Tab */}
            <TabsContent value="users">
              <Card>
                <CardHeader className="p-3 sm:p-4 pb-2">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div>
                      <CardTitle className="text-sm">Tous les utilisateurs</CardTitle>
                      <CardDescription className="text-[11px]">{users.length} utilisateurs inscrits</CardDescription>
                    </div>
                    <div className="relative w-full sm:w-64">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                      <Input
                        placeholder="Rechercher..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 h-9 text-xs"
                      />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-3 sm:p-4 pt-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left py-2 px-2 font-medium text-muted-foreground">Utilisateur</th>
                          <th className="text-left py-2 px-2 font-medium text-muted-foreground hidden sm:table-cell">Type</th>
                          <th className="text-left py-2 px-2 font-medium text-muted-foreground hidden md:table-cell">Téléphone</th>
                          <th className="text-left py-2 px-2 font-medium text-muted-foreground hidden md:table-cell">Localisation</th>
                          <th className="text-center py-2 px-2 font-medium text-muted-foreground">Produits</th>
                          <th className="text-center py-2 px-2 font-medium text-muted-foreground">Commandes</th>
                          <th className="text-center py-2 px-2 font-medium text-muted-foreground">Plan</th>
                          <th className="text-left py-2 px-2 font-medium text-muted-foreground hidden lg:table-cell">Inscrit le</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredUsers.map((u: any) => (
                          <tr key={u.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                            <td className="py-2.5 px-2">
                              <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                                  {u.avatar_url ? (
                                    <img src={u.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                                  ) : (
                                    <Users className="w-3.5 h-3.5 text-primary" />
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <p className="font-medium truncate">{u.full_name || "Sans nom"}</p>
                                  {u.is_verified && <Badge variant="outline" className="text-[8px] px-1 text-green-600">Vérifié</Badge>}
                                </div>
                              </div>
                            </td>
                            <td className="py-2.5 px-2 hidden sm:table-cell">
                              <Badge variant={u.user_type === "producer" ? "default" : "secondary"} className="text-[9px]">
                                {u.user_type === "producer" ? "Fournisseur" : "Acheteur"}
                              </Badge>
                            </td>
                            <td className="py-2.5 px-2 hidden md:table-cell text-muted-foreground">{u.phone || "—"}</td>
                            <td className="py-2.5 px-2 hidden md:table-cell text-muted-foreground">{u.location || "—"}</td>
                            <td className="py-2.5 px-2 text-center">{u.products_count}</td>
                            <td className="py-2.5 px-2 text-center">{u.orders_count}</td>
                            <td className="py-2.5 px-2 text-center">
                              <Badge variant={u.subscription?.plan === "pro" ? "default" : "outline"} className="text-[9px]">
                                {u.subscription?.plan || "free"}
                              </Badge>
                            </td>
                            <td className="py-2.5 px-2 hidden lg:table-cell text-muted-foreground">
                              {new Date(u.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {filteredUsers.length === 0 && (
                      <p className="text-xs text-muted-foreground text-center py-8">Aucun utilisateur trouvé</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Orders Tab */}
            <TabsContent value="orders">
              <Card>
                <CardHeader className="p-3 sm:p-4 pb-2">
                  <CardTitle className="text-sm">Toutes les commandes</CardTitle>
                  <CardDescription className="text-[11px]">
                    {stats?.total_orders || 0} commandes • {formatPrice(Number(stats?.total_revenue || 0))} de revenus
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-3 sm:p-4 pt-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left py-2 px-2 font-medium text-muted-foreground">Produit</th>
                          <th className="text-left py-2 px-2 font-medium text-muted-foreground hidden sm:table-cell">Acheteur</th>
                          <th className="text-left py-2 px-2 font-medium text-muted-foreground hidden sm:table-cell">Vendeur</th>
                          <th className="text-center py-2 px-2 font-medium text-muted-foreground">Qté</th>
                          <th className="text-right py-2 px-2 font-medium text-muted-foreground">Montant</th>
                          <th className="text-center py-2 px-2 font-medium text-muted-foreground">Statut</th>
                          <th className="text-left py-2 px-2 font-medium text-muted-foreground hidden md:table-cell">Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {orders.map((o: any) => (
                          <tr key={o.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                            <td className="py-2.5 px-2 font-medium">{o.product_name || "—"}</td>
                            <td className="py-2.5 px-2 hidden sm:table-cell text-muted-foreground">{o.buyer_name || "—"}</td>
                            <td className="py-2.5 px-2 hidden sm:table-cell text-muted-foreground">{o.seller_name || "—"}</td>
                            <td className="py-2.5 px-2 text-center">{o.quantity}</td>
                            <td className="py-2.5 px-2 text-right font-bold text-primary">{formatPrice(Number(o.total_price))}</td>
                            <td className="py-2.5 px-2 text-center">{getStatusBadge(o.status)}</td>
                            <td className="py-2.5 px-2 hidden md:table-cell text-muted-foreground">
                              {new Date(o.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {orders.length === 0 && (
                      <p className="text-xs text-muted-foreground text-center py-8">Aucune commande</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Subscriptions Tab */}
            <TabsContent value="subscriptions">
              <Card>
                <CardHeader className="p-3 sm:p-4 pb-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-sm">Abonnements</CardTitle>
                      <CardDescription className="text-[11px]">
                        {stats?.pro_subscriptions || 0} Pro • {stats?.free_subscriptions || 0} Gratuit
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Badge className="bg-green-500/15 text-green-600 border-green-500/20">
                        <Crown className="w-3 h-3 mr-1" />
                        {stats?.pro_subscriptions || 0} Pro
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-3 sm:p-4 pt-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left py-2 px-2 font-medium text-muted-foreground">Utilisateur</th>
                          <th className="text-center py-2 px-2 font-medium text-muted-foreground">Plan</th>
                          <th className="text-center py-2 px-2 font-medium text-muted-foreground">Statut</th>
                          <th className="text-center py-2 px-2 font-medium text-muted-foreground hidden sm:table-cell">Max produits</th>
                          <th className="text-left py-2 px-2 font-medium text-muted-foreground hidden sm:table-cell">Période</th>
                          <th className="text-left py-2 px-2 font-medium text-muted-foreground hidden md:table-cell">Début</th>
                          <th className="text-left py-2 px-2 font-medium text-muted-foreground hidden md:table-cell">Expiration</th>
                        </tr>
                      </thead>
                      <tbody>
                        {subscriptions.map((s: any) => (
                          <tr key={s.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                            <td className="py-2.5 px-2">
                              <div>
                                <p className="font-medium">{s.user_name || "Sans nom"}</p>
                                <p className="text-[10px] text-muted-foreground">{s.user_phone || "—"}</p>
                              </div>
                            </td>
                            <td className="py-2.5 px-2 text-center">
                              <Badge variant={s.plan === "pro" ? "default" : "secondary"} className="text-[9px]">
                                {s.plan === "pro" ? "Pro" : "Gratuit"}
                              </Badge>
                            </td>
                            <td className="py-2.5 px-2 text-center">
                              <Badge variant={s.status === "active" ? "default" : "destructive"} className="text-[9px]">
                                {s.status === "active" ? "Actif" : s.status}
                              </Badge>
                            </td>
                            <td className="py-2.5 px-2 text-center hidden sm:table-cell">{s.max_products}</td>
                            <td className="py-2.5 px-2 hidden sm:table-cell text-muted-foreground capitalize">{s.billing_period}</td>
                            <td className="py-2.5 px-2 hidden md:table-cell text-muted-foreground">
                              {new Date(s.started_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}
                            </td>
                            <td className="py-2.5 px-2 hidden md:table-cell text-muted-foreground">
                              {s.expires_at ? new Date(s.expires_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" }) : "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {subscriptions.length === 0 && (
                      <p className="text-xs text-muted-foreground text-center py-8">Aucun abonnement</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default AdminDashboard;
