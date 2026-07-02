import SupportWidget from "@/components/SupportWidget";
import SEO from "@/components/SEO";
import { useState, useEffect, useRef } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/contexts/ProfileContext";
import { useTokens } from "@/hooks/useTokens";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import MobileBottomNav from "@/components/layout/MobileBottomNav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { useWishlist } from "@/hooks/useWishlist";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ShoppingBag, Heart, MessageCircle, Package, TrendingUp, Store,
  Star, MapPin, Clock, ChevronRight, Loader2, User, Bell, HandCoins,
  Eye, Truck, Settings, LogOut, Crown, FileDown, Receipt, Camera, Save, LayoutGrid, Coins, Plus, Rocket
} from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import CreateDemandModal from "@/components/marketplace/CreateDemandModal";
import DemandsList from "@/components/marketplace/DemandsList";
import AffiliationCard from "@/components/dashboard/AffiliationCard";
import DemandBoostModal from "@/components/dashboard/DemandBoostModal";
import DashboardLayout, { DashboardSidebarItem } from "@/components/layout/DashboardLayout";

import SubscriptionCard from "@/components/dashboard/SubscriptionCard";
import TokenWalletCard from "@/components/dashboard/TokenWalletCard";
import ProfileSettingsPanel from "@/components/dashboard/ProfileSettingsPanel";
import FormationsSection from "@/components/dashboard/FormationsSection";
import DeliveryTrackingWidget from "@/components/dashboard/DeliveryTrackingWidget";
import BuyerAIRecommendations from "@/components/dashboard/BuyerAIRecommendations";
import { generateInvoicePDF } from "@/utils/generateInvoicePDF";

const monthNames = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];

const BuyerDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t, formatPrice } = useLanguage();
  const { user, profile, isLoading: profileLoading, isReady, updateProfile } = useProfile();
  const [orders, setOrders] = useState<any[]>([]);
  const [conversations, setConversations] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("orders");
  const [searchParams] = useSearchParams();

  // Set active tab from URL query
  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab) setActiveTab(tab);
  }, [searchParams]);
  const { wishlist: wishlistItems } = useWishlist();
  const { balance: tokenBalance, loading: tokensLoading, refresh: refreshTokens } = useTokens();
  const [showDemandBoost, setShowDemandBoost] = useState(false);
  const [showCreateDemand, setShowCreateDemand] = useState(false);
  const [showMigrationModal, setShowMigrationModal] = useState(false);
  const [migrationData, setMigrationData] = useState({
    businessName: "",
    businessType: "",
    phone: "",
    location: "",
    bio: "",
  });
  const [migrating, setMigrating] = useState(false);
  useEffect(() => {
    if (!isReady || profileLoading) return;
    if (!user) { navigate("/auth?returnTo=/buyer-dashboard", { replace: true }); return; }
    if (!profile) { setIsLoading(false); return; }
    // Role guard
    if (profile.user_type === "producer" || profile.user_type === "trainer") { navigate("/dashboard", { replace: true }); return; }
    if (profile.user_type === "driver") { navigate("/driver-dashboard", { replace: true }); return; }
    if (profile.user_type === "learner") { navigate("/learner-dashboard", { replace: true }); return; }

    let isMounted = true;
    const loadData = async () => {
      try {
        const [ordersRes, convsRes, notifsRes] = await Promise.all([
          supabase.from("orders").select("*, products(*)").eq("buyer_id", profile.id).order("created_at", { ascending: false }),
          supabase.from("conversations").select("*, profiles!conversations_seller_id_fkey(full_name, avatar_url)").eq("buyer_id", profile.id).order("updated_at", { ascending: false }).limit(10),
          supabase.from("notifications").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(20),
        ]);
        if (!isMounted) return;
        setOrders(ordersRes.data || []);
        setConversations(convsRes.data || []);
        setNotifications(notifsRes.data || []);
      } catch (error) {
        console.error("Buyer dashboard load error:", error);
        if (!isMounted) return;
        setOrders([]);
        setConversations([]);
        setNotifications([]);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    loadData();
    return () => { isMounted = false; };
  }, [isReady, profileLoading, user, profile, navigate]);

  // Compute real purchase chart data from orders
  const purchaseData = (() => {
    const monthMap: Record<string, number> = {};
    orders.forEach(o => {
      const d = new Date(o.created_at);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      monthMap[key] = (monthMap[key] || 0) + (Number(o.total_price) || 0);
    });
    const now = new Date();
    const result = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      result.push({ name: monthNames[d.getMonth()], achats: monthMap[key] || 0 });
    }
    return result;
  })();

  // Dépenses comptabilisées uniquement quand le paiement Moneroo est confirmé/encaissé.
  const PAID_STATUSES = new Set(["confirmed", "completed", "paid", "delivered"]);
  const totalSpent = orders
    .filter((o: any) => PAID_STATUSES.has(String(o.status || "").toLowerCase()))
    .reduce((sum, o) => sum + (Number(o.total_price) || 0), 0);
  const pendingOrders = orders.filter(o => o.status === "pending").length;
  const unreadNotifs = notifications.filter(n => !n.is_read).length;

  const stats = [
    { label: "Commandes", value: orders.length, icon: ShoppingBag, color: "bg-primary/20 text-primary" },
    { label: "Dépensé", value: formatPrice(totalSpent), icon: TrendingUp, color: "bg-green-500/20 text-green-600" },
    { label: "Favoris", value: wishlistItems?.length || 0, icon: Heart, color: "bg-destructive/20 text-destructive" },
    { label: "Messages", value: conversations.length, icon: MessageCircle, color: "bg-accent/20 text-accent-foreground" },
  ];

  const handleBecomeProducer = async () => {
    if (!profile) return;
    if (!migrationData.businessName.trim() || !migrationData.phone.trim() || !migrationData.location.trim() || !migrationData.businessType) {
      toast({ title: t("form.requiredFields"), variant: "destructive" });
      return;
    }
    setMigrating(true);
    const { error } = await supabase.from("profiles").update({
      user_type: "producer",
      full_name: migrationData.businessName.trim(),
      location: migrationData.location.trim(),
      bio: migrationData.bio.trim() || null,
    }).eq("id", profile.id);
    // Save phone to private table
    if (user) {
      await supabase.from("profile_private").upsert({ user_id: user.id, phone: migrationData.phone.trim() }, { onConflict: "user_id" });
    }
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Félicitations ! 🎉", description: "Vous êtes maintenant fournisseur. Bienvenue sur votre tableau de bord vendeur !" });
      setShowMigrationModal(false);
      setTimeout(() => navigate("/dashboard"), 1500);
    }
    setMigrating(false);
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
    return <Badge variant={s.variant} className="text-[10px] sm:text-xs">{s.label}</Badge>;
  };

  if (!isReady || (!profile && profileLoading)) {
    return (
      <div className="min-h-screen bg-background pb-20 lg:pb-0">
      <SEO url="/buyer-dashboard" title="Tableau de bord Acheteur" description="Gérez vos commandes, suivez vos livraisons et découvrez des recommandations personnalisées." noIndex />
        <Header />
        <main className="py-3 sm:py-6">
          <div className="container mx-auto px-3 sm:px-4 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 sm:w-14 sm:h-14 rounded-full bg-muted animate-pulse" />
              <div className="space-y-2">
                <div className="h-5 w-40 bg-muted animate-pulse rounded" />
                <div className="h-3 w-28 bg-muted animate-pulse rounded" />
              </div>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {[1,2,3,4].map(i => (
                <div key={i} className="h-24 bg-muted animate-pulse rounded-xl" />
              ))}
            </div>
            <div className="h-64 bg-muted animate-pulse rounded-xl" />
          </div>
        </main>
        <MobileBottomNav />
      </div>
    );
  }

  const buyerSidebar: DashboardSidebarItem[] = [
    { label: "Mes commandes", icon: Package, tabValue: "orders", badge: pendingOrders > 0 ? pendingOrders : undefined },
    { label: "Favoris", icon: Heart, tabValue: "favorites" },
    { label: "Messages", icon: MessageCircle, tabValue: "messages" },
    { label: "Alertes", icon: Bell, tabValue: "alerts", badge: unreadNotifs > 0 ? unreadNotifs : undefined },
    { label: "Paiements", icon: Receipt, tabValue: "payments" },
    { label: "Paramètres", icon: Settings, tabValue: "settings" },
    { label: "Marketplace", icon: ShoppingBag, href: "/marketplace" },
    { label: "Suivi livraison", icon: Truck, href: "/suivi-livraison" },
    { label: "Adresse", icon: MapPin, href: "/adresse-livraison" },
    { label: "Devenir vendeur", icon: Store, href: "/devenir-fournisseur" },
  ];

  return (
    <div className="min-h-screen bg-background pb-20 lg:pb-0">
      <Header />

      <DashboardLayout
        sidebarTitle="Espace Acheteur"
        sidebarSubtitle={profile?.full_name || "Mon compte"}
        items={buyerSidebar}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      >
      <main className="pt-4 sm:pt-8 pb-8 sm:pb-12">
        <div className="container mx-auto px-3 sm:px-4 lg:px-6">
          {/* Welcome - responsive */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-5 sm:mb-8">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-11 h-11 sm:w-14 sm:h-14 rounded-full bg-gradient-hero flex items-center justify-center flex-shrink-0">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                ) : (
                  <User className="w-5 h-5 sm:w-7 sm:h-7 text-primary-foreground" />
                )}
              </div>
              <div className="min-w-0">
                <h1 className="font-heading text-sm sm:text-xl lg:text-2xl font-bold text-foreground truncate">
                  {new Date().getHours() < 12 ? "Bonjour" : new Date().getHours() < 18 ? "Bon après-midi" : "Bonsoir"}, {profile?.full_name?.split(' ')[0] || "Acheteur"} 👋
                </h1>
                <div className="text-[10px] sm:text-xs text-muted-foreground truncate flex items-center gap-1">
                  <Badge variant="outline" className="text-[8px] px-1 py-0 border-primary/40 text-primary">Acheteur</Badge>
                  Bienvenue dans votre espace acheteur
                </div>
              </div>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <Link to="/marketplace" className="flex-1 sm:flex-none">
                <Button variant="hero" className="gap-1.5 w-full text-xs sm:text-sm h-9 sm:h-10 whitespace-nowrap">
                  <ShoppingBag className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  Explorer
                </Button>
              </Link>
              <Link to="/suivi-livraison" className="flex-1 sm:flex-none">
                <Button variant="outline" className="gap-1.5 w-full text-xs sm:text-sm h-9 sm:h-10 whitespace-nowrap">
                  <Truck className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  Suivi
                </Button>
              </Link>
            </div>
          </div>

          {/* Résumé des achats — fusion portefeuille + stats principales */}
          <Card className="mb-5 sm:mb-8 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground overflow-hidden">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <Receipt className="w-5 h-5" />
                  <span className="text-sm font-semibold">Résumé des achats</span>
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  className="h-7 sm:h-8 gap-1 text-[10px] sm:text-xs"
                  onClick={() => setShowDemandBoost(true)}
                >
                  <Rocket className="w-3 h-3" /> Booster un besoin
                </Button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 sm:gap-4">
                <div>
                  <p className="text-[10px] text-primary-foreground/70">Total dépensé</p>
                  <p className="text-base sm:text-2xl font-bold">{formatPrice(totalSpent)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-primary-foreground/70">Commandes</p>
                  <p className="text-base sm:text-2xl font-bold">{orders.length}</p>
                </div>
                <div>
                  <p className="text-[10px] text-primary-foreground/70">En attente</p>
                  <p className="text-base sm:text-2xl font-bold text-accent">{pendingOrders}</p>
                </div>
                <div>
                  <p className="text-[10px] text-primary-foreground/70">Favoris</p>
                  <p className="text-base sm:text-2xl font-bold">{wishlistItems?.length || 0}</p>
                </div>
                <div className="col-span-2 sm:col-span-1 border-t sm:border-t-0 sm:border-l border-primary-foreground/20 sm:pl-4 pt-2 sm:pt-0">
                  <p className="text-[10px] text-primary-foreground/70 flex items-center gap-1">
                    <Coins className="w-3 h-3" /> Mes jetons
                  </p>
                  <p className="text-base sm:text-2xl font-bold">
                    {tokensLoading ? "…" : tokenBalance}
                  </p>
                  <p className="text-[9px] text-primary-foreground/60 mt-0.5">Boostez vos besoins d'achat</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Que recherchez-vous ? — placé juste après le résumé */}
          <Card className="mb-5 sm:mb-8 bg-gradient-to-r from-accent/5 to-primary/5 border-accent/10">
            <CardContent className="p-3 sm:p-6">
              <h3 className="font-heading text-sm sm:text-lg font-semibold text-foreground mb-1.5 sm:mb-2 flex items-center gap-2">
                <HandCoins className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                Que recherchez-vous ?
              </h3>
              <p className="text-[11px] sm:text-sm text-muted-foreground mb-3">
                Exprimez vos besoins pour que les fournisseurs vous contactent
              </p>
              <Button
                variant="hero"
                className="gap-1.5 text-xs sm:text-sm h-9 sm:h-10"
                onClick={() => setShowCreateDemand(true)}
              >
                <HandCoins className="w-3.5 h-3.5 sm:w-4 sm:h-4" />Exprimer un besoin
              </Button>
              <CreateDemandModal open={showCreateDemand} onOpenChange={setShowCreateDemand} />
              <div className="mt-3 sm:mt-4">
                <h4 className="text-xs sm:text-sm font-medium text-foreground mb-2">Mes demandes récentes</h4>
                <DemandsList limit={5} ownerOnly compact />
              </div>
            </CardContent>
          </Card>

          {/* Actions rapides — icônes (anciens onglets bas) */}
          <Card className="mb-5 sm:mb-8">
            <CardHeader className="p-3 sm:p-5 pb-2">
              <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                <LayoutGrid className="w-4 h-4 text-primary" />
                Actions rapides
              </CardTitle>
              <CardDescription className="text-[11px]">Accédez rapidement à vos espaces</CardDescription>
            </CardHeader>
            <CardContent className="p-3 sm:p-5 pt-0">
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 sm:gap-3">
                {[
                  // Commandes : page dédiée listant toutes les commandes (factures, paiements, traçabilité)
                  { label: "Commandes", icon: Package, href: "/mes-commandes", badge: pendingOrders },
                  { label: "Favoris", icon: Heart, tab: "favorites" },
                  { label: "Messages", icon: MessageCircle, tab: "messages" },
                  { label: "Alertes", icon: Bell, tab: "alerts", badge: unreadNotifs },
                  { label: "Paiements", icon: Receipt, tab: "payments" },
                  { label: "Paramètres", icon: Settings, tab: "settings" },
                ].map(({ label, icon: Icon, tab, href, badge }: any) => (
                  <button
                    key={label}
                    type="button"
                    aria-label={label}
                    onClick={() => {
                      if (href) {
                        navigate(href);
                        return;
                      }
                      setActiveTab(tab);
                      setTimeout(() => {
                        document.getElementById("buyer-tabs")?.scrollIntoView({ behavior: "smooth", block: "start" });
                      }, 50);
                    }}
                    className="relative flex flex-col items-center justify-center gap-1.5 p-3 sm:p-3 min-h-[72px] sm:min-h-[84px] rounded-xl border border-border bg-card hover:border-primary/40 hover:bg-primary/5 active:scale-[0.97] transition-all text-center touch-manipulation"
                  >
                    <div className="w-10 h-10 sm:w-10 sm:h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Icon className="w-5 h-5 sm:w-5 sm:h-5 text-primary" />
                    </div>
                    <span className="text-[11px] sm:text-xs font-medium text-foreground leading-tight">{label}</span>
                    {badge && badge > 0 ? (
                      <span className="absolute top-1 right-1 min-w-[18px] h-[18px] px-1 bg-destructive text-destructive-foreground rounded-full text-[10px] font-bold flex items-center justify-center">
                        {badge}
                      </span>
                    ) : null}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Purchase Chart - responsive */}
          <Card className="mb-5 sm:mb-8">
            <CardHeader className="p-3 sm:p-6 pb-2 sm:pb-4">
              <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
                <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                Évolution des achats
              </CardTitle>
            </CardHeader>
            <CardContent className="p-2 sm:p-6 pt-0">
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={purchaseData}>
                  <defs>
                    <linearGradient id="colorAchats" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={10} tickMargin={4} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} tickFormatter={(v) => `${v/1000}K`} width={35} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '12px'
                    }}
                    formatter={(value: number) => [formatPrice(value), 'Achats']}
                  />
                  <Area type="monotone" dataKey="achats" stroke="hsl(var(--primary))" fillOpacity={1} fill="url(#colorAchats)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* AI Recommendations */}
          {user && profile && (
            <div className="mb-5 sm:mb-8">
              <BuyerAIRecommendations userId={user.id} profileId={profile.id} location={profile.location || undefined} />
            </div>
          )}

          {/* Delivery Tracking Widget */}
          {profile && (
            <div className="mb-5 sm:mb-8">
              <DeliveryTrackingWidget profileId={profile.id} role="buyer" />
            </div>
          )}

          {/* Formations Section */}
          <div className="mb-5 sm:mb-8">
            <FormationsSection />
          </div>

          {/* Tabs - responsive with horizontal scroll on mobile */}
          <div id="buyer-tabs" className="scroll-mt-20" />
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 sm:space-y-6">
            <TabsList className="sr-only" aria-hidden="true">
              <TabsTrigger value="orders" className="gap-1 sm:gap-2 data-[state=active]:bg-background text-[11px] sm:text-sm px-2.5 sm:px-4 flex-shrink-0">
                <Package className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span className="hidden xs:inline">Commandes</span>
                <span className="xs:hidden">Cmd</span>
                {pendingOrders > 0 && (
                  <span className="ml-1 w-4 h-4 sm:w-5 sm:h-5 bg-primary text-primary-foreground rounded-full text-[9px] sm:text-[10px] flex items-center justify-center font-bold">
                    {pendingOrders}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="favorites" className="gap-1 sm:gap-2 data-[state=active]:bg-background text-[11px] sm:text-sm px-2.5 sm:px-4 flex-shrink-0">
                <Heart className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                Favoris
              </TabsTrigger>
              <TabsTrigger value="messages" className="gap-1 sm:gap-2 data-[state=active]:bg-background text-[11px] sm:text-sm px-2.5 sm:px-4 flex-shrink-0">
                <MessageCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                Messages
              </TabsTrigger>
              <TabsTrigger value="alerts" className="gap-1 sm:gap-2 data-[state=active]:bg-background text-[11px] sm:text-sm px-2.5 sm:px-4 flex-shrink-0">
                <Bell className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                Alertes
                {unreadNotifs > 0 && (
                  <span className="ml-1 w-4 h-4 bg-destructive text-white rounded-full text-[9px] flex items-center justify-center font-bold">
                    {unreadNotifs}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="payments" className="gap-1 sm:gap-2 data-[state=active]:bg-background text-[11px] sm:text-sm px-2.5 sm:px-4 flex-shrink-0">
                <Receipt className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                Paiements
              </TabsTrigger>
              <TabsTrigger value="settings" className="gap-1 sm:gap-2 data-[state=active]:bg-background text-[11px] sm:text-sm px-2.5 sm:px-4 flex-shrink-0">
                <Settings className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                Paramètres
              </TabsTrigger>
            </TabsList>

            {/* Affiliation earnings — visible across tabs at the top */}
            {user?.id && (
              <div className="mt-4">
                <AffiliationCard userId={user.id} />
              </div>
            )}

            {/* Orders Tab */}
            <TabsContent value="orders">
              <Card>
                <CardHeader className="p-3 sm:p-6 pb-2 sm:pb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-sm sm:text-base">Commandes récentes</CardTitle>
                      <CardDescription className="text-[11px] sm:text-sm">Suivez l'état de vos commandes</CardDescription>
                    </div>
                    <Link to="/suivi-livraison">
                      <Button variant="ghost" size="sm" className="gap-1 text-[11px] sm:text-xs h-8">
                        <Truck className="w-3 h-3" />Tout voir
                      </Button>
                    </Link>
                  </div>
                </CardHeader>
                <CardContent className="p-3 sm:p-6 pt-0">
                  {orders.length === 0 ? (
                    <div className="text-center py-8 sm:py-12">
                      <Package className="w-10 h-10 sm:w-12 sm:h-12 mx-auto text-muted-foreground/50 mb-3 sm:mb-4" />
                      <p className="text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4">Aucune commande</p>
                      <Link to="/marketplace">
                        <Button variant="hero" className="text-xs sm:text-sm h-9">Découvrir les produits</Button>
                      </Link>
                    </div>
                  ) : (() => {
                    const norm = (s: any) => String(s || "").toLowerCase();
                    const inProgress = orders.filter(o => ["pending", "confirmed", "processing", "shipped", "in-transit"].includes(norm(o.status)));
                    const done = orders.filter(o => ["completed", "delivered", "paid"].includes(norm(o.status)));
                    const failed = orders.filter(o => ["failed", "payment_failed", "error", "expired", "rejected"].includes(norm(o.status)));
                    const cancelled = orders.filter(o => ["cancelled", "canceled", "refunded"].includes(norm(o.status)));
                    const known = new Set([...inProgress, ...done, ...failed, ...cancelled].map(o => o.id));
                    const others = orders.filter(o => !known.has(o.id));

                    const renderList = (list: any[]) => (
                      list.length === 0 ? (
                        <p className="text-center text-[11px] sm:text-xs text-muted-foreground py-6">Aucune commande dans cette catégorie.</p>
                      ) : (
                        <div className="space-y-2.5 sm:space-y-4">
                          {list.map((order) => (
                            <Link key={order.id} to={`/commande/${order.id}`} className="block">
                              <div className="flex items-center justify-between p-2.5 sm:p-4 bg-muted/50 rounded-xl hover:bg-muted transition-colors gap-2">
                                <div className="flex items-center gap-2.5 sm:gap-4 min-w-0 flex-1">
                                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                                    <Package className="w-4 h-4 sm:w-6 sm:h-6 text-primary" />
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <p className="font-medium text-xs sm:text-sm truncate">{order.products?.name || "Produit"}</p>
                                    <p className="text-[10px] sm:text-xs text-muted-foreground">
                                      {order.quantity} × {formatPrice(Number(order.products?.price || 0))}
                                    </p>
                                    <p className="text-[9px] sm:text-[11px] text-muted-foreground mt-0.5">
                                      {new Date(order.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                                    </p>
                                  </div>
                                </div>
                                <div className="text-right flex-shrink-0 ml-2">
                                  {getStatusBadge(order.status)}
                                  <p className="text-xs sm:text-sm font-semibold text-primary mt-1">
                                    {formatPrice(Number(order.total_price))}
                                  </p>
                                </div>
                              </div>
                            </Link>
                          ))}
                        </div>
                      )
                    );

                    return (
                      <Tabs defaultValue="in-progress" className="w-full">
                        <TabsList className="w-full grid grid-cols-5 h-auto p-1 bg-muted/60 mb-3">
                          <TabsTrigger value="in-progress" className="text-[10px] sm:text-xs px-1 sm:px-2 py-1.5">
                            En cours <span className="ml-1 opacity-70">({inProgress.length})</span>
                          </TabsTrigger>
                          <TabsTrigger value="done" className="text-[10px] sm:text-xs px-1 sm:px-2 py-1.5">
                            Terminé <span className="ml-1 opacity-70">({done.length})</span>
                          </TabsTrigger>
                          <TabsTrigger value="failed" className="text-[10px] sm:text-xs px-1 sm:px-2 py-1.5 data-[state=active]:text-destructive">
                            Échouées <span className="ml-1 opacity-70">({failed.length})</span>
                          </TabsTrigger>
                          <TabsTrigger value="cancelled" className="text-[10px] sm:text-xs px-1 sm:px-2 py-1.5">
                            Annulé <span className="ml-1 opacity-70">({cancelled.length})</span>
                          </TabsTrigger>
                          <TabsTrigger value="others" className="text-[10px] sm:text-xs px-1 sm:px-2 py-1.5">
                            Autres <span className="ml-1 opacity-70">({others.length})</span>
                          </TabsTrigger>
                        </TabsList>
                        <TabsContent value="in-progress">{renderList(inProgress)}</TabsContent>
                        <TabsContent value="done">{renderList(done)}</TabsContent>
                        <TabsContent value="failed">
                          {failed.length === 0 ? (
                            <p className="text-center text-[11px] sm:text-xs text-muted-foreground py-6">Aucune commande échouée — tout est ok ✅</p>
                          ) : (
                            <div className="space-y-2.5 sm:space-y-3">
                              {failed.map((order) => {
                                const reason = (order.notes && String(order.notes).trim())
                                  || (String(order.status).toLowerCase() === "expired" ? "Délai de paiement dépassé." : "")
                                  || (String(order.status).toLowerCase() === "rejected" ? "Paiement refusé par l'opérateur." : "")
                                  || "Échec du paiement ou erreur réseau. Vous pouvez réessayer.";
                                return (
                                  <div key={order.id} className="p-2.5 sm:p-3 border border-destructive/30 bg-destructive/5 rounded-xl">
                                    <div className="flex items-start justify-between gap-2 mb-1.5">
                                      <div className="min-w-0 flex-1">
                                        <p className="font-medium text-xs sm:text-sm truncate">{order.products?.name || "Produit"}</p>
                                        <p className="text-[10px] sm:text-xs text-muted-foreground">
                                          {order.quantity} × {formatPrice(Number(order.products?.price || 0))} — {new Date(order.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                                        </p>
                                      </div>
                                      {getStatusBadge(order.status)}
                                    </div>
                                    <p className="text-[11px] sm:text-xs text-destructive/90 mb-2 line-clamp-2"><span className="font-semibold">Motif :</span> {reason}</p>
                                    <div className="flex flex-wrap gap-2">
                                      <Link to={`/commande/${order.id}`}>
                                        <Button size="sm" variant="outline" className="h-7 text-[10px] sm:text-xs">Voir détails</Button>
                                      </Link>
                                      {order.product_id && (
                                        <Link to={`/produit/${order.product_id}?retryOrder=${order.id}`}>
                                          <Button size="sm" variant="hero" className="h-7 text-[10px] sm:text-xs gap-1">
                                            <ShoppingBag className="w-3 h-3" /> Réessayer la commande
                                          </Button>
                                        </Link>
                                      )}
                                      <Link to="/help">
                                        <Button size="sm" variant="ghost" className="h-7 text-[10px] sm:text-xs">Contacter le support</Button>
                                      </Link>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </TabsContent>
                        <TabsContent value="cancelled">{renderList(cancelled)}</TabsContent>
                        <TabsContent value="others">{renderList(others)}</TabsContent>
                      </Tabs>
                    );
                  })()}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Favorites Tab */}
            <TabsContent value="favorites">
              <Card>
                <CardHeader className="p-3 sm:p-6 pb-2 sm:pb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-sm sm:text-base">Produits favoris</CardTitle>
                      <CardDescription className="text-[11px] sm:text-sm">Retrouvez vos produits préférés</CardDescription>
                    </div>
                    <Link to="/favoris">
                      <Button variant="ghost" size="sm" className="gap-1 text-[11px] sm:text-xs h-8">
                        <Heart className="w-3 h-3" />Tout voir
                      </Button>
                    </Link>
                  </div>
                </CardHeader>
                <CardContent className="p-3 sm:p-6 pt-0">
                  {(!wishlistItems || wishlistItems.length === 0) ? (
                    <div className="text-center py-8 sm:py-12">
                      <Heart className="w-10 h-10 sm:w-12 sm:h-12 mx-auto text-muted-foreground/50 mb-3 sm:mb-4" />
                      <p className="text-xs sm:text-sm text-muted-foreground mb-3">Aucun favori pour le moment</p>
                      <Link to="/marketplace">
                        <Button variant="outline" className="text-xs sm:text-sm h-9">Parcourir les produits</Button>
                      </Link>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-4">
                      {wishlistItems.slice(0, 6).map((item: any) => (
                        <Link key={item.id} to={`/produit/${item.product_id}`}>
                          <Card className="group hover:shadow-elevated transition-all">
                            <CardContent className="p-2.5 sm:p-3">
                              <div className="flex gap-2.5 sm:gap-3 items-center">
                                <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                                  <Heart className="w-5 h-5 text-destructive" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h4 className="font-medium text-xs sm:text-sm text-foreground group-hover:text-primary transition-colors truncate">
                                    Produit favori
                                  </h4>
                                  <p className="text-[10px] sm:text-xs text-muted-foreground">
                                    Ajouté le {new Date(item.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                                  </p>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </Link>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Messages Tab */}
            <TabsContent value="messages">
              <Card>
                <CardHeader className="p-3 sm:p-6 pb-2 sm:pb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-sm sm:text-base">Mes conversations</CardTitle>
                      <CardDescription className="text-[11px] sm:text-sm">Échangez avec les producteurs</CardDescription>
                    </div>
                    <Link to="/messages">
                      <Button variant="ghost" size="sm" className="gap-1 text-[11px] sm:text-xs h-8">
                        <MessageCircle className="w-3 h-3" />Tout voir
                      </Button>
                    </Link>
                  </div>
                </CardHeader>
                <CardContent className="p-3 sm:p-6 pt-0">
                  {conversations.length === 0 ? (
                    <div className="text-center py-8 sm:py-12">
                      <MessageCircle className="w-10 h-10 sm:w-12 sm:h-12 mx-auto text-muted-foreground/50 mb-3 sm:mb-4" />
                      <p className="text-xs sm:text-sm text-muted-foreground mb-3">Aucune conversation</p>
                      <Link to="/marketplace">
                        <Button variant="outline" className="text-xs sm:text-sm h-9">Contacter un producteur</Button>
                      </Link>
                    </div>
                  ) : (
                    <div className="space-y-2 sm:space-y-3">
                      {conversations.map((conv) => (
                        <Link key={conv.id} to="/messages" className="block">
                          <div className="flex items-center gap-2.5 sm:gap-3 p-2.5 sm:p-3 bg-muted/50 rounded-xl hover:bg-muted transition-colors">
                            <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 overflow-hidden">
                              {conv.profiles?.avatar_url ? (
                                <img src={conv.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <User className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-xs sm:text-sm truncate">{conv.profiles?.full_name || "Vendeur"}</p>
                              <p className="text-[10px] sm:text-xs text-muted-foreground">
                                {new Date(conv.updated_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                              </p>
                            </div>
                            <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Alerts Tab - now shows real notifications */}
            <TabsContent value="alerts">
              <Card>
                <CardHeader className="p-3 sm:p-6 pb-2 sm:pb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-sm sm:text-base">Notifications</CardTitle>
                      <CardDescription className="text-[11px] sm:text-sm">Vos alertes et mises à jour</CardDescription>
                    </div>
                    <Link to="/notifications">
                      <Button variant="ghost" size="sm" className="gap-1 text-[11px] sm:text-xs h-8">
                        <Bell className="w-3 h-3" />Tout voir
                      </Button>
                    </Link>
                  </div>
                </CardHeader>
                <CardContent className="p-3 sm:p-6 pt-0">
                  {notifications.length === 0 ? (
                    <div className="text-center py-8 sm:py-12">
                      <Bell className="w-10 h-10 sm:w-12 sm:h-12 mx-auto text-muted-foreground/50 mb-3 sm:mb-4" />
                      <p className="text-xs sm:text-sm text-muted-foreground">Aucune notification</p>
                    </div>
                  ) : (
                    <div className="space-y-2 sm:space-y-3">
                      {notifications.map((notif) => (
                        <div key={notif.id} className={`flex items-start gap-2.5 sm:gap-3 p-2.5 sm:p-3 rounded-xl transition-colors ${notif.is_read ? 'bg-muted/30' : 'bg-primary/5 border border-primary/10'}`}>
                          <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${notif.is_read ? 'bg-muted-foreground/30' : 'bg-primary'}`} />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-xs sm:text-sm">{notif.title}</p>
                            {notif.description && (
                              <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 line-clamp-2">{notif.description}</p>
                            )}
                            <p className="text-[9px] sm:text-[11px] text-muted-foreground mt-1">
                              {new Date(notif.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Payments History Tab */}
            <TabsContent value="payments">
              <Card>
                <CardHeader className="p-3 sm:p-6 pb-2 sm:pb-4">
                  <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                    <Receipt className="w-4 h-4 text-primary" />
                    Historique des paiements
                  </CardTitle>
                  <CardDescription className="text-[11px] sm:text-sm">Toutes vos transactions et factures</CardDescription>
                </CardHeader>
                <CardContent className="p-3 sm:p-6 pt-0">
                  {orders.length === 0 ? (
                    <div className="text-center py-8 sm:py-12">
                      <Receipt className="w-10 h-10 sm:w-12 sm:h-12 mx-auto text-muted-foreground/50 mb-3 sm:mb-4" />
                      <p className="text-xs sm:text-sm text-muted-foreground mb-3">Aucun paiement effectué</p>
                      <Link to="/marketplace">
                        <Button variant="hero" className="text-xs sm:text-sm h-9">Découvrir les produits</Button>
                      </Link>
                    </div>
                  ) : (
                    <div className="space-y-2 sm:space-y-3">
                      {/* Summary */}
                      <div className="grid grid-cols-3 gap-2 mb-3">
                        <div className="p-2.5 bg-primary/5 rounded-xl text-center">
                          <p className="text-[10px] text-muted-foreground">Total payé</p>
                          <p className="font-bold text-xs sm:text-sm text-primary">{formatPrice(totalSpent)}</p>
                        </div>
                        <div className="p-2.5 bg-muted rounded-xl text-center">
                          <p className="text-[10px] text-muted-foreground">Transactions</p>
                          <p className="font-bold text-xs sm:text-sm">{orders.length}</p>
                        </div>
                        <div className="p-2.5 bg-muted rounded-xl text-center">
                          <p className="text-[10px] text-muted-foreground">En attente</p>
                          <p className="font-bold text-xs sm:text-sm text-accent-foreground">{pendingOrders}</p>
                        </div>
                      </div>

                      {orders.map((order) => {
                        const notesParts = (order.notes || "").split(" | ");
                        const paymentInfo = notesParts.find((n: string) => n.startsWith("Paiement:"))?.replace("Paiement: ", "") || "Mobile Money";

                        return (
                          <div key={order.id} className="flex items-center justify-between p-2.5 sm:p-4 bg-muted/50 rounded-xl">
                            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                                <Receipt className="w-4 h-4 text-primary" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="font-medium text-xs sm:text-sm truncate">{order.products?.name || "Produit"}</p>
                                <p className="text-[10px] text-muted-foreground">{paymentInfo}</p>
                                <p className="text-[9px] text-muted-foreground">
                                  {new Date(order.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                              <div className="text-right">
                                {getStatusBadge(order.status)}
                                <p className="text-xs sm:text-sm font-bold text-primary mt-0.5">{formatPrice(Number(order.total_price))}</p>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                                title="Télécharger la facture"
                                onClick={() => {
                                  const created = new Date(order.created_at);
                                  const invoiceNumber = `NK-${created.getFullYear()}${String(created.getMonth() + 1).padStart(2, "0")}${String(created.getDate()).padStart(2, "0")}-${order.id.substring(0, 6).toUpperCase()}`;
                                  const deliveryInfo = notesParts.find((n: string) => n.startsWith("Livraison:")) || "Retrait sur place";
                                  const telInfo = notesParts.find((n: string) => n.startsWith("Tél"))?.replace(/Tél[^:]*: /, "") || "";

                                  generateInvoicePDF({
                                    invoiceNumber,
                                    date: created.toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" }),
                                    buyerName: profile?.full_name || "Client",
                                    buyerPhone: profile?.phone,
                                    deliveryMethod: deliveryInfo,
                                    deliveryPrice: 0,
                                    paymentMethod: paymentInfo,
                                    mobileNumber: telInfo,
                                    items: [{
                                      name: order.products?.name || "Produit",
                                      quantity: Number(order.quantity),
                                      unitPrice: Number(order.products?.price || 0),
                                      unit: order.products?.unit || "unité",
                                      sellerName: "Vendeur",
                                    }],
                                    subtotal: Number(order.total_price),
                                    total: Number(order.total_price),
                                  });
                                }}
                              >
                                <FileDown className="w-4 h-4 text-primary" />
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Settings Tab */}
            <TabsContent value="settings">
              <ProfileSettingsPanel profile={profile} user={user} onProfileUpdate={(updated) => updateProfile(updated)} />
            </TabsContent>

          </Tabs>
        </div>
      </main>
      </DashboardLayout>

      {/* Modal de boost de besoin */}
      <DemandBoostModal
        open={showDemandBoost}
        onOpenChange={setShowDemandBoost}
        onBoostSuccess={() => refreshTokens()}
      />

      {/* Migration Modal */}
      <Dialog open={showMigrationModal} onOpenChange={setShowMigrationModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Store className="w-5 h-5 text-primary" />
              Devenir fournisseur
            </DialogTitle>
            <DialogDescription className="text-xs">
              {t("buyer.becomeSellerHint")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">
                Nom de l'entreprise / exploitation <span className="text-destructive">*</span>
              </Label>
              <Input
                value={migrationData.businessName}
                onChange={(e) => setMigrationData(d => ({ ...d, businessName: e.target.value }))}
                placeholder="Ex: Ferme Komi, Élevage Sena..."
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">
                Type d'activité <span className="text-destructive">*</span>
              </Label>
              <Select value={migrationData.businessType} onValueChange={(v) => setMigrationData(d => ({ ...d, businessType: v }))}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Sélectionner votre domaine" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="agriculture">Agriculture</SelectItem>
                  <SelectItem value="elevage">Élevage</SelectItem>
                  <SelectItem value="pisciculture">Pisciculture / Aquaculture</SelectItem>
                  <SelectItem value="aviculture">Aviculture</SelectItem>
                  <SelectItem value="agroalimentaire">Agroalimentaire</SelectItem>
                  <SelectItem value="foresterie">Foresterie</SelectItem>
                  <SelectItem value="agribusiness">Agribusiness</SelectItem>
                  <SelectItem value="autre">Autre</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">
                Téléphone <span className="text-destructive">*</span>
              </Label>
              <Input
                type="tel"
                value={migrationData.phone}
                onChange={(e) => setMigrationData(d => ({ ...d, phone: e.target.value }))}
                placeholder="Ex: +228 90 12 34 56"
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">
                Localisation <span className="text-destructive">*</span>
              </Label>
              <Input
                value={migrationData.location}
                onChange={(e) => setMigrationData(d => ({ ...d, location: e.target.value }))}
                placeholder="Ex: Lomé, Kara, Sokodé..."
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Description de votre activité</Label>
              <Textarea
                value={migrationData.bio}
                onChange={(e) => setMigrationData(d => ({ ...d, bio: e.target.value }))}
                placeholder="Décrivez brièvement vos produits et votre expérience..."
                className="text-sm min-h-[70px]"
              />
            </div>
          </div>
          <DialogFooter className="flex gap-2 sm:gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setShowMigrationModal(false)} className="text-xs flex-1">
              Annuler
            </Button>
            <Button
              size="sm"
              className="gap-1.5 text-xs flex-1"
              onClick={handleBecomeProducer}
              disabled={migrating || !migrationData.businessName || !migrationData.phone || !migrationData.location || !migrationData.businessType}
            >
              {migrating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Store className="w-3.5 h-3.5" />}
              Confirmer la migration
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Footer />
      <SupportWidget userId={user?.id} userName={profile?.full_name || undefined} />
      <MobileBottomNav />
    </div>
  );
};


export default BuyerDashboard;
