import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import MobileBottomNav from "@/components/layout/MobileBottomNav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import {
  Package, TrendingUp, ShoppingCart, DollarSign, Plus, Edit,
  Trash2, Eye, Rocket, BarChart3, Users, Star, Loader2
} from "lucide-react";

const categories = [
  "Céréales", "Légumes", "Fruits", "Tubercules", "Élevage", "Aviculture", "Autre"
];

const Dashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  
  // New product form
  const [newProduct, setNewProduct] = useState({
    name: "",
    description: "",
    price: "",
    category: "",
    unit: "kg",
    quantity_available: "",
    location: "",
    is_organic: false,
  });

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }
      setUser(session.user);
      
      // Fetch profile
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", session.user.id)
        .single();
      
      setProfile(profileData);
      
      if (profileData) {
        // Fetch products
        const { data: productsData } = await supabase
          .from("products")
          .select("*")
          .eq("producer_id", profileData.id)
          .order("created_at", { ascending: false });
        
        setProducts(productsData || []);
        
        // Fetch orders
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

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    
    setIsAddingProduct(true);
    
    try {
      const { error } = await supabase.from("products").insert({
        name: newProduct.name,
        description: newProduct.description,
        price: parseFloat(newProduct.price),
        category: newProduct.category,
        unit: newProduct.unit,
        quantity_available: parseFloat(newProduct.quantity_available),
        location: newProduct.location || profile.location,
        is_organic: newProduct.is_organic,
        producer_id: profile.id,
      });

      if (error) throw error;

      toast({ title: "Produit ajouté !", description: "Votre produit est maintenant visible sur le marketplace." });
      
      // Refresh products
      const { data } = await supabase
        .from("products")
        .select("*")
        .eq("producer_id", profile.id)
        .order("created_at", { ascending: false });
      
      setProducts(data || []);
      setNewProduct({ name: "", description: "", price: "", category: "", unit: "kg", quantity_available: "", location: "", is_organic: false });
    } catch (error: any) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } finally {
      setIsAddingProduct(false);
    }
  };

  const stats = [
    { label: "Produits", value: products.length, icon: Package, color: "bg-primary/20 text-primary" },
    { label: "Commandes", value: orders.length, icon: ShoppingCart, color: "bg-accent/20 text-accent-foreground" },
    { label: "Ventes (FCFA)", value: orders.reduce((sum, o) => sum + (o.total_price || 0), 0).toLocaleString(), icon: DollarSign, color: "bg-green-500/20 text-green-600" },
    { label: "Vues", value: "1.2K", icon: Eye, color: "bg-blue-500/20 text-blue-600" },
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
            <div>
              <h1 className="font-heading text-2xl lg:text-3xl font-bold text-foreground">
                Bonjour, {profile?.full_name || "Producteur"} 👋
              </h1>
              <p className="text-muted-foreground">Gérez vos produits et suivez vos ventes</p>
            </div>
            <div className="flex gap-3">
              <Link to="/plans">
                <Button variant="outline" className="gap-2">
                  <Rocket className="w-4 h-4" />
                  Booster
                </Button>
              </Link>
            </div>
          </div>

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
          <Tabs defaultValue="products" className="space-y-6">
            <TabsList>
              <TabsTrigger value="products" className="gap-2">
                <Package className="w-4 h-4" />
                Mes produits
              </TabsTrigger>
              <TabsTrigger value="orders" className="gap-2">
                <ShoppingCart className="w-4 h-4" />
                Commandes
              </TabsTrigger>
              <TabsTrigger value="analytics" className="gap-2">
                <BarChart3 className="w-4 h-4" />
                Statistiques
              </TabsTrigger>
            </TabsList>

            {/* Products Tab */}
            <TabsContent value="products" className="space-y-6">
              {/* Add Product Form */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Plus className="w-5 h-5" />
                    Ajouter un produit
                  </CardTitle>
                  <CardDescription>Publiez un nouveau produit sur le marketplace</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleAddProduct} className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Nom du produit</Label>
                      <Input 
                        value={newProduct.name} 
                        onChange={(e) => setNewProduct({...newProduct, name: e.target.value})}
                        placeholder="Ex: Maïs biologique" 
                        required 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Catégorie</Label>
                      <Select value={newProduct.category} onValueChange={(v) => setNewProduct({...newProduct, category: v})}>
                        <SelectTrigger><SelectValue placeholder="Choisir" /></SelectTrigger>
                        <SelectContent>
                          {categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Prix (FCFA)</Label>
                      <Input 
                        type="number" 
                        value={newProduct.price} 
                        onChange={(e) => setNewProduct({...newProduct, price: e.target.value})}
                        placeholder="Ex: 5000" 
                        required 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Quantité disponible</Label>
                      <div className="flex gap-2">
                        <Input 
                          type="number" 
                          value={newProduct.quantity_available} 
                          onChange={(e) => setNewProduct({...newProduct, quantity_available: e.target.value})}
                          placeholder="Ex: 100" 
                          required 
                        />
                        <Select value={newProduct.unit} onValueChange={(v) => setNewProduct({...newProduct, unit: v})}>
                          <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="kg">kg</SelectItem>
                            <SelectItem value="tonne">tonne</SelectItem>
                            <SelectItem value="unité">unité</SelectItem>
                            <SelectItem value="sac">sac</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label>Description</Label>
                      <Textarea 
                        value={newProduct.description} 
                        onChange={(e) => setNewProduct({...newProduct, description: e.target.value})}
                        placeholder="Décrivez votre produit..." 
                        rows={3}
                      />
                    </div>
                    <div className="flex items-center gap-3">
                      <Switch 
                        checked={newProduct.is_organic} 
                        onCheckedChange={(v) => setNewProduct({...newProduct, is_organic: v})} 
                      />
                      <Label>Produit biologique</Label>
                    </div>
                    <div className="md:col-span-2 flex justify-end">
                      <Button type="submit" variant="hero" disabled={isAddingProduct}>
                        {isAddingProduct ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                        {isAddingProduct ? "Publication..." : "Publier le produit"}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>

              {/* Products List */}
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {products.map((product) => (
                  <Card key={product.id} className="group">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="font-semibold text-foreground">{product.name}</h3>
                          <p className="text-sm text-muted-foreground">{product.category}</p>
                        </div>
                        {product.is_organic && (
                          <Badge variant="secondary" className="bg-green-100 text-green-700">Bio</Badge>
                        )}
                      </div>
                      <div className="flex items-center justify-between mb-4">
                        <span className="font-heading text-xl font-bold text-primary">
                          {product.price?.toLocaleString()} FCFA
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
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {products.length === 0 && (
                  <div className="md:col-span-3 text-center py-12">
                    <Package className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                    <p className="text-muted-foreground">Aucun produit publié pour le moment</p>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Orders Tab */}
            <TabsContent value="orders">
              <Card>
                <CardHeader>
                  <CardTitle>Commandes récentes</CardTitle>
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
                          <div>
                            <p className="font-medium">{order.products?.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {order.quantity} × {order.products?.price?.toLocaleString()} FCFA
                            </p>
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

            {/* Analytics Tab */}
            <TabsContent value="analytics">
              <div className="grid md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-primary" />
                      Évolution des ventes
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-48 flex items-center justify-center bg-muted/50 rounded-xl">
                      <p className="text-muted-foreground">Graphique des ventes (bientôt disponible)</p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="w-5 h-5 text-primary" />
                      Visiteurs
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-48 flex items-center justify-center bg-muted/50 rounded-xl">
                      <p className="text-muted-foreground">Statistiques visiteurs (bientôt disponible)</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>

      <Footer />
      <MobileBottomNav />
    </div>
  );
};

export default Dashboard;
