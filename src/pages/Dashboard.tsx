import SupportWidget from "@/components/SupportWidget";
import SupplierVerificationPopup from "@/components/supplier/SupplierVerificationPopup";
import SupplierKYCSection from "@/components/supplier/SupplierKYCSection";
import SEO from "@/components/SEO";
import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/contexts/ProfileContext";
import { useSubscription } from "@/hooks/useSubscription";
import { useSubscriptionExpiry } from "@/hooks/useSubscriptionExpiry";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import MobileBottomNav from "@/components/layout/MobileBottomNav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { StatsGrid } from "@/components/dashboard/DashboardStats";
import { SalesAreaChart, OrdersBarChart, CategoryPieInfo } from "@/components/dashboard/SalesChart";
import AddProductModal from "@/components/dashboard/AddProductModal";
import AddFormationModal from "@/components/dashboard/AddFormationModal";
import PublishChoiceModal from "@/components/dashboard/PublishChoiceModal";
import ProfileSettingsPanel from "@/components/dashboard/ProfileSettingsPanel";
import WithdrawalPanel from "@/components/dashboard/WithdrawalPanel";
import DeliveryTrackingWidget from "@/components/dashboard/DeliveryTrackingWidget";
import DemandsList from "@/components/marketplace/DemandsList";
import CSVProductImport from "@/components/dashboard/CSVProductImport";
import ProductBoostModal from "@/components/dashboard/ProductBoostModal";
import AffiliationCard from "@/components/dashboard/AffiliationCard";
import SupplierAIRecommendations from "@/components/dashboard/SupplierAIRecommendations";
import FreePlanRenewalBanner from "@/components/dashboard/FreePlanRenewalBanner";
import ProductQuotaCard from "@/components/dashboard/ProductQuotaCard";
import PremiumFeaturesPanel from "@/components/dashboard/PremiumFeaturesPanel";
import ProductStatusBadge from "@/components/dashboard/ProductStatusBadge";
import DashboardLayout, { DashboardSidebarItem } from "@/components/layout/DashboardLayout";
import SellerOrdersToValidate from "@/components/dashboard/SellerOrdersToValidate";
import ProductBoostStats from "@/components/dashboard/ProductBoostStats";
import { useActiveBoosts, isProductBoosted } from "@/hooks/useBoosts";
import { useTokens } from "@/hooks/useTokens";
import {
  Package, ShoppingCart, DollarSign, Plus, Edit,
  Trash2, Eye, Rocket, BarChart3, Users, Loader2, MessageCircle,
  QrCode, TrendingUp, MapPin, Truck, Calendar, User, Settings, Wallet, Gift, ShieldCheck, LayoutDashboard, Sparkles, ChevronDown, Coins
} from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const Dashboard = () => {
  const [showBoostsDialog, setShowBoostsDialog] = useState(false);
  const [showAffiliationDialog, setShowAffiliationDialog] = useState(false);
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const [showWithdrawalsDialog, setShowWithdrawalsDialog] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user, profile, isLoading: profileLoading, isReady, updateProfile } = useProfile();
  const [products, setProducts] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [showPublishChoice, setShowPublishChoice] = useState(false);
  const [showAddFormation, setShowAddFormation] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [boostProduct, setBoostProduct] = useState<any>(null);
  const [productToDelete, setProductToDelete] = useState<any>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { data: activeBoosts = [] } = useActiveBoosts();
  const { subscription } = useSubscription();
  const { balance: tokenBalance } = useTokens();
  useSubscriptionExpiry(user?.id);

  // Helper : ouvre le sélecteur Produit/Formation
  const openPublishFlow = () => setShowPublishChoice(true);

  const fetchProducts = async (profileId: string) => {
    const { data } = await supabase.from("products").select("*").eq("producer_id", profileId).order("created_at", { ascending: false });
    setProducts(data || []);
  };

  useEffect(() => {
    if (!isReady || profileLoading) return;
    if (!user) { navigate("/auth", { replace: true }); return; }
    if (!profile) {
      setIsLoading(false);
      return;
    }
    // Role guard: only producers and trainers should see this dashboard
    if (profile.user_type !== "producer" && profile.user_type !== "trainer") {
      if (profile.user_type === "driver") navigate("/driver-dashboard", { replace: true });
      else if (profile.user_type === "learner") navigate("/learner-dashboard", { replace: true });
      else navigate("/buyer-dashboard", { replace: true });
      return;
    }

    let isMounted = true;
    const loadData = async () => {
      const [prodRes, ordersRes] = await Promise.all([
        supabase.from("products").select("*").eq("producer_id", profile.id).order("created_at", { ascending: false }),
        supabase.from("orders").select("*, products(*)").eq("seller_id", profile.id).order("created_at", { ascending: false }),
      ]);
      if (!isMounted) return;
      setProducts(prodRes.data || []);
      setOrders(ordersRes.data || []);
      setIsLoading(false);
    };
    loadData();
    return () => { isMounted = false; };
  }, [isReady, profileLoading, user, profile, navigate]);

  // Realtime: sync products list across tabs/devices when CRUD happens
  useEffect(() => {
    if (!profile?.id) return;
    const channel = supabase
      .channel(`dashboard-products-${profile.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "products", filter: `producer_id=eq.${profile.id}` },
        () => { fetchProducts(profile.id); }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [profile?.id]);


  const paidStatuses = new Set(["confirmed", "processing", "shipped", "completed", "paid", "delivered"]);
  const paidOrders = orders.filter(o => paidStatuses.has(String(o.status || "").toLowerCase()));
  const totalSales = paidOrders.reduce((sum, o) => sum + (Number(o.total_price) || 0), 0);
  const completedOrders = orders.filter(o => ["completed", "delivered"].includes(String(o.status || "").toLowerCase())).length;
  const pendingOrders = orders.filter(o => o.status === "pending").length;
  
  // Commission based on plan
  const commissionRate = subscription?.plan === "business" ? 3 : subscription?.plan === "pro" ? 5 : 8;
  const commissionAmount = Math.round(totalSales * commissionRate / 100);
  const netRevenue = totalSales - commissionAmount;
  
  const stats = [
    { label: "Produits", value: products.length, icon: Package, color: "bg-primary/20 text-primary" },
    { label: "Commandes payées", value: paidOrders.length, icon: ShoppingCart, color: "bg-accent/20 text-accent-foreground" },
    { label: "Ventes réelles", value: totalSales.toLocaleString("en-US") + " F", icon: DollarSign, color: "bg-green-500/20 text-green-600" },
    { label: `Revenu net (-${commissionRate}%)`, value: netRevenue.toLocaleString("en-US") + " F", icon: TrendingUp, color: "bg-blue-500/20 text-blue-600" },
  ];

  const confirmDeleteProduct = async () => {
    if (!productToDelete) return;
    setIsDeleting(true);
    const productId = productToDelete.id;
    // Optimistic update — disparaît immédiatement de la liste locale
    setProducts((prev) => prev.filter((p) => p.id !== productId));
    const { error } = await supabase.from("products").delete().eq("id", productId);
    setIsDeleting(false);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      // Recharge en cas d'échec pour rétablir l'état réel
      fetchProducts(profile.id);
    } else {
      toast({ title: "Produit supprimé", description: "Le produit a été retiré de la marketplace." });
      // Invalidate marketplace caches so changes appear immediately everywhere
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["product", productId] });
    }
    setProductToDelete(null);
  };

  if (isLoading || profileLoading) {
    return (
      <div className="min-h-screen bg-background pb-20 lg:pb-0">
      <SEO url="/dashboard" title="Tableau de bord Fournisseur" description="Gérez vos produits, suivez vos ventes et développez votre activité." noIndex />
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

  const supplierSidebar: DashboardSidebarItem[] = [
    { label: "Tableau de bord", icon: LayoutDashboard, href: "/dashboard" },
    { label: "Ma boutique", icon: Package, onClick: () => document.getElementById("products-section")?.scrollIntoView({ behavior: "smooth" }) },
    { label: "Publier", icon: Plus, onClick: openPublishFlow },
    { label: "Modération", icon: ShieldCheck, href: "/moderation" },
    { label: "Commandes", icon: ShoppingCart, href: "/mes-commandes" },
    { label: "Traçabilité", icon: QrCode, href: "/tracabilite" },
    { label: "Messages", icon: MessageCircle, href: "/messages" },
    { label: "Formations", icon: Calendar, href: "/formations" },
    { label: "Mon abonnement", icon: Sparkles, href: "/plans" },
    { label: "Jetons", icon: Coins, href: "/jetons" },
    { label: "Retraits", icon: Wallet, onClick: () => {
      document.getElementById("withdrawals-section")?.setAttribute("open", "true");
      document.getElementById("withdrawals-section")?.scrollIntoView({ behavior: "smooth" });
    }},
    { label: "Paramètres", icon: Settings, href: "/settings" },
  ];

  return (
    <div className="min-h-screen bg-background pb-20 lg:pb-0">
      <Header />
      <DashboardLayout
        sidebarTitle="Espace Fournisseur"
        sidebarSubtitle={profile?.business_name || profile?.full_name || "Mon compte"}
        items={supplierSidebar}
      >
      <main className="py-3 sm:py-6">
        <div className="container mx-auto px-3 sm:px-4 lg:px-6">
          {/* Welcome */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
            <div className="flex items-center gap-3 min-w-0">
              <div className="relative w-11 h-11 sm:w-14 sm:h-14 rounded-full bg-gradient-hero flex items-center justify-center flex-shrink-0">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                ) : (
                  <User className="w-5 h-5 sm:w-7 sm:h-7 text-primary-foreground" />
                )}
                {profile?.is_verified && (
                  <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center border-2 border-card">
                    <ShieldCheck className="w-3 h-3 text-white" />
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h1 className="font-heading text-sm sm:text-xl lg:text-2xl font-bold text-foreground truncate">
                    {new Date().getHours() < 12 ? "Bonjour" : new Date().getHours() < 18 ? "Bon après-midi" : "Bonsoir"}, {profile?.business_name?.split(' ')[0] || profile?.full_name?.split(' ')[0] || "Fournisseur"} 👋
                  </h1>
                  {profile?.is_verified && (
                    <Badge className="bg-emerald-500 text-white text-[8px] px-1.5 py-0 gap-0.5 flex-shrink-0">
                      <ShieldCheck className="w-2.5 h-2.5" /> Vérifié
                    </Badge>
                  )}
                </div>
                <p className="text-[10px] sm:text-xs text-muted-foreground truncate flex items-center gap-1">
                  <Badge variant="outline" className="text-[8px] px-1 py-0 border-primary/40 text-primary">Fournisseur</Badge>
                  {profile?.business_name || "Espace fournisseur"}
                </p>
              </div>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <Button variant="outline" size="sm" className="gap-1 text-[10px] sm:text-xs h-8 whitespace-nowrap" onClick={openPublishFlow}>
                <Plus className="w-3.5 h-3.5" />Ajouter produit
              </Button>
              <Link to="/plans">
                <Button variant="hero" size="sm" className="gap-1 text-[10px] sm:text-xs h-8 whitespace-nowrap">
                  <Rocket className="w-3.5 h-3.5" />Booster
                </Button>
              </Link>
            </div>
          </div>

          {/* Wallet / Balance Card with integrated tokens */}
          <Card className="mb-4 sm:mb-6 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground overflow-hidden">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <Wallet className="w-5 h-5" />
                  <span className="text-sm font-semibold">Mon portefeuille</span>
                </div>
                {profile?.is_verified && (
                  <Badge className="bg-emerald-500/20 text-emerald-100 border border-emerald-400/30 text-[9px] gap-0.5">
                    <ShieldCheck className="w-3 h-3" /> Compte vérifié
                  </Badge>
                )}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                <div>
                  <p className="text-[10px] text-primary-foreground/70">Ventes réelles</p>
                  <p className="text-base sm:text-2xl font-bold">{totalSales.toLocaleString("en-US")} F</p>
                </div>
                <div>
                  <p className="text-[10px] text-primary-foreground/70">Commission ({commissionRate}%)</p>
                  <p className="text-base sm:text-2xl font-bold">-{commissionAmount.toLocaleString("en-US")} F</p>
                </div>
                <div>
                  <p className="text-[10px] text-primary-foreground/70">Solde net</p>
                  <p className="text-base sm:text-2xl font-bold text-accent">{netRevenue.toLocaleString("en-US")} F</p>
                </div>
                <Link to="/jetons" className="block group">
                  <div className="rounded-lg bg-primary-foreground/10 hover:bg-primary-foreground/20 p-2 transition-colors h-full">
                    <p className="text-[10px] text-primary-foreground/70 flex items-center gap-1">
                      <Coins className="w-3 h-3" /> Jetons restants
                    </p>
                    <p className="text-base sm:text-2xl font-bold flex items-center gap-1.5">
                      {tokenBalance}
                      <span className="text-[9px] text-primary-foreground/70 font-normal group-hover:underline">→ Acheter</span>
                    </p>
                  </div>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Free plan renewal banner */}
          <FreePlanRenewalBanner userId={user?.id} />

          {/* Quota produits universel — affiché pour TOUS les plans */}
          <div className="mb-4 sm:mb-6">
            <ProductQuotaCard
              productsCount={products.length}
              maxProducts={subscription?.max_products || 5}
              plan={subscription?.plan}
              tokenBalance={tokenBalance}
            />
          </div>

          {/* KYC Status Banner - only show if NOT verified */}
          {!profile?.is_verified && (
            <>
              <SupplierKYCSection userId={user?.id} plan={subscription?.plan} isVerified={profile?.is_verified} />
              <div className="mb-4 sm:mb-6" />
            </>
          )}

          <StatsGrid stats={stats} />

          {/* Charts - responsive */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-6">
            <div className="lg:col-span-2"><SalesAreaChart orders={orders} /></div>
            <CategoryPieInfo orders={orders} />
          </div>

          {/* Seller orders awaiting validation (real-time) */}
          {profile?.id && (
            <div className="mb-4 sm:mb-6">
              <SellerOrdersToValidate sellerProfileId={profile.id} />
            </div>
          )}

          {/* Quick actions row — Independent icon cards */}
          <h3 className="font-heading text-sm font-semibold text-foreground mb-2 flex items-center gap-1.5">
            <LayoutDashboard className="w-4 h-4 text-primary" /> Actions rapides
          </h3>
          <div className="grid grid-cols-3 sm:grid-cols-8 gap-2 sm:gap-3 mb-4 sm:mb-6">
            {[
              { icon: Plus, label: "Publier", color: "bg-primary/10 text-primary", onClick: openPublishFlow },
              { icon: ShieldCheck, label: "Modération", color: "bg-amber-500/10 text-amber-600", href: "/moderation" },
              { icon: QrCode, label: "Traçabilité", color: "bg-blue-500/10 text-blue-500", href: "/tracabilite" },
              { icon: ShoppingCart, label: "Commandes", color: "bg-secondary/10 text-secondary", href: "/mes-commandes", badge: pendingOrders },
              { icon: MessageCircle, label: "Messages", color: "bg-green-500/10 text-green-600", href: "/messages" },
              { icon: Rocket, label: "Mes boosts", color: "bg-primary/10 text-primary", onClick: () => setShowBoostsDialog(true) },
              { icon: Gift, label: "Parrainage", color: "bg-pink-500/10 text-pink-600", onClick: () => setShowAffiliationDialog(true) },
              { icon: Calendar, label: "Formations", color: "bg-amber-500/10 text-amber-600", href: "/formations" },
              { icon: Wallet, label: "Retraits & paiements", color: "bg-orange-500/10 text-orange-600", onClick: () => setShowWithdrawalsDialog(true) },
              { icon: Settings, label: "Paramètres du compte", color: "bg-muted text-muted-foreground", onClick: () => setShowSettingsDialog(true) },
            ].map((action: any, i) => {
              const content = (
                <Card key={i} className="cursor-pointer hover:shadow-elevated transition-all group h-full">
                  <CardContent className="p-3 flex flex-col items-center gap-1.5 text-center">
                    <div className={`relative w-10 h-10 rounded-xl ${action.color} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                      <action.icon className="w-5 h-5" />
                      {action.badge > 0 && (
                        <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold flex items-center justify-center border-2 border-card">
                          {action.badge > 9 ? "9+" : action.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] font-semibold text-foreground leading-tight line-clamp-2">{action.label}</p>
                  </CardContent>
                </Card>
              );
              if (action.href) return <Link key={i} to={action.href}>{content}</Link>;
              return <div key={i} onClick={action.onClick}>{content}</div>;
            })}
          </div>

          {/* KYC Reminder removed: SupplierKYCSection above already handles unverified state */}

          {/* Affiliation & Boosts moved to Quick Actions icons (dialogs) */}

          {/* AI Recommendations - Collapsible */}
          {user && profile && (
            <details className="mb-4 sm:mb-6">
              <summary className="cursor-pointer flex items-center gap-2 p-3 bg-card rounded-xl border border-border hover:bg-muted/50 transition-colors">
                <Sparkles className="w-4 h-4 text-primary" />
                <span className="text-xs sm:text-sm font-semibold text-foreground">Recommandations IA</span>
                <ChevronDown className="w-4 h-4 text-muted-foreground ml-auto" />
              </summary>
              <div className="mt-2">
                <SupplierAIRecommendations userId={user.id} profileId={profile.id} location={profile.location || undefined} onAddProduct={openPublishFlow} />
              </div>
            </details>
           )}

          {/* Besoins d'achat — Section compacte miniature pour les fournisseurs */}
          <Card className="mb-4 sm:mb-6 border-accent/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-accent-foreground" />
                Besoins d'achat récents
                <Badge variant="secondary" className="text-[9px] ml-auto">Marketplace</Badge>
              </CardTitle>
              <CardDescription className="text-[11px]">
                Les acheteurs recherchent ces produits — proposez vos stocks directement.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <DemandsList limit={4} compact />
            </CardContent>
          </Card>

          {/* Delivery Tracking Widget */}
          {profile && (
            <div className="mb-4 sm:mb-6">
              <DeliveryTrackingWidget profileId={profile.id} role="seller" />
            </div>
          )}

          {/* Premium features — gating selon pack actif (analytics, account manager, API) */}
          <div className="mb-4 sm:mb-6">
            <PremiumFeaturesPanel plan={subscription?.plan} tokenBalance={tokenBalance} />
          </div>



          {/* Products list — Quick Actions cover other sections */}
          {(() => {
            const pendingProducts = products.filter(
              (p) => (p.moderation_status || "pending") === "pending"
            );
            const rejectedProducts = products.filter(
              (p) => p.moderation_status === "rejected"
            );
            return (
              <>
                {pendingProducts.length > 0 && (
                  <Card className="mb-3 border-amber-300 bg-amber-50/60 dark:bg-amber-950/20">
                    <CardHeader className="p-3">
                      <CardTitle className="text-sm flex items-center gap-2 text-amber-700 dark:text-amber-400">
                        ⏳ En attente d'analyse ({pendingProducts.length})
                      </CardTitle>
                      <CardDescription className="text-[11px]">
                        Vos produits sont en cours de vérification par l'équipe Nukuconnect. Vous recevrez une notification et un email dès l'approbation. Délai estimé : ~20 minutes.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="p-3 pt-0 space-y-1.5">
                      {pendingProducts.map((p) => (
                        <div key={p.id} className="flex items-center gap-2 text-xs">
                          <Package className="w-3.5 h-3.5 text-amber-600" />
                          <span className="font-medium truncate flex-1">{p.name}</span>
                          <Badge variant="outline" className="text-[9px] border-amber-400 text-amber-700">
                            En analyse
                          </Badge>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}
                {rejectedProducts.length > 0 && (
                  <Card className="mb-3 border-destructive/40 bg-destructive/5">
                    <CardHeader className="p-3">
                      <CardTitle className="text-sm flex items-center gap-2 text-destructive">
                        ❌ Refusés ({rejectedProducts.length})
                      </CardTitle>
                      <CardDescription className="text-[11px]">
                        Modifiez votre publication et soumettez-la à nouveau pour qu'elle soit ré-analysée.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="p-3 pt-0 space-y-1.5">
                      {rejectedProducts.map((p) => (
                        <div key={p.id} className="flex items-start gap-2 text-xs">
                          <Package className="w-3.5 h-3.5 text-destructive mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{p.name}</p>
                            {p.moderation_reason && (
                              <p className="text-[10px] text-muted-foreground line-clamp-2">
                                Motif : {p.moderation_reason}
                              </p>
                            )}
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-6 text-[10px] px-2"
                            onClick={() => { setEditingProduct(p); setShowAddProduct(true); }}
                          >
                            Modifier
                          </Button>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}
              </>
            );
          })()}

          {/* Produits boostés et parrainage — accessibles via icônes Actions rapides (dialogs) */}

          <Card className="mb-4" id="products-section">
            <CardHeader className="p-3 sm:p-4 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Package className="w-4 h-4 text-primary" /> Ma boutique ({products.length})
                </CardTitle>
                <CardDescription className="text-[10px]">Gérez et boostez votre catalogue</CardDescription>
              </div>
              <Button variant="hero" size="sm" className="text-xs h-8 gap-1" onClick={() => setShowAddProduct(true)}>
                <Plus className="w-3.5 h-3.5" /> Publier
              </Button>
            </CardHeader>
            <CardContent className="p-3 sm:p-4 pt-0">
              {products.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
                  {products.map((product) => {
                    const productOrders = orders.filter(o => o.product_id === product.id);
                    const productRevenue = productOrders.reduce((s: number, o: any) => s + (Number(o.total_price) || 0), 0);
                    const productSold = productOrders.reduce((s: number, o: any) => s + (Number(o.quantity) || 0), 0);
                    return (
                      <Card key={product.id} className="group hover:shadow-elevated transition-all overflow-hidden">
                        <div className="relative cursor-pointer" onClick={() => navigate(`/produit/${product.id}`)}>
                          {product.images?.[0] ? (
                            <img src={product.images[0]} alt={product.name} className="w-full h-32 sm:h-40 object-cover" />
                          ) : (
                            <div className="w-full h-32 sm:h-40 bg-muted flex items-center justify-center">
                              <Package className="w-8 h-8 text-muted-foreground/30" />
                            </div>
                          )}
                          <div className="absolute top-2 left-2 flex gap-1">
                            {product.is_organic && (
                              <Badge className="bg-green-500 text-white text-[9px] px-1.5">BIO</Badge>
                            )}
                            {isProductBoosted(activeBoosts, product.id) && (
                              <Badge className="bg-primary text-primary-foreground text-[9px] px-1.5 gap-0.5 animate-pulse">
                                <Rocket className="w-2.5 h-2.5" />Boosté
                              </Badge>
                            )}
                          </div>
                          <div className="absolute top-2 right-2 flex flex-col items-end gap-1">
                            <Badge variant="secondary" className="text-[9px] bg-card/90">
                              {product.quantity_available} {product.unit}
                            </Badge>
                            <ProductStatusBadge
                              status={product.moderation_status || "pending"}
                              reason={product.moderation_reason}
                              scheduledAt={product.moderation_scheduled_at}
                            />
                          </div>
                        </div>
                        <CardContent className="p-2.5 sm:p-3">
                          <h3 className="font-semibold text-[13px] sm:text-sm text-foreground line-clamp-2 leading-tight mb-1 cursor-pointer hover:text-primary transition-colors break-words"
                            onClick={() => navigate(`/produit/${product.id}`)}>{product.name}</h3>
                          <p className="text-[10px] text-muted-foreground mb-1 flex items-center gap-1 truncate">
                            <MapPin className="w-2.5 h-2.5 flex-shrink-0" /><span className="truncate">{product.location || product.category}</span>
                          </p>
                          <div className="flex items-baseline justify-between mb-2 gap-1">
                            <span className="font-heading text-sm sm:text-base font-bold text-primary truncate">
                              {Number(product.price).toLocaleString("en-US")} F
                            </span>
                            <span className="text-[9px] text-muted-foreground whitespace-nowrap">/{product.unit}</span>
                          </div>
                          <div className="grid grid-cols-2 gap-1 mb-2">
                            <div className="bg-muted/50 rounded-md p-1.5 text-center">
                              <p className="text-[9px] text-muted-foreground">Vendus</p>
                              <p className="text-xs font-bold text-foreground">{productSold}</p>
                            </div>
                            <div className="bg-muted/50 rounded-md p-1.5 text-center">
                              <p className="text-[9px] text-muted-foreground">Revenus</p>
                              <p className="text-xs font-bold text-primary truncate">{productRevenue > 0 ? `${(productRevenue / 1000).toFixed(0)}K` : "0"} F</p>
                            </div>
                          </div>
                          {/* Actions: Modifier en pleine largeur + ligne d'icônes équilibrée */}
                          <Button variant="outline" size="sm" className="w-full gap-1 text-[11px] h-8 mb-1.5"
                            onClick={() => { setEditingProduct(product); setShowAddProduct(true); }}>
                            <Edit className="w-3 h-3" />Modifier
                          </Button>
                          <div className="grid grid-cols-3 gap-1">
                            {!isProductBoosted(activeBoosts, product.id) ? (
                              <Button variant="outline" size="sm" className="h-8 px-1 text-primary gap-1 text-[10px]" onClick={() => setBoostProduct(product)} aria-label="Booster">
                                <Rocket className="w-3 h-3" /><span className="hidden sm:inline">Boost</span>
                              </Button>
                            ) : (
                              <Button variant="outline" size="sm" className="h-8 px-1 gap-1 text-[10px]" disabled aria-label="Boosté">
                                <Rocket className="w-3 h-3 text-primary" /><span className="hidden sm:inline">Actif</span>
                              </Button>
                            )}
                            <Button variant="outline" size="sm" className="h-8 px-1 gap-1 text-[10px]" onClick={() => navigate(`/tracabilite`)} aria-label="Traçabilité">
                              <QrCode className="w-3 h-3 text-blue-500" /><span className="hidden sm:inline">QR</span>
                            </Button>
                            <Button variant="outline" size="sm" className="h-8 px-1 text-destructive border-destructive/30 hover:bg-destructive/10 gap-1 text-[10px]"
                              onClick={() => setProductToDelete(product)} aria-label="Supprimer">
                              <Trash2 className="w-3 h-3" /><span className="hidden sm:inline">Suppr.</span>
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-6 sm:py-10 border border-dashed border-border rounded-xl">
                  <Package className="w-10 h-10 mx-auto text-muted-foreground/50 mb-3" />
                  <h3 className="font-heading font-semibold text-sm sm:text-base mb-1.5">Aucun produit</h3>
                  <p className="text-[10px] sm:text-xs text-muted-foreground mb-3">Publiez votre premier produit</p>
                  <Button variant="hero" size="sm" className="gap-1.5 text-xs" onClick={() => setShowAddProduct(true)}>
                    <Plus className="w-3.5 h-3.5" />Publier un produit
                  </Button>
                </div>
              )}

              <div className="mt-3">
                <CSVProductImport
                  profileId={profile?.id}
                  onImportComplete={() => profile && fetchProducts(profile.id)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Paramètres & Retraits accessibles via icônes Actions rapides (dialogs) */}

        </div>
      </main>
      </DashboardLayout>

      {/* Choix Produit / Formation */}
      <PublishChoiceModal
        open={showPublishChoice}
        onOpenChange={setShowPublishChoice}
        onChoose={(type) => {
          setShowPublishChoice(false);
          if (type === "product") setShowAddProduct(true);
          else setShowAddFormation(true);
        }}
      />

      {profile && (
        <AddProductModal open={showAddProduct} onOpenChange={(open) => { setShowAddProduct(open); if (!open) setEditingProduct(null); }}
          profileId={profile.id} onProductAdded={() => {
            fetchProducts(profile.id);
            queryClient.invalidateQueries({ queryKey: ["products"] });
            if (editingProduct?.id) queryClient.invalidateQueries({ queryKey: ["product", editingProduct.id] });
          }}
          editProduct={editingProduct} />
      )}

      <AddFormationModal
        open={showAddFormation}
        onOpenChange={setShowAddFormation}
        instructorName={profile?.business_name || profile?.full_name || "Formateur"}
      />

      <ProductBoostModal
        open={!!boostProduct}
        onOpenChange={(open) => { if (!open) setBoostProduct(null); }}
        product={boostProduct}
        onBoostSuccess={() => { if (profile) fetchProducts(profile.id); }}
      />

      <AlertDialog open={!!productToDelete} onOpenChange={(open) => { if (!open) setProductToDelete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce produit ?</AlertDialogTitle>
            <AlertDialogDescription>
              <span className="font-semibold text-foreground">{productToDelete?.name}</span> sera retiré <strong>immédiatement</strong> de la marketplace et de votre tableau de bord. Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); confirmDeleteProduct(); }}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Suppression…" : "Oui, supprimer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Footer />
      <SupportWidget userId={user?.id} userName={profile?.full_name || undefined} />
      {!profile?.is_verified && (
        <SupplierVerificationPopup userId={user?.id} plan={subscription?.plan} isVerified={profile?.is_verified} />
      )}
      <MobileBottomNav />

      {/* Dialog: Mes boosts */}
      <Dialog open={showBoostsDialog} onOpenChange={setShowBoostsDialog}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Rocket className="w-5 h-5 text-primary" /> Mes produits boostés
            </DialogTitle>
          </DialogHeader>
          {(() => {
            const boostedProducts = products.filter(p => isProductBoosted(activeBoosts, p.id));
            if (boostedProducts.length === 0) {
              return (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  Aucun produit boosté pour le moment. Boostez vos produits depuis la liste pour leur donner plus de visibilité.
                </div>
              );
            }
            return (
              <div className="space-y-3">
                {boostedProducts.map((p) => (
                  <ProductBoostStats key={p.id} productId={p.id} productName={p.name} />
                ))}
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Dialog: Parrainage */}
      <Dialog open={showAffiliationDialog} onOpenChange={setShowAffiliationDialog}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Gift className="w-5 h-5 text-pink-600" /> Mes gains de parrainage
            </DialogTitle>
          </DialogHeader>
          {user && <AffiliationCard userId={user.id} />}
        </DialogContent>
      </Dialog>

      {/* Dialog: Paramètres du compte */}
      <Dialog open={showSettingsDialog} onOpenChange={setShowSettingsDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5 text-primary" /> Paramètres du compte
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <SupplierKYCSection userId={user?.id} plan={subscription?.plan} isVerified={profile?.is_verified} />
            <ProfileSettingsPanel profile={profile} user={user} onProfileUpdate={(updated) => updateProfile(updated)} />
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog: Retraits & paiements */}
      <Dialog open={showWithdrawalsDialog} onOpenChange={setShowWithdrawalsDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wallet className="w-5 h-5 text-primary" /> Retraits & paiements
            </DialogTitle>
          </DialogHeader>
          <WithdrawalPanel />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Dashboard;
