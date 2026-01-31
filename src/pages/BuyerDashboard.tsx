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
import {
  ShoppingBag, Heart, MessageCircle, Package, TrendingUp, Store,
  Star, MapPin, Clock, ChevronRight, Loader2, User
} from "lucide-react";

const BuyerDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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
        const { data: ordersData } = await supabase
          .from("orders")
          .select("*, products(*)")
          .eq("buyer_id", profileData.id)
          .order("created_at", { ascending: false });
        
        setOrders(ordersData || []);
      }
      
      setIsLoading(false);
    };

    checkAuth();
  }, [navigate]);

  const stats = [
    { label: "Commandes", value: orders.length, icon: ShoppingBag, color: "bg-primary/20 text-primary" },
    { label: "Favoris", value: 12, icon: Heart, color: "bg-destructive/20 text-destructive" },
    { label: "Messages", value: 5, icon: MessageCircle, color: "bg-accent/20 text-accent-foreground" },
    { label: "Avis donnés", value: 3, icon: Star, color: "bg-yellow-500/20 text-yellow-600" },
  ];

  const recentProducts = [
    { id: "1", name: "Maïs Jaune Premium", price: 150000, unit: "tonne", image: "https://images.unsplash.com/photo-1551754655-cd27e38d2076?w=200", producer: "Kofi Mensah" },
    { id: "2", name: "Tomates Fraîches", price: 2500, unit: "kg", image: "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=200", producer: "Ama Koffi" },
    { id: "3", name: "Ignames Blancs", price: 3000, unit: "kg", image: "https://images.unsplash.com/photo-1590165482129-1b8b27698780?w=200", producer: "Yao Agbeko" },
  ];

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
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-gradient-hero flex items-center justify-center">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                ) : (
                  <User className="w-8 h-8 text-primary-foreground" />
                )}
              </div>
              <div>
                <h1 className="font-heading text-2xl lg:text-3xl font-bold text-foreground">
                  Bonjour, {profile?.full_name?.split(' ')[0] || "Acheteur"} 👋
                </h1>
                <p className="text-muted-foreground">Découvrez les meilleurs produits agricoles</p>
              </div>
            </div>
            <div className="flex gap-3">
              <Link to="/marketplace">
                <Button variant="hero" className="gap-2">
                  <ShoppingBag className="w-4 h-4" />
                  Explorer le marché
                </Button>
              </Link>
            </div>
          </div>

          {/* Become Producer Banner */}
          <Card className="mb-8 bg-gradient-to-r from-primary/10 to-accent/10 border-primary/20">
            <CardContent className="p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                  <Store className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-heading font-semibold text-foreground">Devenez producteur</h3>
                  <p className="text-sm text-muted-foreground">Vendez vos produits sur NUKUCONNECT</p>
                </div>
              </div>
              <Button variant="outline" className="gap-2">
                <Store className="w-4 h-4" />
                Devenir vendeur
                <ChevronRight className="w-4 h-4" />
              </Button>
            </CardContent>
          </Card>

          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {stats.map((stat) => (
              <Card key={stat.label}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg ${stat.color} flex items-center justify-center`}>
                      <stat.icon className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                      <p className="text-sm text-muted-foreground">{stat.label}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Tabs */}
          <Tabs defaultValue="orders" className="space-y-6">
            <TabsList>
              <TabsTrigger value="orders" className="gap-2">
                <Package className="w-4 h-4" />
                Mes commandes
              </TabsTrigger>
              <TabsTrigger value="favorites" className="gap-2">
                <Heart className="w-4 h-4" />
                Favoris
              </TabsTrigger>
              <TabsTrigger value="recent" className="gap-2">
                <Clock className="w-4 h-4" />
                Vus récemment
              </TabsTrigger>
            </TabsList>

            <TabsContent value="orders">
              <Card>
                <CardHeader>
                  <CardTitle>Commandes récentes</CardTitle>
                  <CardDescription>Suivez l'état de vos commandes</CardDescription>
                </CardHeader>
                <CardContent>
                  {orders.length === 0 ? (
                    <div className="text-center py-12">
                      <Package className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                      <p className="text-muted-foreground mb-4">Aucune commande pour le moment</p>
                      <Link to="/marketplace">
                        <Button variant="hero">Découvrir les produits</Button>
                      </Link>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {orders.map((order) => (
                        <div key={order.id} className="flex items-center justify-between p-4 bg-muted/50 rounded-xl">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                              <Package className="w-6 h-6 text-muted-foreground" />
                            </div>
                            <div>
                              <p className="font-medium">{order.products?.name || "Produit"}</p>
                              <p className="text-sm text-muted-foreground">
                                {order.quantity} × {order.products?.price?.toLocaleString()} FCFA
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <Badge variant={order.status === "completed" ? "default" : "secondary"}>
                              {order.status === "pending" ? "En attente" : order.status === "completed" ? "Terminée" : order.status}
                            </Badge>
                            <p className="text-sm font-medium text-primary mt-1">
                              {order.total_price?.toLocaleString()} FCFA
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="favorites">
              <Card>
                <CardHeader>
                  <CardTitle>Produits favoris</CardTitle>
                  <CardDescription>Retrouvez vos produits préférés</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {recentProducts.map((product) => (
                      <Link key={product.id} to={`/produit/${product.id}`}>
                        <Card className="group hover:shadow-elevated transition-all">
                          <CardContent className="p-3">
                            <div className="flex gap-3">
                              <img src={product.image} alt={product.name} className="w-16 h-16 rounded-lg object-cover" />
                              <div className="flex-1">
                                <h4 className="font-medium text-foreground group-hover:text-primary transition-colors line-clamp-1">
                                  {product.name}
                                </h4>
                                <p className="text-sm text-muted-foreground">{product.producer}</p>
                                <p className="text-sm font-semibold text-primary">
                                  {product.price.toLocaleString()} FCFA/{product.unit}
                                </p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </Link>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="recent">
              <Card>
                <CardHeader>
                  <CardTitle>Consultés récemment</CardTitle>
                  <CardDescription>Les derniers produits que vous avez vus</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {recentProducts.map((product) => (
                      <Link key={product.id} to={`/produit/${product.id}`}>
                        <Card className="group hover:shadow-elevated transition-all">
                          <CardContent className="p-3">
                            <div className="flex gap-3">
                              <img src={product.image} alt={product.name} className="w-16 h-16 rounded-lg object-cover" />
                              <div className="flex-1">
                                <h4 className="font-medium text-foreground group-hover:text-primary transition-colors line-clamp-1">
                                  {product.name}
                                </h4>
                                <p className="text-sm text-muted-foreground">{product.producer}</p>
                                <p className="text-sm font-semibold text-primary">
                                  {product.price.toLocaleString()} FCFA/{product.unit}
                                </p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </Link>
                    ))}
                  </div>
                </CardContent>
              </Card>
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
