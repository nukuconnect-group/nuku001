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
import {
  ShoppingBag, Heart, MessageCircle, Package, TrendingUp, Store,
  Star, MapPin, Clock, ChevronRight, Loader2, User, Eye, Bell, HandCoins
} from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import CreateDemandModal from "@/components/marketplace/CreateDemandModal";
import DemandsList from "@/components/marketplace/DemandsList";

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

  const totalSpent = orders.reduce((sum, o) => sum + (Number(o.total_price) || 0), 0);

  const stats = [
    { 
      label: "Commandes", 
      value: orders.length, 
      icon: ShoppingBag, 
      color: "bg-primary/20 text-primary",
      trend: { value: 5, isPositive: true }
    },
    { 
      label: "Dépenses (FCFA)", 
      value: totalSpent.toLocaleString(), 
      icon: TrendingUp, 
      color: "bg-green-500/20 text-green-600"
    },
    { 
      label: "Favoris", 
      value: 12, 
      icon: Heart, 
      color: "bg-destructive/20 text-destructive" 
    },
    { 
      label: "Messages", 
      value: 5, 
      icon: MessageCircle, 
      color: "bg-accent/20 text-accent-foreground" 
    },
  ];

  const recentProducts = [
    { id: "1", name: "Maïs Jaune Premium", price: 150000, unit: "tonne", image: "https://images.unsplash.com/photo-1551754655-cd27e38d2076?w=200", producer: "Kofi Mensah" },
    { id: "2", name: "Tomates Fraîches", price: 2500, unit: "kg", image: "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=200", producer: "Ama Koffi" },
    { id: "3", name: "Ignames Blancs", price: 3000, unit: "kg", image: "https://images.unsplash.com/photo-1590165482129-1b8b27698780?w=200", producer: "Yao Agbeko" },
  ];

  const handleBecomeProducer = async () => {
    if (!profile) return;
    
    const { error } = await supabase
      .from("profiles")
      .update({ user_type: "producer" })
      .eq("id", profile.id);
    
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Félicitations !", description: "Vous êtes maintenant producteur. Redirection..." });
      setTimeout(() => navigate("/dashboard"), 1500);
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
                <p className="text-muted-foreground">Tableau de bord acheteur • Trouvez les meilleurs produits agricoles</p>
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
          <Card className="mb-8 bg-gradient-to-r from-primary/10 to-accent/10 border-primary/20 overflow-hidden">
            <CardContent className="p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-primary/20 flex items-center justify-center">
                  <Store className="w-7 h-7 text-primary" />
                </div>
                <div>
                  <h3 className="font-heading text-lg font-semibold text-foreground">Devenez producteur ou fournisseur</h3>
                  <p className="text-sm text-muted-foreground">Vendez vos produits agricoles sur NUKUCONNECT et touchez des milliers d'acheteurs</p>
                </div>
              </div>
              <Button onClick={handleBecomeProducer} className="gap-2 whitespace-nowrap">
                <Store className="w-4 h-4" />
                Devenir vendeur
                <ChevronRight className="w-4 h-4" />
              </Button>
            </CardContent>
          </Card>

          {/* Stats */}
          <StatsGrid stats={stats} />

          {/* Purchase Chart */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary" />
                Évolution de mes achats (FCFA)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={purchaseData}>
                  <defs>
                    <linearGradient id="colorAchats" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={(v) => `${v/1000}K`} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                    formatter={(value: number) => [`${value.toLocaleString()} FCFA`, 'Achats']}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="achats" 
                    stroke="hsl(var(--primary))" 
                    fillOpacity={1} 
                    fill="url(#colorAchats)" 
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Tabs */}
          <Tabs defaultValue="orders" className="space-y-6">
            <TabsList className="bg-muted p-1">
              <TabsTrigger value="orders" className="gap-2 data-[state=active]:bg-background">
                <Package className="w-4 h-4" />
                Mes commandes ({orders.length})
              </TabsTrigger>
              <TabsTrigger value="favorites" className="gap-2 data-[state=active]:bg-background">
                <Heart className="w-4 h-4" />
                Favoris
              </TabsTrigger>
              <TabsTrigger value="recent" className="gap-2 data-[state=active]:bg-background">
                <Clock className="w-4 h-4" />
                Vus récemment
              </TabsTrigger>
              <TabsTrigger value="alerts" className="gap-2 data-[state=active]:bg-background">
                <Bell className="w-4 h-4" />
                Alertes prix
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
                            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                              <Package className="w-6 h-6 text-primary" />
                            </div>
                            <div>
                              <p className="font-medium">{order.products?.name || "Produit"}</p>
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
                              <div className="flex-1 min-w-0">
                                <h4 className="font-medium text-foreground group-hover:text-primary transition-colors line-clamp-1">
                                  {product.name}
                                </h4>
                                <p className="text-sm text-muted-foreground truncate">{product.producer}</p>
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
                              <div className="flex-1 min-w-0">
                                <h4 className="font-medium text-foreground group-hover:text-primary transition-colors line-clamp-1">
                                  {product.name}
                                </h4>
                                <p className="text-sm text-muted-foreground truncate">{product.producer}</p>
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

            <TabsContent value="alerts">
              <Card>
                <CardHeader>
                  <CardTitle>Alertes de prix</CardTitle>
                  <CardDescription>Recevez des notifications quand les prix baissent</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-12">
                    <Bell className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                    <p className="text-muted-foreground mb-4">Aucune alerte configurée</p>
                    <Button variant="outline">Créer une alerte</Button>
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
