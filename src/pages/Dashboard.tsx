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
import {
  Package, TrendingUp, ShoppingCart, DollarSign, Plus, Edit,
  Trash2, Eye, Rocket, BarChart3, Users, Star, Loader2, Settings, MessageCircle
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
      <main className="py-4 sm:py-8">
        <div className="container mx-auto px-3 sm:px-4">
          {/* Welcome */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-4 sm:mb-8">
            <div>
              <h1 className="font-heading text-lg sm:text-2xl lg:text-3xl font-bold text-foreground">
                Bonjour, {profile?.full_name || "Producteur"} 👋
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground">Gérez vos produits et suivez vos ventes</p>
            </div>
            <div className="flex gap-2 sm:gap-3">
              <Button variant="outline" size="sm" className="gap-1.5 text-xs sm:text-sm" onClick={() => setShowAddProduct(true)}>
                <Plus className="w-3.5 h-3.5" />
                <span className="hidden xs:inline">Ajouter</span> produit
              </Button>
              <Link to="/plans">
                <Button variant="hero" size="sm" className="gap-1.5 text-xs sm:text-sm">
                  <Rocket className="w-3.5 h-3.5" />Booster
                </Button>
              </Link>
            </div>
          </div>

          <StatsGrid stats={stats} />

          {/* Charts */}
          <div className="grid lg:grid-cols-3 gap-4 sm:gap-6 mb-4 sm:mb-8">
            <div className="lg:col-span-2"><SalesAreaChart /></div>
            <CategoryPieInfo />
          </div>

          {/* Tabs */}
          <Tabs defaultValue="products" className="space-y-4 sm:space-y-6">
            <TabsList className="bg-muted p-1 w-full overflow-x-auto flex">
              <TabsTrigger value="products" className="gap-1.5 data-[state=active]:bg-background text-xs sm:text-sm flex-1 sm:flex-none">
                <Package className="w-3.5 h-3.5" />
                <span className="hidden xs:inline">Produits</span> ({products.length})
              </TabsTrigger>
              <TabsTrigger value="orders" className="gap-1.5 data-[state=active]:bg-background text-xs sm:text-sm flex-1 sm:flex-none">
                <ShoppingCart className="w-3.5 h-3.5" />
                <span className="hidden xs:inline">Commandes</span> ({orders.length})
              </TabsTrigger>
              <TabsTrigger value="analytics" className="gap-1.5 data-[state=active]:bg-background text-xs sm:text-sm flex-1 sm:flex-none">
                <BarChart3 className="w-3.5 h-3.5" />Stats
              </TabsTrigger>
              <TabsTrigger value="messages" className="gap-1.5 data-[state=active]:bg-background text-xs sm:text-sm flex-1 sm:flex-none">
                <MessageCircle className="w-3.5 h-3.5" />Msg
              </TabsTrigger>
            </TabsList>

            <TabsContent value="products" className="space-y-4">
              {products.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                  {products.map((product) => (
                    <Card key={product.id} className="group hover:shadow-elevated transition-all">
                      <CardContent className="p-3 sm:p-4">
                        {product.images?.[0] && (
                          <img src={product.images[0]} alt={product.name} className="w-full h-28 sm:h-36 object-cover rounded-lg mb-3" />
                        )}
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-sm text-foreground line-clamp-1">{product.name}</h3>
                            <p className="text-xs text-muted-foreground">{product.category}</p>
                          </div>
                          {product.is_organic && (
                            <Badge variant="secondary" className="bg-green-100 text-green-700 text-[10px] ml-1">Bio</Badge>
                          )}
                        </div>
                        <div className="flex items-center justify-between mb-3">
                          <span className="font-heading text-base sm:text-lg font-bold text-primary">
                            {Number(product.price).toLocaleString()} F
                          </span>
                          <span className="text-xs text-muted-foreground">{product.quantity_available} {product.unit}</span>
                        </div>
                        <div className="flex gap-1.5">
                          <Button variant="outline" size="sm" className="flex-1 gap-1 text-xs h-8">
                            <Edit className="w-3 h-3" />Modifier
                          </Button>
                          <Button variant="outline" size="sm" className="gap-1 text-xs h-8">
                            <Rocket className="w-3 h-3" />
                          </Button>
                          <Button variant="ghost" size="sm" className="text-destructive h-8"
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
                  <CardContent className="text-center py-8 sm:py-12">
                    <Package className="w-10 h-10 sm:w-12 sm:h-12 mx-auto text-muted-foreground/50 mb-3" />
                    <h3 className="font-heading font-semibold text-base sm:text-lg mb-2">Aucun produit</h3>
                    <p className="text-xs sm:text-sm text-muted-foreground mb-4">Publiez votre premier produit</p>
                    <Button variant="hero" size="sm" className="gap-2 text-xs sm:text-sm" onClick={() => setShowAddProduct(true)}>
                      <Plus className="w-4 h-4" />Publier un produit
                    </Button>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="orders">
              <Card>
                <CardHeader className="p-3 sm:p-6">
                  <CardTitle className="text-sm sm:text-base">Commandes récentes</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">Gérez les commandes reçues</CardDescription>
                </CardHeader>
                <CardContent className="p-3 sm:p-6 pt-0">
                  {orders.length === 0 ? (
                    <div className="text-center py-8">
                      <ShoppingCart className="w-10 h-10 mx-auto text-muted-foreground/50 mb-3" />
                      <p className="text-xs sm:text-sm text-muted-foreground">Aucune commande</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {orders.map((order) => (
                        <div key={order.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-xl gap-3">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                              <Package className="w-5 h-5 text-primary" />
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-xs sm:text-sm truncate">{order.products?.name}</p>
                              <p className="text-[10px] sm:text-xs text-muted-foreground">{order.quantity} × {Number(order.products?.price).toLocaleString()} F</p>
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <Badge variant={order.status === "completed" ? "default" : "secondary"} className="text-[10px]">
                              {order.status === "pending" ? "En attente" : order.status === "completed" ? "Terminée" : order.status}
                            </Badge>
                            <p className="text-xs font-medium text-primary mt-1">{Number(order.total_price).toLocaleString()} F</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="analytics">
              <div className="grid sm:grid-cols-2 gap-4 sm:gap-6">
                <OrdersBarChart />
                <Card>
                  <CardHeader className="p-3 sm:p-6">
                    <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
                      <Users className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />Visiteurs
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 sm:p-6 pt-0 space-y-3">
                    {[
                      { label: "Aujourd'hui", value: "127" },
                      { label: "Cette semaine", value: "892" },
                      { label: "Ce mois", value: "2,456" },
                    ].map(item => (
                      <div key={item.label} className="flex items-center justify-between">
                        <span className="text-xs sm:text-sm text-muted-foreground">{item.label}</span>
                        <span className="text-xs sm:text-sm font-semibold">{item.value}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="messages">
              <Card>
                <CardContent className="text-center py-8 sm:py-12">
                  <MessageCircle className="w-10 h-10 mx-auto text-muted-foreground/50 mb-3" />
                  <p className="text-xs sm:text-sm text-muted-foreground mb-3">Aucun message</p>
                  <Link to="/messages"><Button variant="outline" size="sm" className="text-xs">Messagerie</Button></Link>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>

      {profile && (
        <AddProductModal open={showAddProduct} onOpenChange={setShowAddProduct}
          profileId={profile.id} onProductAdded={() => fetchProducts(profile.id)} />
      )}
      <Footer />
      <MobileBottomNav />
    </div>
  );
};

export default Dashboard;
