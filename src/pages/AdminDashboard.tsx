import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  Users, Package, ShoppingCart, DollarSign, TrendingUp, Crown,
  Store, Eye, Loader2, Shield, BarChart3, MessageCircle, Star,
  Search, HandCoins, CheckCircle, Clock, XCircle, Monitor, Smartphone,
  Tablet, Globe, MapPin, Download, Activity, Send, ChevronRight, LayoutGrid, Megaphone, Wallet,
  Truck, ShoppingBag, Leaf, Trash2, UserX
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, Legend
} from 'recharts';
import CategoryManager from "@/components/admin/CategoryManager";
import BroadcastNotification from "@/components/admin/BroadcastNotification";
import WithdrawalManager from "@/components/admin/WithdrawalManager";
import VisitorWorldMap from "@/components/admin/VisitorWorldMap";
import SupportChat from "@/components/admin/SupportChat";
import OrderManager from "@/components/admin/OrderManager";
import ProductsManager from "@/components/admin/ProductsManager";
import DeliveryManager from "@/components/admin/DeliveryManager";
import DemandsManager from "@/components/admin/DemandsManager";
import FinanceManager from "@/components/admin/FinanceManager";
import EmailStatsManager from "@/components/admin/EmailStatsManager";
import EmailLogsManager from "@/components/admin/EmailLogsManager";
import KYCManager from "@/components/admin/KYCManager";
import AIModerationHistory from "@/components/admin/AIModerationHistory";
import NukuAIAnalytics from "@/components/admin/NukuAIAnalytics";
import UserSubscriptionActions from "@/components/admin/UserSubscriptionActions";
import AdminAuditLog from "@/components/admin/AdminAuditLog";
import { Sparkles as SparklesIcon, Bot as BotIcon, FileText, Coins } from "lucide-react";

const COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--secondary))',
  'hsl(var(--accent))',
  'hsl(var(--destructive))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
];

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { formatPrice } = useLanguage();
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [subscriptionSearch, setSubscriptionSearch] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("overview");
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (!confirm(`Supprimer le compte de "${userName}" et toutes ses données ? Cette action est irréversible.`)) return;
    setDeletingUserId(userId);
    try {
      const { error } = await supabase.rpc("admin_delete_user_data", { p_user_id: userId });
      if (error) throw error;
      toast({ title: "Compte supprimé", description: `Les données de "${userName}" ont été supprimées.` });
      setUsers(prev => prev.filter((u: any) => u.user_id !== userId));
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    }
    setDeletingUserId(null);
  };

  // Admin chat state
  const [conversations, setConversations] = useState<any[]>([]);
  const [selectedConv, setSelectedConv] = useState<any>(null);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [adminProfile, setAdminProfile] = useState<any>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const refreshData = useCallback(async () => {
    const [statsRes, usersRes, ordersRes, subsRes, analyticsRes] = await Promise.all([
      supabase.rpc("get_admin_stats"),
      supabase.rpc("get_admin_users"),
      supabase.rpc("get_admin_orders"),
      supabase.rpc("get_admin_subscriptions"),
      supabase.rpc("get_admin_analytics"),
    ]);
    setStats(statsRes.data);
    setUsers(usersRes.data || []);
    setOrders(ordersRes.data || []);
    setSubscriptions(subsRes.data || []);
    setAnalytics(analyticsRes.data);
  }, []);

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/auth", { replace: true }); return; }

      const { data: roleData } = await supabase
        .from("user_roles").select("role")
        .eq("user_id", session.user.id).eq("role", "admin").maybeSingle();

      if (!roleData) {
        if (isMounted) {
          toast({ title: "Accès refusé", description: "Vous n'êtes pas administrateur.", variant: "destructive" });
          navigate("/", { replace: true });
        }
        return;
      }

      if (isMounted) setIsAdmin(true);

      const [statsRes, usersRes, ordersRes, subsRes, analyticsRes, profileRes] = await Promise.all([
        supabase.rpc("get_admin_stats"),
        supabase.rpc("get_admin_users"),
        supabase.rpc("get_admin_orders"),
        supabase.rpc("get_admin_subscriptions"),
        supabase.rpc("get_admin_analytics"),
        supabase.from("profiles").select("*").eq("user_id", session.user.id).maybeSingle(),
      ]);

      if (isMounted) {
        setStats(statsRes.data);
        setUsers(usersRes.data || []);
        setOrders(ordersRes.data || []);
        setSubscriptions(subsRes.data || []);
        setAnalytics(analyticsRes.data);
        setAdminProfile(profileRes.data);
        setIsLoading(false);
      }

      // Load conversations for admin chat
      if (profileRes.data) {
        const { data: convs } = await supabase
          .from("conversations")
          .select("*, profiles!conversations_buyer_id_fkey(full_name, avatar_url), profiles!conversations_seller_id_fkey(full_name, avatar_url)")
          .or(`buyer_id.eq.${profileRes.data.id},seller_id.eq.${profileRes.data.id}`)
          .order("updated_at", { ascending: false });
        if (isMounted) setConversations(convs || []);
      }
    };

    load();
    return () => { isMounted = false; };
  }, [navigate, toast]);

  // Load chat messages when conversation selected
  useEffect(() => {
    if (!selectedConv) return;
    const loadMessages = async () => {
      const { data } = await supabase
        .from("messages")
        .select("*, profiles:sender_id(full_name, avatar_url)")
        .eq("conversation_id", selectedConv.id)
        .order("created_at", { ascending: true });
      setChatMessages(data || []);
    };
    loadMessages();

    const channel = supabase
      .channel(`admin-chat-${selectedConv.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${selectedConv.id}` },
        (payload) => setChatMessages(prev => [...prev, payload.new])
      ).subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [selectedConv]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConv || !adminProfile) return;
    await supabase.from("messages").insert({
      conversation_id: selectedConv.id,
      sender_id: adminProfile.id,
      content: newMessage.trim(),
    });
    setNewMessage("");
  };

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

  const subSearchQ = subscriptionSearch.trim().toLowerCase();
  const filteredSubscriptions = !subSearchQ ? subscriptions : subscriptions.filter((s: any) =>
    (s.user_name || "").toLowerCase().includes(subSearchQ) ||
    (s.user_email || "").toLowerCase().includes(subSearchQ) ||
    (s.user_phone || "").toLowerCase().includes(subSearchQ)
  );

  const orderStatusData = [
    { name: "En attente", value: Number(stats?.pending_orders || 0) },
    { name: "Terminées", value: Number(stats?.completed_orders || 0) },
    { name: "Autres", value: Math.max(0, Number(stats?.total_orders || 0) - Number(stats?.pending_orders || 0) - Number(stats?.completed_orders || 0)) },
  ];

  const deviceData = analytics?.device_stats?.map((d: any) => ({ name: d.device, value: d.count })) || [];
  const browserData = analytics?.browser_stats?.map((b: any) => ({ name: b.browser, value: b.count })) || [];
  const osData = analytics?.os_stats?.map((o: any) => ({ name: o.os, value: o.count })) || [];
  const countryData = analytics?.country_stats || [];
  const cityData = analytics?.city_stats || [];
  const pageData = analytics?.page_stats || [];
  const dailyVisits = analytics?.daily_visits || [];

  const statCards = [
    { label: "Utilisateurs", value: stats?.total_users || 0, icon: Users, color: "bg-primary/15 text-primary" },
    { label: "Produits", value: stats?.total_products || 0, icon: Package, color: "bg-secondary/15 text-secondary" },
    { label: "Commandes", value: stats?.total_orders || 0, icon: ShoppingCart, color: "bg-accent/15 text-accent-foreground" },
    { label: "Revenus", value: formatPrice(Number(stats?.total_revenue || 0)), icon: DollarSign, color: "bg-accent/20 text-accent-foreground" },
    { label: "Visites", value: analytics?.total_visits || 0, icon: Eye, color: "bg-primary/10 text-primary" },
    { label: "Visiteurs", value: analytics?.unique_visitors || 0, icon: Globe, color: "bg-secondary/10 text-secondary" },
    { label: "Aujourd'hui", value: analytics?.today_visits || 0, icon: Activity, color: "bg-destructive/10 text-destructive" },
    { label: "Installations", value: analytics?.pwa_installs || 0, icon: Download, color: "bg-accent/15 text-accent-foreground" },
  ];

  const getDeviceIcon = (device: string) => {
    if (device === "mobile") return Smartphone;
    if (device === "tablet") return Tablet;
    return Monitor;
  };

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

  const sidebarItems = [
    { id: "overview", label: "Vue d'ensemble", icon: BarChart3 },
    { id: "analytics", label: "Analytics", icon: Activity },
    { id: "users", label: "Utilisateurs", icon: Users },
    { id: "orders", label: "Commandes", icon: ShoppingCart },
    { id: "products", label: "Produits", icon: Package },
    { id: "deliveries", label: "Livraisons", icon: Truck },
    { id: "demands", label: "Demandes", icon: ShoppingBag },
    { id: "kyc", label: "Vérification KYC", icon: Shield },
    { id: "subscriptions", label: "Abonnements", icon: Crown },
    { id: "finances", label: "Finances", icon: HandCoins },
    { id: "withdrawals", label: "Retraits", icon: Wallet },
    { id: "categories", label: "Catégories", icon: LayoutGrid },
    { id: "chat", label: "Chat", icon: MessageCircle },
    { id: "support", label: "Support", icon: MessageCircle },
    { id: "broadcast", label: "Notifications", icon: Megaphone },
    { id: "emails", label: "Emails", icon: Send },
    { id: "ai-history", label: "IA & Notifs", icon: SparklesIcon },
    { id: "nuku-ai", label: "Nuku AI", icon: BotIcon },
    { id: "audit", label: "Journal admin", icon: FileText },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="flex">
        {/* Sidebar */}
        <aside className="hidden lg:flex flex-col w-56 min-h-[calc(100vh-64px)] border-r border-border bg-card sticky top-0 overflow-y-auto">
          <div className="p-4 border-b border-border">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              <span className="font-heading text-sm font-bold">Admin</span>
            </div>
          </div>
          <nav className="flex-1 p-2 space-y-0.5">
            {sidebarItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                  activeTab === item.id
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <item.icon className="w-4 h-4 flex-shrink-0" />
                {item.label}
              </button>
            ))}
          </nav>
        </aside>

        {/* Mobile tab bar */}
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-card border-t border-border overflow-x-auto">
          <div className="flex p-1 gap-0.5">
            {sidebarItems.slice(0, 8).map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg min-w-[56px] flex-shrink-0 ${
                  activeTab === item.id ? "text-primary bg-primary/10" : "text-muted-foreground"
                }`}
              >
                <item.icon className="w-4 h-4" />
                <span className="text-[8px] font-medium truncate">{item.label.split(' ')[0]}</span>
              </button>
            ))}
            <select
              value={activeTab}
              onChange={(e) => setActiveTab(e.target.value)}
              className="text-[10px] bg-muted rounded-lg px-2 min-w-[56px] text-center appearance-none flex-shrink-0"
            >
              {sidebarItems.map((item) => (
                <option key={item.id} value={item.id}>{item.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Main content */}
        <main className="flex-1 p-3 sm:p-6 pb-20 lg:pb-6 min-w-0">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center lg:hidden">
                <Shield className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h1 className="font-heading text-base sm:text-xl font-bold text-foreground">
                  {sidebarItems.find(s => s.id === activeTab)?.label || "Administration"}
                </h1>
                <p className="text-[10px] sm:text-xs text-muted-foreground">
                  NUKUCONNECT
                </p>
              </div>
            </div>
            <Badge className="w-fit gap-1.5 bg-primary/10 text-primary border-primary/20 px-3 py-1.5 text-xs">
              <Shield className="w-3 h-3" />Admin
            </Badge>
          </div>

          {/* Stats Grid - only on overview */}
          {activeTab === "overview" && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 mb-6">
              {statCards.map((stat) => (
                <Card key={stat.label} className="overflow-hidden">
                  <CardContent className="p-2.5 sm:p-3">
                    <div className="flex items-center gap-2">
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${stat.color}`}>
                        <stat.icon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[9px] sm:text-[10px] text-muted-foreground truncate">{stat.label}</p>
                        <p className="font-heading text-xs sm:text-sm font-bold text-foreground truncate">{stat.value}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Overview */}
          {activeTab === "overview" && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                {/* User Types Pie */}
                <Card>
                  <CardHeader className="p-3 sm:p-4 pb-0">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Users className="w-4 h-4 text-primary" />Répartition utilisateurs
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 sm:p-4">
                    <ResponsiveContainer width="100%" height={180}>
                      <PieChart>
                        <Pie data={userTypePieData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={5} dataKey="value"
                          label={({ name, value }) => `${name}: ${value}`}>
                          {userTypePieData.map((_, idx) => <Cell key={idx} fill={COLORS[idx]} />)}
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
                      <Crown className="w-4 h-4 text-primary" />Abonnements
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 sm:p-4">
                    <ResponsiveContainer width="100%" height={180}>
                      <PieChart>
                        <Pie data={subscriptionPieData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={5} dataKey="value"
                          label={({ name, value }) => `${name}: ${value}`}>
                          {subscriptionPieData.map((_, idx) => <Cell key={idx} fill={COLORS[idx + 2]} />)}
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
                      <ShoppingCart className="w-4 h-4 text-primary" />Statut commandes
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

              {/* Recent lists */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="p-3 sm:p-4 pb-2">
                    <CardTitle className="text-sm">Derniers inscrits</CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 sm:p-4 pt-0">
                    <div className="space-y-2">
                      {users.slice(0, 5).map((u: any) => (
                        <div key={u.id} className="flex items-center gap-3 p-2 rounded-lg bg-muted/50">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                            {u.avatar_url ? <img src={u.avatar_url} alt="" className="w-full h-full rounded-full object-cover" /> : <Users className="w-4 h-4 text-primary" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium truncate">{u.full_name || "Sans nom"}</p>
                            <p className="text-[10px] text-muted-foreground">{u.user_type === "producer" ? "Fournisseur" : "Acheteur"}</p>
                          </div>
                          <Badge variant="outline" className="text-[9px]">{u.subscription?.plan || "free"}</Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

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
                      {orders.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">Aucune commande</p>}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

            {/* Analytics Tab */}
            {activeTab === "analytics" && (
              <div className="space-y-4">
                {/* Daily Visits Chart */}
                <Card>
                  <CardHeader className="p-3 sm:p-4 pb-0">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-primary" />
                      Visites (30 derniers jours)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 sm:p-4">
                    <ResponsiveContainer width="100%" height={220}>
                      <AreaChart data={dailyVisits}>
                        <defs>
                          <linearGradient id="colorVisits" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="date" fontSize={10} stroke="hsl(var(--muted-foreground))"
                          tickFormatter={(v) => new Date(v).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })} />
                        <YAxis fontSize={10} stroke="hsl(var(--muted-foreground))" />
                        <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }}
                          labelFormatter={(v) => new Date(v).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })} />
                        <Area type="monotone" dataKey="visits" stroke="hsl(var(--primary))" fillOpacity={1} fill="url(#colorVisits)" strokeWidth={2} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Device / Browser / OS */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Devices */}
                  <Card>
                    <CardHeader className="p-3 sm:p-4 pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Monitor className="w-4 h-4 text-primary" />Appareils
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-3 sm:p-4 pt-0">
                      {deviceData.length > 0 ? (
                        <>
                          <ResponsiveContainer width="100%" height={160}>
                            <PieChart>
                              <Pie data={deviceData} cx="50%" cy="50%" innerRadius={35} outerRadius={60} paddingAngle={5} dataKey="value"
                                label={({ name, value }) => `${name}: ${value}`}>
                                {deviceData.map((_: any, idx: number) => <Cell key={idx} fill={COLORS[idx % COLORS.length]} />)}
                              </Pie>
                              <Tooltip />
                            </PieChart>
                          </ResponsiveContainer>
                          <div className="space-y-1.5 mt-2">
                            {deviceData.map((d: any, i: number) => {
                              const Icon = getDeviceIcon(d.name);
                              return (
                                <div key={i} className="flex items-center justify-between text-xs">
                                  <span className="flex items-center gap-1.5 text-muted-foreground capitalize">
                                    <Icon className="w-3.5 h-3.5" />{d.name}
                                  </span>
                                  <span className="font-semibold">{d.value}</span>
                                </div>
                              );
                            })}
                          </div>
                        </>
                      ) : (
                        <p className="text-xs text-muted-foreground text-center py-6">Aucune donnée</p>
                      )}
                    </CardContent>
                  </Card>

                  {/* Browsers */}
                  <Card>
                    <CardHeader className="p-3 sm:p-4 pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Globe className="w-4 h-4 text-primary" />Navigateurs
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-3 sm:p-4 pt-0">
                      {browserData.length > 0 ? (
                        <div className="space-y-2.5">
                          {browserData.map((b: any, i: number) => {
                            const total = browserData.reduce((s: number, x: any) => s + x.value, 0);
                            const pct = total > 0 ? Math.round((b.value / total) * 100) : 0;
                            return (
                              <div key={i}>
                                <div className="flex justify-between text-xs mb-1">
                                  <span className="text-muted-foreground">{b.name}</span>
                                  <span className="font-semibold">{b.value} ({pct}%)</span>
                                </div>
                                <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                                  <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: COLORS[i % COLORS.length] }} />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground text-center py-6">Aucune donnée</p>
                      )}
                    </CardContent>
                  </Card>

                  {/* OS */}
                  <Card>
                    <CardHeader className="p-3 sm:p-4 pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Smartphone className="w-4 h-4 text-primary" />Systèmes d'exploitation
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-3 sm:p-4 pt-0">
                      {osData.length > 0 ? (
                        <div className="space-y-2.5">
                          {osData.map((o: any, i: number) => {
                            const total = osData.reduce((s: number, x: any) => s + x.value, 0);
                            const pct = total > 0 ? Math.round((o.value / total) * 100) : 0;
                            return (
                              <div key={i}>
                                <div className="flex justify-between text-xs mb-1">
                                  <span className="text-muted-foreground">{o.name}</span>
                                  <span className="font-semibold">{o.value} ({pct}%)</span>
                                </div>
                                <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                                  <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: COLORS[i % COLORS.length] }} />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground text-center py-6">Aucune donnée</p>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Visitor World Map */}
                <VisitorWorldMap countryData={countryData} />

                {/* Locations & Pages */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Locations */}
                  <Card>
                    <CardHeader className="p-3 sm:p-4 pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-primary" />Localisation des visiteurs
                      </CardTitle>
                      <CardDescription className="text-[11px]">Par pays et villes</CardDescription>
                    </CardHeader>
                    <CardContent className="p-3 sm:p-4 pt-0">
                      {countryData.length > 0 ? (
                        <div className="space-y-3">
                          <div>
                            <p className="text-[10px] font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide">Pays</p>
                            {countryData.map((c: any, i: number) => (
                              <div key={i} className="flex items-center justify-between py-1.5 border-b border-border/30 last:border-0">
                                <span className="text-xs flex items-center gap-1.5">
                                  <Globe className="w-3 h-3 text-muted-foreground" />{c.country}
                                </span>
                                <Badge variant="secondary" className="text-[10px]">{c.count}</Badge>
                              </div>
                            ))}
                          </div>
                          {cityData.length > 0 && (
                            <div>
                              <p className="text-[10px] font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide">Villes</p>
                              {cityData.slice(0, 8).map((c: any, i: number) => (
                                <div key={i} className="flex items-center justify-between py-1.5 border-b border-border/30 last:border-0">
                                  <span className="text-xs flex items-center gap-1.5">
                                    <MapPin className="w-3 h-3 text-muted-foreground" />{c.city}
                                  </span>
                                  <Badge variant="secondary" className="text-[10px]">{c.count}</Badge>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground text-center py-6">Les données de localisation apparaîtront après quelques visites</p>
                      )}
                    </CardContent>
                  </Card>

                  {/* Pages & Impressions */}
                  <Card>
                    <CardHeader className="p-3 sm:p-4 pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Eye className="w-4 h-4 text-primary" />Pages les plus visitées
                      </CardTitle>
                      <CardDescription className="text-[11px]">Impressions par page</CardDescription>
                    </CardHeader>
                    <CardContent className="p-3 sm:p-4 pt-0">
                      {pageData.length > 0 ? (
                        <div className="space-y-2">
                          {pageData.map((p: any, i: number) => {
                            const total = pageData.reduce((s: number, x: any) => s + x.count, 0);
                            const pct = total > 0 ? Math.round((p.count / total) * 100) : 0;
                            return (
                              <div key={i}>
                                <div className="flex justify-between text-xs mb-1">
                                  <span className="text-muted-foreground font-mono">{p.page}</span>
                                  <span className="font-semibold">{p.count} ({pct}%)</span>
                                </div>
                                <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                                  <div className="h-full rounded-full bg-primary/70 transition-all" style={{ width: `${pct}%` }} />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground text-center py-6">Aucune donnée</p>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <Card>
                    <CardContent className="p-3 text-center">
                      <Eye className="w-5 h-5 mx-auto text-primary mb-1" />
                      <p className="text-lg font-bold text-foreground">{analytics?.total_visits || 0}</p>
                      <p className="text-[10px] text-muted-foreground">Impressions totales</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-3 text-center">
                      <Users className="w-5 h-5 mx-auto text-secondary mb-1" />
                      <p className="text-lg font-bold text-foreground">{analytics?.unique_visitors || 0}</p>
                      <p className="text-[10px] text-muted-foreground">Couverture (uniques)</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-3 text-center">
                      <Activity className="w-5 h-5 mx-auto text-primary mb-1" />
                      <p className="text-lg font-bold text-foreground">{analytics?.this_week_visits || 0}</p>
                      <p className="text-[10px] text-muted-foreground">Cette semaine</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-3 text-center">
                      <Download className="w-5 h-5 mx-auto text-accent-foreground mb-1" />
                      <p className="text-lg font-bold text-foreground">{analytics?.pwa_installs || 0}</p>
                      <p className="text-[10px] text-muted-foreground">Installations PWA</p>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}

            {/* Users Tab */}
            {activeTab === "users" && (
              <Card>
                <CardHeader className="p-3 sm:p-4 pb-2">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div>
                      <CardTitle className="text-sm">Tous les utilisateurs</CardTitle>
                      <CardDescription className="text-[11px]">{users.length} utilisateurs inscrits</CardDescription>
                    </div>
                    <div className="relative w-full sm:w-64">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                      <Input placeholder="Rechercher..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 h-9 text-xs" />
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
                          <th className="text-center py-2 px-2 font-medium text-muted-foreground">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredUsers.map((u: any) => (
                          <tr key={u.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                            <td className="py-2.5 px-2">
                              <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                                  {u.avatar_url ? <img src={u.avatar_url} alt="" className="w-full h-full rounded-full object-cover" /> : <Users className="w-3.5 h-3.5 text-primary" />}
                                </div>
                                <div className="min-w-0">
                                  <p className="font-medium truncate">{u.full_name || "Sans nom"}</p>
                                  {u.is_verified && <Badge variant="outline" className="text-[8px] px-1 text-secondary">Vérifié</Badge>}
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
                              <Badge variant={u.subscription?.plan === "pro" ? "default" : "outline"} className="text-[9px]">{u.subscription?.plan || "free"}</Badge>
                            </td>
                            <td className="py-2.5 px-2 hidden lg:table-cell text-muted-foreground">
                              {new Date(u.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}
                            </td>
                            <td className="py-2.5 px-2">
                              <div className="flex items-center justify-end gap-1">
                                <UserSubscriptionActions
                                  userId={u.user_id}
                                  userName={u.full_name}
                                  currentPlan={u.subscription?.plan}
                                  onUpdated={refreshData}
                                />
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                                  onClick={() => handleDeleteUser(u.user_id, u.full_name || "Sans nom")}
                                  disabled={deletingUserId === u.user_id}
                                >
                                  {deletingUserId === u.user_id ? (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                  ) : (
                                    <Trash2 className="w-3 h-3" />
                                  )}
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {filteredUsers.length === 0 && <p className="text-xs text-muted-foreground text-center py-8">Aucun utilisateur trouvé</p>}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Orders Tab */}
            {activeTab === "orders" && (
              <OrderManager orders={orders} stats={stats} onRefresh={refreshData} />
            )}

            {/* Products Tab */}
            {activeTab === "products" && (
              <ProductsManager />
            )}

            {/* Deliveries Tab */}
            {activeTab === "deliveries" && (
              <DeliveryManager />
            )}

            {/* Demands Tab */}
            {activeTab === "demands" && (
              <DemandsManager />
            )}

            {/* Subscriptions Tab */}
            {activeTab === "subscriptions" && (
              <Card>
                <CardHeader className="p-3 sm:p-4 pb-2">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div>
                      <CardTitle className="text-sm">Abonnements attribués</CardTitle>
                      <CardDescription className="text-[11px]">
                        {stats?.pro_subscriptions || 0} Pro • {stats?.free_subscriptions || 0} Gratuit • {filteredSubscriptions.length} affichés
                      </CardDescription>
                    </div>
                    <Badge className="bg-secondary/15 text-secondary border-secondary/20">
                      <Crown className="w-3 h-3 mr-1" />{stats?.pro_subscriptions || 0} Pro
                    </Badge>
                  </div>
                  <div className="relative mt-2">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                    <Input
                      placeholder="Rechercher par nom, email ou téléphone..."
                      value={subscriptionSearch}
                      onChange={(e) => setSubscriptionSearch(e.target.value)}
                      className="pl-7 h-8 text-xs"
                    />
                  </div>
                </CardHeader>
                <CardContent className="p-3 sm:p-4 pt-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left py-2 px-2 font-medium text-muted-foreground">Utilisateur</th>
                          <th className="text-left py-2 px-2 font-medium text-muted-foreground hidden md:table-cell">Email</th>
                          <th className="text-center py-2 px-2 font-medium text-muted-foreground">Plan</th>
                          <th className="text-center py-2 px-2 font-medium text-muted-foreground">Statut</th>
                          <th className="text-center py-2 px-2 font-medium text-muted-foreground">Crédits</th>
                          <th className="text-center py-2 px-2 font-medium text-muted-foreground hidden sm:table-cell">Max produits</th>
                          <th className="text-left py-2 px-2 font-medium text-muted-foreground hidden md:table-cell">Expiration</th>
                          <th className="text-right py-2 px-2 font-medium text-muted-foreground">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredSubscriptions.map((s: any) => {
                          const expired = s.expires_at && new Date(s.expires_at) < new Date();
                          return (
                            <tr key={s.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                              <td className="py-2.5 px-2">
                                <p className="font-medium">{s.user_name || "Sans nom"}</p>
                                <p className="text-[10px] text-muted-foreground">{s.user_phone || "—"}</p>
                              </td>
                              <td className="py-2.5 px-2 hidden md:table-cell text-muted-foreground truncate max-w-[180px]">{s.user_email || "—"}</td>
                              <td className="py-2.5 px-2 text-center">
                                <Badge variant={s.plan === "pro" ? "default" : "secondary"} className="text-[9px] capitalize">{s.plan}</Badge>
                              </td>
                              <td className="py-2.5 px-2 text-center">
                                <Badge variant={s.status === "active" && !expired ? "default" : "destructive"} className="text-[9px]">
                                  {expired ? "Expiré" : s.status === "active" ? "Actif" : s.status}
                                </Badge>
                              </td>
                              <td className="py-2.5 px-2 text-center">
                                <Badge variant="outline" className="text-[9px] gap-1">
                                  <Coins className="w-2.5 h-2.5" />{Number(s.token_balance || 0).toLocaleString("fr-FR")}
                                </Badge>
                              </td>
                              <td className="py-2.5 px-2 text-center hidden sm:table-cell">{s.max_products}</td>
                              <td className="py-2.5 px-2 hidden md:table-cell text-muted-foreground">
                                {s.expires_at ? new Date(s.expires_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" }) : "—"}
                              </td>
                              <td className="py-2.5 px-2">
                                <UserSubscriptionActions
                                  userId={s.user_id}
                                  userName={s.user_name}
                                  currentPlan={s.plan}
                                  onUpdated={refreshData}
                                />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                    {filteredSubscriptions.length === 0 && <p className="text-xs text-muted-foreground text-center py-8">Aucun abonnement</p>}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Chat Tab */}
            {activeTab === "chat" && (
              <Card>
                <CardHeader className="p-3 sm:p-4 pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <MessageCircle className="w-4 h-4 text-primary" />
                    Messagerie admin
                  </CardTitle>
                  <CardDescription className="text-[11px]">Discutez avec les utilisateurs de la plateforme</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="flex h-[500px] border-t border-border">
                    {/* Conversation List */}
                    <div className="w-1/3 border-r border-border overflow-y-auto">
                      {conversations.length === 0 ? (
                        <div className="text-center py-8 px-3">
                          <MessageCircle className="w-8 h-8 mx-auto text-muted-foreground/50 mb-2" />
                          <p className="text-xs text-muted-foreground">Aucune conversation</p>
                        </div>
                      ) : (
                        conversations.map((conv: any) => {
                          const otherUser = conv.buyer_id === adminProfile?.id
                            ? conv["profiles!conversations_seller_id_fkey"]
                            : conv["profiles!conversations_buyer_id_fkey"];
                          return (
                            <button
                              key={conv.id}
                              onClick={() => setSelectedConv(conv)}
                              className={`w-full flex items-center gap-2.5 p-3 text-left hover:bg-muted/50 transition-colors border-b border-border/30 ${
                                selectedConv?.id === conv.id ? "bg-primary/5" : ""
                              }`}
                            >
                              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                                {otherUser?.avatar_url ? (
                                  <img src={otherUser.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                                ) : (
                                  <Users className="w-4 h-4 text-primary" />
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-xs font-medium truncate">{otherUser?.full_name || "Utilisateur"}</p>
                                <p className="text-[10px] text-muted-foreground truncate">
                                  {new Date(conv.updated_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                                </p>
                              </div>
                            </button>
                          );
                        })
                      )}
                    </div>

                    {/* Chat Area */}
                    <div className="flex-1 flex flex-col">
                      {selectedConv ? (
                        <>
                          <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
                            {chatMessages.map((msg: any, i: number) => {
                              const isMe = msg.sender_id === adminProfile?.id;
                              return (
                                <div key={msg.id || i} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                                  <div className={`max-w-[75%] rounded-xl px-3 py-2 text-xs ${
                                    isMe
                                      ? "bg-primary text-primary-foreground rounded-br-sm"
                                      : "bg-muted text-foreground rounded-bl-sm"
                                  }`}>
                                    <p>{msg.content}</p>
                                    <p className={`text-[9px] mt-0.5 ${isMe ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                                      {new Date(msg.created_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                                    </p>
                                  </div>
                                </div>
                              );
                            })}
                            <div ref={chatEndRef} />
                          </div>
                          <div className="p-3 border-t border-border flex gap-2">
                            <Input
                              value={newMessage}
                              onChange={(e) => setNewMessage(e.target.value)}
                              placeholder="Écrire un message..."
                              className="text-xs h-9"
                              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                            />
                            <Button size="sm" onClick={sendMessage} className="h-9 px-3">
                              <Send className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </>
                      ) : (
                        <div className="flex-1 flex items-center justify-center text-center p-4">
                          <div>
                            <MessageCircle className="w-10 h-10 mx-auto text-muted-foreground/30 mb-2" />
                            <p className="text-xs text-muted-foreground">Sélectionnez une conversation</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Categories Tab */}
            {activeTab === "categories" && (
              <CategoryManager />
            )}

            {/* Finances Tab */}
            {activeTab === "finances" && (
              <FinanceManager orders={orders} users={users} stats={stats} />
            )}

            {/* Withdrawals Tab */}
            {activeTab === "withdrawals" && (
              <WithdrawalManager />
            )}

            {/* Broadcast Notification Tab */}
            {activeTab === "broadcast" && (
              <BroadcastNotification users={users} />
            )}

            {/* Support Chat Tab */}
            {activeTab === "support" && (
              <SupportChat adminProfileId={adminProfile?.id} />
            )}

            {/* Emails Tab */}
            {activeTab === "emails" && (
              <EmailStatsManager />
            )}

            {/* KYC Tab */}
            {activeTab === "kyc" && (
              <KYCManager />
            )}

            {/* AI moderation history + email validation log */}
            {activeTab === "ai-history" && <AIModerationHistory />}

            {/* Nuku AI analytics */}
            {activeTab === "nuku-ai" && <NukuAIAnalytics />}

            {/* Admin audit log */}
            {activeTab === "audit" && <AdminAuditLog />}
        </main>
      </div>
      <Footer />
    </div>
  );
};

export default AdminDashboard;
