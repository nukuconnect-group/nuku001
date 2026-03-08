import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
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
import SubscriptionCard from "@/components/dashboard/SubscriptionCard";
import DemandsList from "@/components/marketplace/DemandsList";
import {
  Package, ShoppingCart, DollarSign, Plus, Edit,
  Trash2, Eye, Rocket, BarChart3, Users, Loader2, MessageCircle,
  QrCode, TrendingUp, MapPin, Truck, Calendar
} from "lucide-react";

const Dashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);

  const fetchProducts = async (profileId: string) => {
    const { data } = await supabase.from("products").select("*").eq("producer_id", profileId).order("created_at", { ascending: false });
    setProducts(data || []);
  };

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/auth"); return; }
      setUser(session.user);
      const { data: profileData } = await supabase.from("profiles").select("*").eq("user_id", session.user.id).single();
      setProfile(profileData);
      if (profileData) {
        await fetchProducts(profileData.id);
        const { data: ordersData } = await supabase.from("orders").select("*, products(*)").eq("seller_id", profileData.id).order("created_at", { ascending: false });
        setOrders(ordersData || []);
      }
      setIsLoading(false);
    };
    checkAuth();
  }, [navigate]);

  const totalSales = orders.reduce((sum, o) => sum + (Number(o.total_price) || 0), 0);
  const completedOrders = orders.filter(o => o.status === "completed").length;
  const pendingOrders = orders.filter(o => o.status === "pending").length;
  
  const stats = [
    { label: "Produits", value: products.length, icon: Package, color: "bg-primary/20 text-primary", trend: { value: 12, isPositive: true } },
    { label: "Commandes", value: orders.length, icon: ShoppingCart, color: "bg-accent/20 text-accent-foreground", trend: { value: 8, isPositive: true } },
    { label: "Ventes", value: totalSales.toLocaleString() + " F", icon: DollarSign, color: "bg-green-500/20 text-green-600", trend: { value: 23, isPositive: true } },
    { label: "Vues", value: "2.4K", icon: Eye, color: "bg-blue-500/20 text-blue-600", trend: { value: 15, isPositive: true } },
  ];

  const handleDeleteProduct = async (productId: string) => {
    const { error } = await supabase.from("products").delete().eq("id", productId);
    if (error) toast({ title: "Erreur", description: error.message, variant: "destructive" });
    else { toast({ title: "Produit supprimé" }); fetchProducts(profile.id); }
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
      <main className="py-3 sm:py-6">
        <div className="container mx-auto px-3 sm:px-4">
          {/* Welcome */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4 mb-4 sm:mb-6">
            <div>
              <h1 className="font-heading text-base sm:text-xl lg:text-2xl font-bold text-foreground">
                Bonjour, {profile?.full_name || "Producteur"} 👋
              </h1>
              <p className="text-[10px] sm:text-xs text-muted-foreground">Gérez vos produits et suivez vos ventes</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="gap-1 text-[10px] sm:text-xs h-8" onClick={() => setShowAddProduct(true)}>
                <Plus className="w-3.5 h-3.5" />Ajouter produit
              </Button>
              <Link to="/plans">
                <Button variant="hero" size="sm" className="gap-1 text-[10px] sm:text-xs h-8">
                  <Rocket className="w-3.5 h-3.5" />Booster
                </Button>
              </Link>
            </div>
          </div>

          <StatsGrid stats={stats} />

          {/* Charts - responsive */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-6">
            <div className="lg:col-span-2"><SalesAreaChart /></div>
            <CategoryPieInfo />
          </div>

          {/* Quick actions row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mb-4 sm:mb-6">
            <Card className="cursor-pointer hover:shadow-elevated transition-all" onClick={() => setShowAddProduct(true)}>
              <CardContent className="p-3 sm:p-4 flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Plus className="w-4 h-4 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-foreground">Publier</p>
                  <p className="text-[10px] text-muted-foreground">Nouveau produit</p>
                </div>
              </CardContent>
            </Card>
            <Link to="/tracabilite">
              <Card className="cursor-pointer hover:shadow-elevated transition-all h-full">
                <CardContent className="p-3 sm:p-4 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                    <QrCode className="w-4 h-4 text-blue-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-foreground">Traçabilité</p>
                    <p className="text-[10px] text-muted-foreground">Tracer produits</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
            <Link to="/suivi-livraison">
              <Card className="cursor-pointer hover:shadow-elevated transition-all h-full">
                <CardContent className="p-3 sm:p-4 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
                    <ShoppingCart className="w-4 h-4 text-accent-foreground" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-foreground">Commandes</p>
                    <p className="text-[10px] text-muted-foreground">Suivre commandes</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
            <Link to="/messages">
              <Card className="cursor-pointer hover:shadow-elevated transition-all h-full">
                <CardContent className="p-3 sm:p-4 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-green-500/10 flex items-center justify-center flex-shrink-0">
                    <MessageCircle className="w-4 h-4 text-green-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-foreground">Messages</p>
                    <p className="text-[10px] text-muted-foreground">Messagerie</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          </div>

          {/* Buy/Sell Intent */}
          <Card className="mb-4 sm:mb-6 bg-gradient-to-r from-primary/5 to-accent/5 border-primary/10">
            <CardContent className="p-3 sm:p-4">
              <h3 className="font-heading text-xs sm:text-sm font-semibold text-foreground mb-2 flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5 text-primary" />
                Que souhaitez-vous vendre ?
              </h3>
              <p className="text-[10px] text-muted-foreground mb-2">Décrivez vos produits pour attirer des acheteurs potentiels</p>
              <Button variant="outline" size="sm" className="text-[10px] h-7 gap-1" onClick={() => setShowAddProduct(true)}>
                <Plus className="w-3 h-3" />Publier un produit à vendre
              </Button>
            </CardContent>
          </Card>

          {/* Buyer Demands */}
          <Card className="mb-4 sm:mb-6">
            <CardContent className="p-3 sm:p-4">
              <h3 className="font-heading text-xs sm:text-sm font-semibold text-foreground mb-2 flex items-center gap-1.5">
                <ShoppingCart className="w-3.5 h-3.5 text-accent-foreground" />
                Demandes d'achat des acheteurs
              </h3>
              <p className="text-[10px] text-muted-foreground mb-2">Découvrez ce que les acheteurs recherchent</p>
              <DemandsList limit={5} />
            </CardContent>
          </Card>

          {/* Tabs */}
          <Tabs defaultValue="products" className="space-y-3 sm:space-y-4">
            <TabsList className="bg-muted p-0.5 sm:p-1 w-full overflow-x-auto flex">
              <TabsTrigger value="products" className="gap-1 data-[state=active]:bg-background text-[10px] sm:text-xs flex-1">
                <Package className="w-3 h-3 sm:w-3.5 sm:h-3.5" />Produits ({products.length})
              </TabsTrigger>
              <TabsTrigger value="orders" className="gap-1 data-[state=active]:bg-background text-[10px] sm:text-xs flex-1">
                <ShoppingCart className="w-3 h-3 sm:w-3.5 sm:h-3.5" />Commandes ({orders.length})
              </TabsTrigger>
              <TabsTrigger value="analytics" className="gap-1 data-[state=active]:bg-background text-[10px] sm:text-xs flex-1">
                <BarChart3 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />Stats
              </TabsTrigger>
              <TabsTrigger value="traceability" className="gap-1 data-[state=active]:bg-background text-[10px] sm:text-xs flex-1">
                <QrCode className="w-3 h-3 sm:w-3.5 sm:h-3.5" />Traçabilité
              </TabsTrigger>
            </TabsList>

            <TabsContent value="products" className="space-y-3">
              {products.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
                  {products.map((product) => (
                    <Card key={product.id} className="group hover:shadow-elevated transition-all overflow-hidden">
                      <div className="relative">
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
                        </div>
                        <div className="absolute top-2 right-2 flex gap-1">
                          <Badge variant="secondary" className="text-[9px] bg-card/90">
                            {product.quantity_available} {product.unit}
                          </Badge>
                        </div>
                      </div>
                      <CardContent className="p-2.5 sm:p-3">
                        <h3 className="font-semibold text-xs sm:text-sm text-foreground line-clamp-1 mb-0.5">{product.name}</h3>
                        <p className="text-[10px] text-muted-foreground mb-1.5 flex items-center gap-1">
                          <MapPin className="w-2.5 h-2.5" />{product.location || product.category}
                        </p>
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-heading text-sm sm:text-base font-bold text-primary">
                            {Number(product.price).toLocaleString()} FCFA
                          </span>
                          <span className="text-[9px] text-muted-foreground">/{product.unit}</span>
                        </div>
                        <div className="flex gap-1">
                          <Button variant="outline" size="sm" className="flex-1 gap-1 text-[10px] h-7"
                            onClick={() => { setEditingProduct(product); setShowAddProduct(true); }}>
                            <Edit className="w-2.5 h-2.5" />Modifier
                          </Button>
                          <Button variant="ghost" size="sm" className="text-destructive h-7 px-2"
                            onClick={() => handleDeleteProduct(product.id)}>
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card className="border-dashed">
                  <CardContent className="text-center py-6 sm:py-10">
                    <Package className="w-10 h-10 mx-auto text-muted-foreground/50 mb-3" />
                    <h3 className="font-heading font-semibold text-sm sm:text-base mb-1.5">Aucun produit</h3>
                    <p className="text-[10px] sm:text-xs text-muted-foreground mb-3">Publiez votre premier produit</p>
                    <Button variant="hero" size="sm" className="gap-1.5 text-xs" onClick={() => setShowAddProduct(true)}>
                      <Plus className="w-3.5 h-3.5" />Publier un produit
                    </Button>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="orders">
              <Card>
                <CardHeader className="p-3 sm:p-4">
                  <CardTitle className="text-xs sm:text-sm">Commandes récentes</CardTitle>
                  <CardDescription className="text-[10px] sm:text-xs">
                    {completedOrders} terminées • {pendingOrders} en attente
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-3 sm:p-4 pt-0">
                  {orders.length === 0 ? (
                    <div className="text-center py-6">
                      <ShoppingCart className="w-8 h-8 mx-auto text-muted-foreground/50 mb-2" />
                      <p className="text-xs text-muted-foreground">Aucune commande</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {orders.map((order) => (
                        <div key={order.id} className="flex items-center justify-between p-2.5 bg-muted/50 rounded-xl gap-2">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                              <Package className="w-4 h-4 text-primary" />
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-[10px] sm:text-xs truncate">{order.products?.name}</p>
                              <p className="text-[9px] sm:text-[10px] text-muted-foreground">{order.quantity} × {Number(order.products?.price).toLocaleString()} F</p>
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <Badge variant={order.status === "completed" ? "default" : "secondary"} className="text-[9px]">
                              {order.status === "pending" ? "En attente" : order.status === "completed" ? "Terminée" : order.status}
                            </Badge>
                            <p className="text-[10px] font-medium text-primary mt-0.5">{Number(order.total_price).toLocaleString()} F</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="analytics">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <OrdersBarChart />
                <Card>
                  <CardHeader className="p-3 sm:p-4">
                    <CardTitle className="flex items-center gap-2 text-xs sm:text-sm">
                      <Users className="w-4 h-4 text-primary" />Visiteurs
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 sm:p-4 pt-0 space-y-2">
                    {[
                      { label: "Aujourd'hui", value: "127", trend: "+12%" },
                      { label: "Cette semaine", value: "892", trend: "+8%" },
                      { label: "Ce mois", value: "2,456", trend: "+23%" },
                    ].map(item => (
                      <div key={item.label} className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
                        <span className="text-[10px] sm:text-xs text-muted-foreground">{item.label}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs sm:text-sm font-semibold">{item.value}</span>
                          <Badge variant="secondary" className="text-[9px] text-primary">{item.trend}</Badge>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="p-3 sm:p-4">
                    <CardTitle className="flex items-center gap-2 text-xs sm:text-sm">
                      <TrendingUp className="w-4 h-4 text-primary" />Performance
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 sm:p-4 pt-0 space-y-2">
                    {[
                      { label: "Taux de conversion", value: "4.2%" },
                      { label: "Panier moyen", value: "35,000 F" },
                      { label: "Taux de retour", value: "2.1%" },
                      { label: "Satisfaction client", value: "4.8/5" },
                    ].map(item => (
                      <div key={item.label} className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
                        <span className="text-[10px] sm:text-xs text-muted-foreground">{item.label}</span>
                        <span className="text-xs font-semibold">{item.value}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="p-3 sm:p-4">
                    <CardTitle className="flex items-center gap-2 text-xs sm:text-sm">
                      <MapPin className="w-4 h-4 text-primary" />Top Régions
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 sm:p-4 pt-0 space-y-2">
                    {[
                      { label: "Lomé", value: "45%", color: "bg-primary" },
                      { label: "Kara", value: "22%", color: "bg-blue-500" },
                      { label: "Sokodé", value: "15%", color: "bg-accent" },
                      { label: "Kpalimé", value: "18%", color: "bg-green-500" },
                    ].map(item => (
                      <div key={item.label} className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] sm:text-xs text-muted-foreground">{item.label}</span>
                          <span className="text-[10px] font-semibold">{item.value}</span>
                        </div>
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                          <div className={`h-full ${item.color} rounded-full`} style={{ width: item.value }} />
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="traceability">
              <Card>
                <CardHeader className="p-3 sm:p-4">
                  <CardTitle className="flex items-center gap-2 text-xs sm:text-sm">
                    <QrCode className="w-4 h-4 text-primary" />Traçabilité de vos produits
                  </CardTitle>
                  <CardDescription className="text-[10px] sm:text-xs">
                    Ajoutez des informations de traçabilité pour rassurer vos clients
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-3 sm:p-4 pt-0">
                  {products.length > 0 ? (
                    <div className="space-y-2">
                      {products.map((product) => (
                        <div key={product.id} className="flex items-center justify-between p-2.5 bg-muted/50 rounded-xl gap-2">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            {product.images?.[0] && (
                              <img src={product.images[0]} alt="" className="w-8 h-8 rounded-lg object-cover flex-shrink-0" />
                            )}
                            <div className="min-w-0">
                              <p className="font-medium text-xs truncate">{product.name}</p>
                              <p className="text-[9px] text-muted-foreground flex items-center gap-1">
                                <Calendar className="w-2.5 h-2.5" />
                                {new Date(product.created_at).toLocaleDateString("fr-FR")}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Badge variant="secondary" className="text-[9px]">
                              {product.is_organic ? "Bio" : "Standard"}
                            </Badge>
                            <Link to="/tracabilite">
                              <Button variant="outline" size="sm" className="h-7 text-[10px] gap-1">
                                <QrCode className="w-3 h-3" />Tracer
                              </Button>
                            </Link>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6">
                      <QrCode className="w-8 h-8 mx-auto text-muted-foreground/50 mb-2" />
                      <p className="text-xs text-muted-foreground">Publiez d'abord un produit</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>

      {profile && (
        <AddProductModal open={showAddProduct} onOpenChange={(open) => { setShowAddProduct(open); if (!open) setEditingProduct(null); }}
          profileId={profile.id} onProductAdded={() => fetchProducts(profile.id)}
          editProduct={editingProduct} />
      )}
      <Footer />
      <MobileBottomNav />
    </div>
  );
};

export default Dashboard;
