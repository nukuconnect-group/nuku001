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
import { 
  Truck, Package, MapPin, Clock, CheckCircle2, Search, Phone, 
  AlertCircle, ShoppingCart, Loader2, LogIn 
} from "lucide-react";

const DeliveryTracking = () => {
  const navigate = useNavigate();
  const { t, formatPrice } = useLanguage();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [trackingCode, setTrackingCode] = useState("");

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setIsLoading(false); return; }
      setUser(session.user);
      
      const { data: prof } = await supabase.from("profiles").select("*").eq("user_id", session.user.id).single();
      setProfile(prof);
      
      if (prof) {
        const { data } = await supabase
          .from("orders")
          .select("*, products(name, images, category, unit, price, producer_id, profiles:profiles!products_producer_id_fkey(full_name, location))")
          .or(`buyer_id.eq.${prof.id},seller_id.eq.${prof.id}`)
          .order("created_at", { ascending: false });
        setOrders(data || []);
        if (data && data.length > 0) setSelectedOrder(data[0]);
      }
      setIsLoading(false);
    };
    load();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": case "delivered": return "bg-primary text-primary-foreground";
      case "in-transit": case "shipped": return "bg-blue-500 text-white";
      case "pending": return "bg-accent text-accent-foreground";
      case "cancelled": return "bg-destructive text-destructive-foreground";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "completed": case "delivered": return "Livré";
      case "in-transit": case "shipped": return "En transit";
      case "pending": return "En attente";
      case "cancelled": return "Annulée";
      default: return status;
    }
  };

  const getOrderSteps = (order: any): { status: "done" | "current" | "pending"; title: string; description: string; time: string }[] => {
    type Step = { status: "done" | "current" | "pending"; title: string; description: string; time: string };
    const steps: Step[] = [
      { status: "done", title: "Commande confirmée", description: "Paiement validé", time: new Date(order.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) },
    ];
    if (order.status === "pending") {
      steps.push({ status: "current", title: "En attente", description: "Le vendeur prépare votre commande", time: "" });
      steps.push({ status: "pending", title: "Expédition", description: "En attente d'envoi", time: "" });
      steps.push({ status: "pending", title: "Livraison", description: "Livraison prévue", time: "" });
    } else if (order.status === "shipped" || order.status === "in-transit") {
      steps.push({ status: "done", title: "Préparation", description: "Produit emballé", time: "" });
      steps.push({ status: "current", title: "En transit", description: "En route vers vous", time: "" });
      steps.push({ status: "pending", title: "Livraison", description: "Livraison prévue", time: "" });
    } else if (order.status === "completed" || order.status === "delivered") {
      steps.push({ status: "done", title: "Préparation", description: "Produit emballé", time: "" });
      steps.push({ status: "done", title: "En transit", description: "Livré par le transporteur", time: "" });
      steps.push({ status: "done", title: "Livré", description: "Reçu par le client", time: new Date(order.updated_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) });
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

      <section className="py-6 sm:py-10 bg-muted/30 border-b border-border">
        <div className="container mx-auto px-3 sm:px-4">
          <div className="max-w-2xl mx-auto text-center">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Truck className="w-6 h-6 text-primary" />
            </div>
            <h1 className="font-heading text-xl sm:text-2xl lg:text-3xl font-bold text-foreground mb-2">
              Suivre mes commandes
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mb-4">
              Suivez l'état de vos commandes en temps réel
            </p>
          </div>
        </div>
      </section>

      <section className="py-6 sm:py-8">
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
          ) : orders.length === 0 ? (
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
              <h2 className="font-heading text-sm sm:text-base font-bold mb-4">
                Mes commandes ({orders.length})
              </h2>
              <div className="grid sm:grid-cols-2 gap-3 mb-6">
                {orders.map((order) => (
                  <Card key={order.id}
                    className={`cursor-pointer transition-all hover:shadow-elevated ${selectedOrder?.id === order.id ? "ring-2 ring-primary" : ""}`}
                    onClick={() => setSelectedOrder(order)}>
                    <CardContent className="p-3 sm:p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {order.products?.images?.[0] && (
                            <img src={order.products.images[0]} alt="" className="w-10 h-10 rounded-lg object-cover" />
                          )}
                          <div>
                            <p className="font-semibold text-sm text-foreground line-clamp-1">
                              {order.products?.name || "Produit"}
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                              {order.quantity} × {formatPrice(order.products?.price || 0)}
                            </p>
                          </div>
                        </div>
                        <Badge className={`${getStatusColor(order.status)} text-[10px]`}>
                          {getStatusLabel(order.status)}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                        <span>{new Date(order.created_at).toLocaleDateString("fr-FR")}</span>
                        <span className="font-medium text-primary text-xs">{formatPrice(order.total_price)}</span>
                      </div>
                      {order.notes && (
                        <p className="text-[9px] text-muted-foreground mt-1 line-clamp-1">{order.notes}</p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>

              {selectedOrder && (
                <Card>
                  <CardHeader className="p-4 sm:p-6 pb-2 sm:pb-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <CardTitle className="text-base sm:text-lg">
                          {selectedOrder.products?.name || "Commande"}
                        </CardTitle>
                        <p className="text-xs text-muted-foreground">
                          {selectedOrder.quantity} {selectedOrder.products?.unit || "unités"} • Total: {formatPrice(selectedOrder.total_price)}
                        </p>
                      </div>
                      <Badge className={`${getStatusColor(selectedOrder.status)} self-start`}>
                        {getStatusLabel(selectedOrder.status)}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 sm:p-6 pt-2 sm:pt-3">
                    {selectedOrder.notes && (
                      <div className="p-3 bg-muted/50 rounded-xl mb-4">
                        <p className="text-[10px] text-muted-foreground mb-0.5">Notes de livraison</p>
                        <p className="text-xs font-medium">{selectedOrder.notes}</p>
                      </div>
                    )}

                    <h3 className="font-heading font-semibold text-sm mb-4">Historique de suivi</h3>
                    <div className="space-y-0">
                      {getOrderSteps(selectedOrder).map((step, i, arr) => (
                        <div key={i} className="flex gap-3 relative">
                          <div className="flex flex-col items-center">
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                              step.status === "done" ? "bg-primary text-primary-foreground" :
                              step.status === "current" ? "bg-blue-500 text-white animate-pulse" :
                              "bg-muted text-muted-foreground"
                            }`}>
                              {step.status === "done" ? <CheckCircle2 className="w-3.5 h-3.5" /> :
                               step.status === "current" ? <Truck className="w-3.5 h-3.5" /> :
                               <Clock className="w-3.5 h-3.5" />}
                            </div>
                            {i < arr.length - 1 && (
                              <div className={`w-0.5 h-10 ${step.status === "done" ? "bg-primary" : "bg-border"}`} />
                            )}
                          </div>
                          <div className="pb-6">
                            <p className="text-sm font-medium text-foreground">{step.title}</p>
                            <p className="text-xs text-muted-foreground">{step.description}</p>
                            {step.time && <p className="text-[10px] text-muted-foreground mt-0.5">{step.time}</p>}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="flex gap-2 mt-4">
                      <Button variant="outline" size="sm" className="gap-1.5 text-xs flex-1"
                        onClick={() => navigate("/messages")}>
                        <Phone className="w-3.5 h-3.5" />Contacter le vendeur
                      </Button>
                      <Button variant="outline" size="sm" className="gap-1.5 text-xs flex-1">
                        <AlertCircle className="w-3.5 h-3.5" />Signaler un problème
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
