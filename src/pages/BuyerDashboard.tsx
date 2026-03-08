import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/contexts/ProfileContext";
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
  Eye, Truck, Settings, LogOut, Crown, FileDown, Receipt, Camera, Save
} from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import CreateDemandModal from "@/components/marketplace/CreateDemandModal";
import DemandsList from "@/components/marketplace/DemandsList";
import SubscriptionCard from "@/components/dashboard/SubscriptionCard";
import ProfileSettingsPanel from "@/components/dashboard/ProfileSettingsPanel";
import { generateInvoicePDF } from "@/utils/generateInvoicePDF";

const purchaseData = [
  { name: 'Jan', achats: 150000 },
  { name: 'Fév', achats: 220000 },
  { name: 'Mar', achats: 180000 },
  { name: 'Avr', achats: 340000 },
  { name: 'Mai', achats: 290000 },
  { name: 'Jun', achats: 450000 },
];

const BuyerDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { formatPrice } = useLanguage();
  const { user, profile, isLoading: profileLoading, updateProfile } = useProfile();
  const [orders, setOrders] = useState<any[]>([]);
  const [conversations, setConversations] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("orders");
  const { wishlist: wishlistItems } = useWishlist();
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
    if (profileLoading) return;
    if (!user) { navigate("/auth", { replace: true }); return; }
    if (!profile) { setIsLoading(false); return; }

    let isMounted = true;
    const loadData = async () => {
      const [ordersRes, convsRes, notifsRes] = await Promise.all([
        supabase.from("orders").select("*, products(*)").eq("buyer_id", profile.id).order("created_at", { ascending: false }),
        supabase.from("conversations").select("*, profiles!conversations_seller_id_fkey(full_name, avatar_url)").eq("buyer_id", profile.id).order("updated_at", { ascending: false }).limit(10),
        supabase.from("notifications").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(20),
      ]);
      if (!isMounted) return;
      setOrders(ordersRes.data || []);
      setConversations(convsRes.data || []);
      setNotifications(notifsRes.data || []);
      setIsLoading(false);
    };
    loadData();
    return () => { isMounted = false; };
  }, [profileLoading, user, profile, navigate]);
  

  const totalSpent = orders.reduce((sum, o) => sum + (Number(o.total_price) || 0), 0);
  const pendingOrders = orders.filter(o => o.status === "pending").length;
  const unreadNotifs = notifications.filter(n => !n.is_read).length;

  const stats = [
    { label: "Commandes", value: orders.length, icon: ShoppingBag, color: "bg-primary/20 text-primary", trend: { value: 5, isPositive: true } },
    { label: "Dépensé", value: formatPrice(totalSpent), icon: TrendingUp, color: "bg-green-500/20 text-green-600" },
    { label: "Favoris", value: wishlistItems?.length || 0, icon: Heart, color: "bg-destructive/20 text-destructive" },
    { label: "Messages", value: conversations.length, icon: MessageCircle, color: "bg-accent/20 text-accent-foreground" },
  ];

  const handleBecomeProducer = async () => {
    if (!profile) return;
    if (!migrationData.businessName.trim() || !migrationData.phone.trim() || !migrationData.location.trim() || !migrationData.businessType) {
      toast({ title: "Veuillez remplir tous les champs obligatoires", variant: "destructive" });
      return;
    }
    setMigrating(true);
    const { error } = await supabase.from("profiles").update({
      user_type: "producer",
      full_name: migrationData.businessName.trim(),
      phone: migrationData.phone.trim(),
      location: migrationData.location.trim(),
      bio: migrationData.bio.trim() || null,
    }).eq("id", profile.id);
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

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 lg:pb-0">
      <Header />

      <main className="pt-4 sm:pt-8 pb-8 sm:pb-12">
        <div className="container mx-auto px-3 sm:px-4">
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
                  Bonjour, {profile?.full_name?.split(' ')[0] || "Acheteur"} 👋
                </h1>
                <p className="text-[10px] sm:text-xs text-muted-foreground truncate">
                  Tableau de bord acheteur
                </p>
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

          {/* Stats Grid - responsive */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4 mb-5 sm:mb-8">
            {stats.map((stat) => (
              <Card key={stat.label} className="overflow-hidden">
                <CardContent className="p-3 sm:p-5">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className={`w-9 h-9 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${stat.color}`}>
                      <stat.icon className="w-4 h-4 sm:w-5 sm:h-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] sm:text-xs text-muted-foreground truncate">{stat.label}</p>
                      <p className="font-heading text-sm sm:text-xl font-bold text-foreground truncate">
                        {stat.value}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Become Producer Banner - responsive */}
          <Card className="mb-5 sm:mb-8 bg-gradient-to-r from-primary/10 to-accent/10 border-primary/20">
            <CardContent className="p-3 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <Store className="w-5 h-5 sm:w-7 sm:h-7 text-primary" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-heading text-sm sm:text-lg font-semibold text-foreground">Devenez vendeur</h3>
                  <p className="text-[11px] sm:text-sm text-muted-foreground">Vendez vos produits sur NUKUCONNECT</p>
                </div>
              </div>
              <Button onClick={handleBecomeProducer} className="gap-1.5 text-xs sm:text-sm h-9 sm:h-10 w-full sm:w-auto">
                <Store className="w-3.5 h-3.5" />
                Devenir vendeur
                <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </CardContent>
          </Card>

          {/* Buy Intent - responsive */}
          <Card className="mb-5 sm:mb-8 bg-gradient-to-r from-accent/5 to-primary/5 border-accent/10">
            <CardContent className="p-3 sm:p-6">
              <h3 className="font-heading text-sm sm:text-lg font-semibold text-foreground mb-1.5 sm:mb-2 flex items-center gap-2">
                <HandCoins className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                Que recherchez-vous ?
              </h3>
              <p className="text-[11px] sm:text-sm text-muted-foreground mb-3">
                Exprimez vos besoins pour que les fournisseurs vous contactent
              </p>
              <CreateDemandModal trigger={
                <Button variant="hero" className="gap-1.5 text-xs sm:text-sm h-9 sm:h-10">
                  <HandCoins className="w-3.5 h-3.5 sm:w-4 sm:h-4" />Exprimer un besoin
                </Button>
              } />
              <div className="mt-3 sm:mt-4">
                <h4 className="text-xs sm:text-sm font-medium text-foreground mb-2">Mes demandes récentes</h4>
                <DemandsList limit={3} />
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

          {/* Subscription Management */}
          <div className="mb-5 sm:mb-8">
            <SubscriptionCard />
          </div>

          {/* Tabs - responsive with horizontal scroll on mobile */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 sm:space-y-6">
            <TabsList className="bg-muted p-1 w-full overflow-x-auto flex justify-start sm:justify-center scrollbar-hide">
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
                  ) : (
                    <div className="space-y-2.5 sm:space-y-4">
                      {orders.map((order) => (
                        <Link key={order.id} to="/suivi-livraison" className="block">
                          <div className="flex items-center justify-between p-2.5 sm:p-4 bg-muted/50 rounded-xl hover:bg-muted transition-colors">
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
                  )}
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

      <Footer />
      <MobileBottomNav />
    </div>
  );
};


export default BuyerDashboard;
