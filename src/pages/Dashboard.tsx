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
    const { data } = await supabase
      .from("products")
      .select("*")
      .eq("producer_id", profileId)
      .order("created_at", { ascending: false });
    setProducts(data || []);
  };

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }
      setUser(session.user);
      
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", session.user.id)
        .single();
      
      setProfile(profileData);
      
      if (profileData) {
        await fetchProducts(profileData.id);
        
        const { data: ordersData } = await supabase
          .from("orders")
          .select("*, products(*)")
          .eq("seller_id", profileData.id)
          .order("created_at", { ascending: false });
        
        setOrders(ordersData || []);
      }
      
      setIsLoading(false);
    };

    checkAuth();
  }, [navigate]);

  const totalSales = orders.reduce((sum, o) => sum + (Number(o.total_price) || 0), 0);
  
  const stats = [
    { 
      label: "Produits", 
      value: products.length, 
      icon: Package, 
      color: "bg-primary/20 text-primary",
      trend: { value: 12, isPositive: true }
    },
    { 
      label: "Commandes", 
      value: orders.length, 
      icon: ShoppingCart, 
      color: "bg-accent/20 text-accent-foreground",
      trend: { value: 8, isPositive: true }
    },
    { 
      label: "Ventes (FCFA)", 
      value: totalSales.toLocaleString(), 
      icon: DollarSign, 
      color: "bg-green-500/20 text-green-600",
      trend: { value: 23, isPositive: true }
    },
    { 
      label: "Vues", 
      value: "2.4K", 
      icon: Eye, 
      color: "bg-blue-500/20 text-blue-600",
      trend: { value: 15, isPositive: true }
    },
  ];

  const handleDeleteProduct = async (productId: string) => {
    const { error } = await supabase.from("products").delete().eq("id", productId);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Produit supprimé" });
      fetchProducts(profile.id);
    }
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

      <main className="pt-24 pb-12">
        <div className="container mx-auto px-4">
          {/* Welcome */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
            <div>
              <h1 className="font-heading text-2xl lg:text-3xl font-bold text-foreground">
                Bonjour, {profile?.full_name || "Producteur"} 👋
              </h1>
              <p className="text-muted-foreground">Tableau de bord producteur • Gérez vos produits et suivez vos ventes</p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="gap-2" onClick={() => setShowAddProduct(true)}>
                <Plus className="w-4 h-4" />
                Ajouter produit
              </Button>
              <Link to="/plans">
                <Button variant="hero" className="gap-2">
                  <Rocket className="w-4 h-4" />
                  Booster mes ventes
                </Button>
              </Link>
            </div>
          </div>

          {/* Stats */}
          <StatsGrid stats={stats} />

          {/* Charts Row */}
          <div className="grid lg:grid-cols-3 gap-6 mb-8">
            <div className="lg:col-span-2">
              <SalesAreaChart />
            </div>
            <CategoryPieInfo />
          </div>

          {/* Tabs */}
          <Tabs defaultValue="products" className="space-y-6">
            <TabsList className="bg-muted p-1">
              <TabsTrigger value="products" className="gap-2 data-[state=active]:bg-background">
                <Package className="w-4 h-4" />
                Mes produits ({products.length})
              </TabsTrigger>
              <TabsTrigger value="orders" className="gap-2 data-[state=active]:bg-background">
                <ShoppingCart className="w-4 h-4" />
                Commandes ({orders.length})
              </TabsTrigger>
              <TabsTrigger value="analytics" className="gap-2 data-[state=active]:bg-background">
                <BarChart3 className="w-4 h-4" />
                Statistiques
              </TabsTrigger>
              <TabsTrigger value="messages" className="gap-2 data-[state=active]:bg-background">
                <MessageCircle className="w-4 h-4" />
                Messages
              </TabsTrigger>
            </TabsList>

            {/* Products Tab */}
            <TabsContent value="products" className="space-y-6">
              {products.length > 0 ? (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {products.map((product) => (
                    <Card key={product.id} className="group hover:shadow-elevated transition-all">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <h3 className="font-semibold text-foreground line-clamp-1">{product.name}</h3>
                            <p className="text-sm text-muted-foreground">{product.category}</p>
                          </div>
                          <div className="flex gap-1">
                            {product.is_organic && (
                              <Badge variant="secondary" className="bg-green-100 text-green-700 text-xs">Bio</Badge>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between mb-4">
                          <span className="font-heading text-xl font-bold text-primary">
                            {Number(product.price).toLocaleString()} FCFA
                          </span>
                          <span className="text-sm text-muted-foreground">
                            {product.quantity_available} {product.unit}
                          </span>
                        </div>
                        
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" className="flex-1 gap-1">
                            <Edit className="w-3 h-3" />
                            Modifier
                          </Button>
                          <Button variant="outline" size="sm" className="gap-1 text-accent-foreground">
                            <Rocket className="w-3 h-3" />
                            Booster
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-destructive hover:text-destructive"
                            onClick={() => handleDeleteProduct(product.id)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card className="border-dashed">
                  <CardContent className="text-center py-12">
                    <Package className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                    <h3 className="font-heading font-semibold text-lg mb-2">Aucun produit publié</h3>
                    <p className="text-muted-foreground mb-6">
                      Commencez à vendre en publiant votre premier produit
                    </p>
                    <Button variant="hero" className="gap-2" onClick={() => setShowAddProduct(true)}>
                      <Plus className="w-4 h-4" />
                      Publier mon premier produit
                    </Button>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Orders Tab */}
            <TabsContent value="orders">
              <Card>
                <CardHeader>
                  <CardTitle>Commandes récentes</CardTitle>
                  <CardDescription>Gérez les commandes reçues de vos clients</CardDescription>
                </CardHeader>
                <CardContent>
                  {orders.length === 0 ? (
                    <div className="text-center py-12">
                      <ShoppingCart className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                      <p className="text-muted-foreground">Aucune commande pour le moment</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {orders.map((order) => (
                        <div key={order.id} className="flex items-center justify-between p-4 bg-muted/50 rounded-xl">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                              <Package className="w-6 h-6 text-primary" />
                            </div>
                            <div>
                              <p className="font-medium">{order.products?.name}</p>
                              <p className="text-sm text-muted-foreground">
                                {order.quantity} × {Number(order.products?.price).toLocaleString()} FCFA
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <Badge variant={order.status === "completed" ? "default" : "secondary"}>
                              {order.status === "pending" ? "En attente" : order.status === "completed" ? "Terminée" : order.status}
                            </Badge>
                            <p className="text-sm font-medium text-primary mt-1">
                              {Number(order.total_price).toLocaleString()} FCFA
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Analytics Tab */}
            <TabsContent value="analytics">
              <div className="grid md:grid-cols-2 gap-6">
                <OrdersBarChart />
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="w-5 h-5 text-primary" />
                      Visiteurs du profil
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Aujourd'hui</span>
                        <span className="font-semibold">127 visiteurs</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Cette semaine</span>
                        <span className="font-semibold">892 visiteurs</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Ce mois</span>
                        <span className="font-semibold">2,456 visiteurs</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Messages Tab */}
            <TabsContent value="messages">
              <Card>
                <CardHeader>
                  <CardTitle>Messages des clients</CardTitle>
                  <CardDescription>Répondez aux demandes de vos clients potentiels</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-12">
                    <MessageCircle className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                    <p className="text-muted-foreground mb-4">Aucun message pour le moment</p>
                    <Link to="/messages">
                      <Button variant="outline">Voir la messagerie</Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>

      {/* Add Product Modal */}
      {profile && (
        <AddProductModal
          open={showAddProduct}
          onOpenChange={setShowAddProduct}
          profileId={profile.id}
          onProductAdded={() => fetchProducts(profile.id)}
        />
      )}

      <Footer />
      <MobileBottomNav />
    </div>
  );
};

export default Dashboard;
