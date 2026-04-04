import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import MobileBottomNav from "@/components/layout/MobileBottomNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/contexts/LanguageContext";
import { generateInvoicePDF } from "@/utils/generateInvoicePDF";
import DeliveryChat from "@/components/delivery/DeliveryChat";
import DriverLiveMap from "@/components/delivery/DriverLiveMap";
import { 
  Truck, Package, Clock, CheckCircle2, MessageCircle, 
  AlertCircle, ShoppingCart, Loader2, LogIn, RefreshCw, FileDown, Search, X, Hash
} from "lucide-react";

const DeliveryTracking = () => {
  const navigate = useNavigate();
  const { formatPrice } = useLanguage();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [deliveries, setDeliveries] = useState<Record<string, any>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchMode, setSearchMode] = useState<"list" | "search">("list");
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState("");

  const fetchOrders = async (prof: any) => {
    const { data } = await supabase
      .from("orders")
      .select("*, products(name, images, category, unit, price, location), profiles!orders_seller_id_fkey(full_name)")
      .or(`buyer_id.eq.${prof.id},seller_id.eq.${prof.id}`)
      .order("created_at", { ascending: false });
    setOrders(data || []);
    if (data && data.length > 0 && !selectedOrder) setSelectedOrder(data[0]);
    if (selectedOrder && data) {
      const updated = data.find((o: any) => o.id === selectedOrder.id);
      if (updated) setSelectedOrder(updated);
    }
    // Fetch delivery records for these orders
    if (data && data.length > 0) {
      const orderIds = data.map((o: any) => o.id);
      const { data: dels } = await supabase
        .from("deliveries" as any)
        .select("*")
        .in("order_id", orderIds);
      const delMap: Record<string, any> = {};
      ((dels as any[]) || []).forEach((d: any) => { delMap[d.order_id] = d; });
      setDeliveries(delMap);
    }
  };

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!mounted) return;
      if (!session) { setIsLoading(false); return; }
      setUser(session.user);
      const { data: prof } = await supabase.from("profiles").select("id, user_type, full_name").eq("user_id", session.user.id).maybeSingle();
      if (!mounted) return;
      setProfile(prof);
      if (prof) await fetchOrders(prof);
      if (mounted) setIsLoading(false);
    };
    load();

    // Keep auth state in sync
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return;
      setUser(session?.user ?? null);
      if (session?.user) {
        const { data: prof } = await supabase.from("profiles").select("id, user_type, full_name").eq("user_id", session.user.id).maybeSingle();
        if (!mounted) return;
        setProfile(prof);
        if (prof) await fetchOrders(prof);
      }
    });

    return () => { mounted = false; subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    if (!profile) return;
    const channel = supabase
      .channel('order-tracking')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        fetchOrders(profile);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [profile]);

  const handleSearch = async () => {
    const q = searchQuery.trim();
    if (!q) return;
    setSearchLoading(true);
    setSearchError("");
    setSelectedOrder(null);

    // Search by order ID (full or partial)
    const { data, error } = await supabase
      .from("orders")
      .select("*, products(name, images, category, unit, price, location), profiles!orders_seller_id_fkey(full_name)")
      .or(`id.eq.${q},id.ilike.%${q}%`)
      .limit(10);

    if (error || !data || data.length === 0) {
      // Try searching by product name
      const { data: byProduct } = await supabase
        .from("orders")
        .select("*, products(name, images, category, unit, price, location), profiles!orders_seller_id_fkey(full_name)")
        .order("created_at", { ascending: false })
        .limit(50);

      const filtered = (byProduct || []).filter((o: any) =>
        o.products?.name?.toLowerCase().includes(q.toLowerCase()) ||
        o.id.toLowerCase().includes(q.toLowerCase())
      );

      if (filtered.length > 0) {
        setOrders(filtered);
        setSelectedOrder(filtered[0]);
        setSearchMode("search");
      } else {
        setSearchError("Aucune commande trouvée avec cet identifiant. Vérifiez le numéro et réessayez.");
      }
    } else {
      setOrders(data);
      setSelectedOrder(data[0]);
      setSearchMode("search");
    }
    setSearchLoading(false);
  };

  const resetSearch = async () => {
    setSearchQuery("");
    setSearchError("");
    setSearchMode("list");
    setSelectedOrder(null);
    if (profile) await fetchOrders(profile);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": case "delivered": return "bg-primary text-primary-foreground";
      case "in-transit": case "shipped": return "bg-blue-500 text-white";
      case "pending": return "bg-accent text-accent-foreground";
      case "confirmed": return "bg-emerald-500 text-white";
      case "cancelled": return "bg-destructive text-destructive-foreground";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "completed": case "delivered": return "Livré";
      case "in-transit": case "shipped": return "En transit";
      case "pending": return "En attente";
      case "confirmed": return "Confirmé";
      case "cancelled": return "Annulée";
      default: return status;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed": case "delivered": return <CheckCircle2 className="w-4 h-4" />;
      case "in-transit": case "shipped": return <Truck className="w-4 h-4" />;
      case "pending": return <Clock className="w-4 h-4" />;
      case "confirmed": return <Package className="w-4 h-4" />;
      default: return <AlertCircle className="w-4 h-4" />;
    }
  };

  const getOrderSteps = (order: any) => {
    const dateStr = (d: string) => new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
    type Step = { status: "done" | "current" | "pending"; title: string; desc: string; time: string; icon: any };
    const steps: Step[] = [
      { status: "done", title: "Commande passée", desc: "Commande enregistrée avec succès", time: dateStr(order.created_at), icon: <ShoppingCart className="w-3.5 h-3.5" /> },
      { status: "done", title: "Paiement validé", desc: "Paiement confirmé", time: dateStr(order.created_at), icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
    ];
    if (order.status === "pending") {
      steps.push({ status: "current", title: "Préparation en cours", desc: "Le vendeur prépare votre commande", time: "", icon: <Package className="w-3.5 h-3.5" /> });
      steps.push({ status: "pending", title: "Expédition", desc: "En attente d'envoi", time: "", icon: <Truck className="w-3.5 h-3.5" /> });
      steps.push({ status: "pending", title: "Livraison", desc: "En attente de livraison", time: "", icon: <CheckCircle2 className="w-3.5 h-3.5" /> });
    } else if (order.status === "confirmed") {
      steps.push({ status: "done", title: "Préparation terminée", desc: "Commande prête pour expédition", time: "", icon: <Package className="w-3.5 h-3.5" /> });
      steps.push({ status: "current", title: "En attente d'expédition", desc: "Le vendeur va expédier sous peu", time: "", icon: <Truck className="w-3.5 h-3.5" /> });
      steps.push({ status: "pending", title: "Livraison", desc: "", time: "", icon: <CheckCircle2 className="w-3.5 h-3.5" /> });
    } else if (order.status === "shipped" || order.status === "in-transit") {
      steps.push({ status: "done", title: "Préparation terminée", desc: "Produit emballé", time: "", icon: <Package className="w-3.5 h-3.5" /> });
      steps.push({ status: "current", title: "En transit", desc: "En route vers vous", time: "", icon: <Truck className="w-3.5 h-3.5" /> });
      steps.push({ status: "pending", title: "Livraison", desc: "Estimation sous 24-48h", time: "", icon: <CheckCircle2 className="w-3.5 h-3.5" /> });
    } else if (order.status === "completed" || order.status === "delivered") {
      steps.push({ status: "done", title: "Préparation terminée", desc: "Produit emballé", time: "", icon: <Package className="w-3.5 h-3.5" /> });
      steps.push({ status: "done", title: "Expédié", desc: "Livré par le transporteur", time: "", icon: <Truck className="w-3.5 h-3.5" /> });
      steps.push({ status: "done", title: "Livré ✓", desc: "Commande reçue avec succès", time: dateStr(order.updated_at), icon: <CheckCircle2 className="w-3.5 h-3.5" /> });
    } else if (order.status === "cancelled") {
      steps.push({ status: "done", title: "Commande annulée", desc: "Cette commande a été annulée", time: dateStr(order.updated_at), icon: <AlertCircle className="w-3.5 h-3.5" /> });
    }
    return steps;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-14 lg:pb-0">
      <Header />

      {/* Hero */}
      <section className="py-6 sm:py-8 bg-muted/30 border-b border-border">
        <div className="container mx-auto px-3 sm:px-4 text-center">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
            <Package className="w-6 h-6 text-primary" />
          </div>
          <h1 className="font-heading text-xl sm:text-2xl font-bold text-foreground mb-1">Suivre mes commandes</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mb-4">Suivi en temps réel de vos achats</p>

          {/* Search bar */}
          {user && (
            <div className="max-w-lg mx-auto">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Entrez l'ID de commande ou nom du produit..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                    className="pl-9 h-10 text-sm"
                  />
                </div>
                {searchMode === "search" ? (
                  <Button variant="outline" size="sm" onClick={resetSearch} className="gap-1.5 h-10">
                    <X className="w-4 h-4" />Effacer
                  </Button>
                ) : null}
                <Button variant="hero" size="sm" onClick={handleSearch} disabled={searchLoading} className="gap-1.5 h-10">
                  {searchLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  Chercher
                </Button>
              </div>
              {searchError && (
                <p className="text-xs text-destructive mt-2 flex items-center gap-1 justify-center">
                  <AlertCircle className="w-3.5 h-3.5" />{searchError}
                </p>
              )}
            </div>
          )}
        </div>
      </section>

      <section className="py-6">
        <div className="container mx-auto px-3 sm:px-4 max-w-4xl">
          {!user ? (
            <Card>
              <CardContent className="p-8 text-center">
                <LogIn className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-heading font-bold text-lg mb-2">Connexion requise</h3>
                <p className="text-sm text-muted-foreground mb-4">Connectez-vous pour voir vos commandes</p>
                <Button variant="hero" onClick={() => navigate("/auth")}>Se connecter</Button>
              </CardContent>
            </Card>
          ) : orders.length === 0 && searchMode === "list" ? (
            <Card>
              <CardContent className="p-8 text-center">
                <ShoppingCart className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-heading font-bold text-lg mb-2">Aucune commande</h3>
                <p className="text-sm text-muted-foreground mb-4">Vous n'avez pas encore passé de commande</p>
                <Button variant="hero" onClick={() => navigate("/marketplace")}>Explorer le marché</Button>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-heading text-sm sm:text-base font-bold">
                  {searchMode === "search" 
                    ? `Résultats (${orders.length})` 
                    : `Mes commandes (${orders.length})`}
                </h2>
                <Button variant="ghost" size="sm" className="gap-1.5 text-xs"
                  onClick={() => { if (searchMode === "search") resetSearch(); else if (profile) fetchOrders(profile); }}>
                  <RefreshCw className="w-3.5 h-3.5" />
                  {searchMode === "search" ? "Voir tout" : "Actualiser"}
                </Button>
              </div>

              <div className="grid sm:grid-cols-2 gap-3 mb-6">
                {orders.map((order) => (
                  <Card key={order.id}
                    className={`cursor-pointer transition-all hover:shadow-md ${selectedOrder?.id === order.id ? "ring-2 ring-primary" : ""}`}
                    onClick={() => setSelectedOrder(order)}>
                    <CardContent className="p-3 sm:p-4">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2 min-w-0">
                          {order.products?.images?.[0] && (
                            <img src={order.products.images[0]} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                          )}
                          <div className="min-w-0">
                            <p className="font-semibold text-sm text-foreground line-clamp-1">
                              {order.products?.name || "Produit"}
                            </p>
                            <p className="text-[10px] text-muted-foreground font-mono">
                              ID: {order.id.substring(0, 8)}...
                            </p>
                          </div>
                        </div>
                        <Badge className={`${getStatusColor(order.status)} text-[10px] flex-shrink-0`}>
                          {getStatusLabel(order.status)}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                        <span>{order.quantity} × {formatPrice(order.products?.price || 0)}</span>
                        <span className="font-bold text-primary text-xs">{formatPrice(order.total_price)}</span>
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-muted-foreground mt-1">
                        <span>{new Date(order.created_at).toLocaleDateString("fr-FR")}</span>
                        {order.products?.location && (
                          <span className="truncate ml-2">{order.products.location}</span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Detail view */}
              {selectedOrder && (
                <Card>
                  <CardHeader className="p-4 pb-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <CardTitle className="text-base">{selectedOrder.products?.name || "Commande"}</CardTitle>
                        <p className="text-xs text-muted-foreground">
                          {selectedOrder.quantity} {selectedOrder.products?.unit || "unités"} • {formatPrice(selectedOrder.total_price)}
                        </p>
                        <p className="text-[10px] text-muted-foreground font-mono mt-0.5">
                          Réf: {selectedOrder.id}
                        </p>
                      </div>
                      <Badge className={`${getStatusColor(selectedOrder.status)} self-start gap-1`}>
                        {getStatusIcon(selectedOrder.status)}
                        {getStatusLabel(selectedOrder.status)}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 pt-2">
                    {/* Seller info */}
                    {selectedOrder.profiles?.full_name && (
                      <div className="p-3 bg-muted/50 rounded-xl mb-4 flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <Package className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Vendeur</p>
                          <p className="text-sm font-medium">{selectedOrder.profiles.full_name}</p>
                        </div>
                      </div>
                    )}

                    {selectedOrder.notes && (
                      <div className="p-3 bg-muted/50 rounded-xl mb-4">
                        <p className="text-[10px] text-muted-foreground mb-0.5">Détails</p>
                        <p className="text-xs">{selectedOrder.notes}</p>
                      </div>
                    )}

                    <h3 className="font-heading font-semibold text-sm mb-3">Suivi en temps réel</h3>
                    <div className="space-y-0">
                      {getOrderSteps(selectedOrder).map((step, i, arr) => (
                        <div key={i} className="flex gap-3">
                          <div className="flex flex-col items-center">
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
                              step.status === "done" ? "bg-primary text-primary-foreground" :
                              step.status === "current" ? "bg-blue-500 text-white animate-pulse" :
                              "bg-muted text-muted-foreground"
                            }`}>
                              {step.icon}
                            </div>
                            {i < arr.length - 1 && (
                              <div className={`w-0.5 h-8 ${step.status === "done" ? "bg-primary" : "bg-border"}`} />
                            )}
                          </div>
                          <div className="pb-4">
                            <p className={`text-sm font-medium ${step.status === "pending" ? "text-muted-foreground" : "text-foreground"}`}>{step.title}</p>
                            {step.desc && <p className="text-xs text-muted-foreground">{step.desc}</p>}
                            {step.time && <p className="text-[10px] text-primary font-medium">{step.time}</p>}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="flex gap-2 mt-3">
                      {deliveries[selectedOrder.id] && !["delivered", "cancelled"].includes(deliveries[selectedOrder.id].status) ? (
                        <DeliveryChat
                          deliveryId={deliveries[selectedOrder.id].id}
                          currentUserRole="buyer"
                          otherPartyName="Livreur"
                          trigger={
                            <Button variant="outline" size="sm" className="gap-1.5 text-xs flex-1">
                              <MessageCircle className="w-3.5 h-3.5" />Chat livreur
                            </Button>
                          }
                        />
                      ) : (
                        <Button variant="outline" size="sm" className="gap-1.5 text-xs flex-1"
                          onClick={() => navigate("/messages")}>
                          <MessageCircle className="w-3.5 h-3.5" />Contacter
                        </Button>
                      )}
                      <Button variant="outline" size="sm" className="gap-1.5 text-xs flex-1"
                        onClick={() => {
                          const order = selectedOrder;
                          const notesParts = (order.notes || "").split(" | ");
                          const deliveryInfo = notesParts.find((n: string) => n.startsWith("Livraison:")) || "Retrait sur place";
                          const paymentInfo = notesParts.find((n: string) => n.startsWith("Paiement:"))?.replace("Paiement: ", "") || "Mobile Money";
                          const telInfo = notesParts.find((n: string) => n.startsWith("Tél:"))?.replace("Tél: ", "") || "";
                          const created = new Date(order.created_at);
                          const invoiceNumber = `NK-${created.getFullYear()}${String(created.getMonth() + 1).padStart(2, "0")}${String(created.getDate()).padStart(2, "0")}-${order.id.substring(0, 6).toUpperCase()}`;
                          generateInvoicePDF({
                            invoiceNumber,
                            date: created.toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" }),
                            buyerName: profile?.full_name || "Client",
                            deliveryMethod: deliveryInfo,
                            deliveryPrice: 0,
                            paymentMethod: paymentInfo,
                            mobileNumber: telInfo,
                            items: [{
                              name: order.products?.name || "Produit",
                              quantity: Number(order.quantity),
                              unitPrice: Number(order.products?.price || 0),
                              unit: order.products?.unit || "unité",
                              sellerName: order.profiles?.full_name || "Vendeur",
                            }],
                            subtotal: Number(order.total_price),
                            total: Number(order.total_price),
                          });
                        }}>
                        <FileDown className="w-3.5 h-3.5" />Facture
                      </Button>
                      <Button variant="outline" size="sm" className="gap-1.5 text-xs flex-1">
                        <AlertCircle className="w-3.5 h-3.5" />Signaler
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>
      </section>

      <Footer />
      <MobileBottomNav />
    </div>
  );
};

export default DeliveryTracking;
