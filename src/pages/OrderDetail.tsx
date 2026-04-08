import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/contexts/ProfileContext";
import { useLanguage } from "@/contexts/LanguageContext";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import MobileBottomNav from "@/components/layout/MobileBottomNav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Package, Truck, CheckCircle2, Clock, XCircle, ArrowLeft,
  FileDown, MapPin, CreditCard, Phone, User, Star, Loader2,
  ShoppingBag, Receipt
} from "lucide-react";
import { generateInvoicePDF } from "@/utils/generateInvoicePDF";
import DeliveryLiveMap from "@/components/delivery/DeliveryLiveMap";

const STATUS_CONFIG: Record<string, { label: string; icon: any; color: string; bgColor: string }> = {
  pending: { label: "En attente", icon: Clock, color: "text-yellow-700", bgColor: "bg-yellow-100" },
  confirmed: { label: "Confirmée", icon: CheckCircle2, color: "text-blue-700", bgColor: "bg-blue-100" },
  processing: { label: "En préparation", icon: Package, color: "text-purple-700", bgColor: "bg-purple-100" },
  shipped: { label: "Expédiée", icon: Truck, color: "text-orange-700", bgColor: "bg-orange-100" },
  completed: { label: "Terminée", icon: CheckCircle2, color: "text-green-700", bgColor: "bg-green-100" },
  cancelled: { label: "Annulée", icon: XCircle, color: "text-red-700", bgColor: "bg-red-100" },
};

const OrderDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, profile, isReady } = useProfile();
  const { formatPrice } = useLanguage();
  const [order, setOrder] = useState<any>(null);
  const [delivery, setDelivery] = useState<any>(null);
  const [seller, setSeller] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isReady) return;
    if (!user) { navigate("/auth"); return; }
    if (!id) return;

    const load = async () => {
      const { data: orderData } = await supabase
        .from("orders")
        .select("*, products(*)")
        .eq("id", id)
        .single();

      if (!orderData) { navigate("/buyer-dashboard"); return; }
      setOrder(orderData);

      const { data: sellerData } = await supabase
        .from("profiles")
        .select("full_name, avatar_url, location, is_verified")
        .eq("id", orderData.seller_id)
        .single();
      setSeller(sellerData);

      const { data: deliveryData } = await supabase
        .from("deliveries")
        .select("*")
        .eq("order_id", id)
        .maybeSingle();
      setDelivery(deliveryData);

      setIsLoading(false);
    };
    load();
  }, [id, user, isReady, navigate]);

  // Realtime: listen to delivery & order status changes for live tracking
  useEffect(() => {
    if (!id) return;
    const channel = supabase
      .channel(`order-tracking-${id}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "orders", filter: `id=eq.${id}` }, (payload: any) => {
        setOrder((prev: any) => prev ? { ...prev, ...payload.new } : prev);
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "deliveries" }, (payload: any) => {
        if (payload.new.order_id === id) {
          setDelivery(payload.new);
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [id]);

  const handleDownloadInvoice = () => {
    if (!order) return;
    const notesParts = (order.notes || "").split(" | ");
    const paymentInfo = notesParts.find((n: string) => n.startsWith("Paiement:"))?.replace("Paiement: ", "") || "Mobile Money";
    const phoneInfo = notesParts.find((n: string) => n.startsWith("Tel:"))?.replace("Tel: ", "");

    const now = new Date(order.created_at);
    const invoiceNumber = `NK-${order.id.slice(0, 8).toUpperCase()}`;

    generateInvoicePDF({
      invoiceNumber,
      date: now.toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" }),
      buyerName: profile?.full_name || "Client",
      buyerPhone: phoneInfo,
      deliveryMethod: delivery ? "Livraison à domicile" : "Retrait sur place",
      deliveryAddress: delivery?.dropoff_address,
      deliveryCity: delivery?.pickup_address,
      deliveryPrice: delivery ? Number(delivery.delivery_fee || 0) : 0,
      paymentMethod: paymentInfo,
      mobileNumber: phoneInfo,
      items: [{
        name: order.products?.name || "Produit",
        quantity: Number(order.quantity),
        unitPrice: Number(order.products?.price || 0),
        unit: order.products?.unit || "unité",
        sellerName: seller?.full_name || "Vendeur",
      }],
      subtotal: Number(order.total_price),
      total: Number(order.total_price) + (delivery ? Number(delivery.delivery_fee || 0) : 0),
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!order) return null;

  const status = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
  const StatusIcon = status.icon;
  const productImage = order.products?.images?.[0];
  const unitPrice = Number(order.products?.price || 0);
  const deliveryFee = delivery ? Number(delivery.delivery_fee || 0) : 0;
  const commission = Math.round(Number(order.total_price) * 0.05); // approximate display
  const grandTotal = Number(order.total_price) + deliveryFee;

  // Build timeline
  const timeline = [
    { label: "Commande passée", date: order.created_at, done: true },
    { label: "Confirmée", date: order.status !== "pending" ? order.updated_at : null, done: ["confirmed", "processing", "shipped", "completed"].includes(order.status) },
    { label: "En préparation", date: null, done: ["processing", "shipped", "completed"].includes(order.status) },
  ];
  if (delivery) {
    timeline.push(
      { label: "Récupérée par livreur", date: delivery.picked_up_at, done: !!delivery.picked_up_at },
      { label: "En cours de livraison", date: null, done: delivery.status === "in_transit" || delivery.status === "delivered" },
      { label: "Livrée", date: delivery.delivered_at, done: delivery.status === "delivered" },
    );
  } else {
    timeline.push(
      { label: "Sans livreur — Retrait sur place", date: null, done: order.status === "completed" },
    );
  }
  if (order.status === "completed") {
    timeline.push({ label: "Terminée", date: order.updated_at, done: true });
  }

  return (
    <div className="min-h-screen bg-background pb-20 lg:pb-0">
      <Header />
      <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 max-w-2xl space-y-4">
        {/* Back + Title */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex-1">
            <h1 className="text-lg font-bold">Commande #{order.id.slice(0, 8)}</h1>
            <p className="text-xs text-muted-foreground">
              {new Date(order.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}
            </p>
          </div>
          <Badge className={`${status.bgColor} ${status.color} border-0 gap-1`}>
            <StatusIcon className="w-3 h-3" />
            {status.label}
          </Badge>
        </div>

        {/* Product Card */}
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex gap-3">
              {productImage ? (
                <img src={productImage} alt={order.products?.name} className="w-20 h-20 rounded-xl object-cover flex-shrink-0" />
              ) : (
                <div className="w-20 h-20 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <ShoppingBag className="w-8 h-8 text-primary/40" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm truncate">{order.products?.name || "Produit"}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {order.quantity} × {formatPrice(unitPrice)} / {order.products?.unit || "unité"}
                </p>
                <p className="text-lg font-bold text-primary mt-1">{formatPrice(Number(order.total_price))}</p>
                {order.products?.is_organic && (
                  <Badge className="bg-green-100 text-green-700 border-0 text-[9px] mt-1">🌿 Bio</Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Seller Info */}
        {seller && (
          <Card>
            <CardContent className="p-3 sm:p-4 flex items-center gap-3">
              {seller.avatar_url ? (
                <img src={seller.avatar_url} alt={seller.full_name} className="w-10 h-10 rounded-full object-cover" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="w-5 h-5 text-primary/60" />
                </div>
              )}
              <div className="flex-1">
                <div className="flex items-center gap-1.5">
                  <p className="text-sm font-medium">{seller.full_name}</p>
                  {seller.is_verified && <CheckCircle2 className="w-3.5 h-3.5 text-primary" />}
                </div>
                {seller.location && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <MapPin className="w-3 h-3" /> {seller.location}
                  </p>
                )}
              </div>
              <Link to={`/messages`}>
                <Button variant="outline" size="sm" className="text-xs h-8">Contacter</Button>
              </Link>
            </CardContent>
          </Card>
        )}

        {/* Order Timeline */}
        <Card>
          <CardHeader className="p-3 sm:p-4 pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Truck className="w-4 h-4 text-primary" />
              Suivi de la commande
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 pt-0">
            <div className="space-y-0">
              {timeline.map((step, i) => (
                <div key={i} className="flex gap-3">
                  {/* Vertical line + dot */}
                  <div className="flex flex-col items-center">
                    <div className={`w-3 h-3 rounded-full flex-shrink-0 ${step.done ? "bg-primary" : "bg-muted-foreground/20"}`} />
                    {i < timeline.length - 1 && (
                      <div className={`w-0.5 flex-1 min-h-[24px] ${step.done ? "bg-primary/40" : "bg-muted-foreground/10"}`} />
                    )}
                  </div>
                  <div className="pb-4">
                    <p className={`text-xs font-medium ${step.done ? "text-foreground" : "text-muted-foreground"}`}>
                      {step.label}
                    </p>
                    {step.date && (
                      <p className="text-[10px] text-muted-foreground">
                        {new Date(step.date).toLocaleDateString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Live tracking map or no-driver info */}
            {delivery && delivery.status !== "delivered" ? (
              <div className="mt-3 space-y-2">
                <DeliveryLiveMap
                  deliveryId={delivery.id}
                  pickupLat={delivery.pickup_lat}
                  pickupLng={delivery.pickup_lng}
                  dropoffLat={delivery.dropoff_lat}
                  dropoffLng={delivery.dropoff_lng}
                  pickupAddress={delivery.pickup_address}
                  dropoffAddress={delivery.dropoff_address}
                  driverCurrentLat={delivery.driver_current_lat}
                  driverCurrentLng={delivery.driver_current_lng}
                />
                {delivery.estimated_minutes && (
                  <p className="text-xs text-muted-foreground text-center">
                    ⏱ Temps estimé : ~{delivery.estimated_minutes} min
                  </p>
                )}
              </div>
            ) : !delivery ? (
              <div className="mt-3 p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Package className="w-3.5 h-3.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-foreground">Sans livreur assigné</p>
                    <p>Cette commande est en retrait sur place. Contactez le vendeur pour organiser la récupération.</p>
                  </div>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>

        {/* Payment Summary */}
        <Card>
          <CardHeader className="p-3 sm:p-4 pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Receipt className="w-4 h-4 text-primary" />
              Récapitulatif
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 pt-0 space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Sous-total</span>
              <span>{formatPrice(Number(order.total_price))}</span>
            </div>
            {deliveryFee > 0 && (
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Livraison</span>
                <span>{formatPrice(deliveryFee)}</span>
              </div>
            )}
            <Separator />
            <div className="flex justify-between text-sm font-bold">
              <span>Total payé</span>
              <span className="text-primary">{formatPrice(grandTotal)}</span>
            </div>

            {/* Payment method */}
            <div className="flex items-center gap-2 pt-2 text-xs text-muted-foreground">
              <CreditCard className="w-3.5 h-3.5" />
              <span>
                {(order.notes || "").includes("Paiement:")
                  ? (order.notes || "").split(" | ").find((n: string) => n.startsWith("Paiement:"))?.replace("Paiement: ", "")
                  : "Mobile Money"}
              </span>
            </div>

            {/* Transaction reference */}
            {(() => {
              const txRef = (order.notes || "").split(" | ").find((n: string) => n.startsWith("tx_ref:"))?.replace("tx_ref: ", "");
              return txRef ? (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Receipt className="w-3.5 h-3.5" />
                  <span>Réf. transaction : <span className="font-mono text-foreground">{txRef}</span></span>
                </div>
              ) : null;
            })()}

            {/* Payment status indicator */}
            <div className="flex items-center gap-2 text-xs mt-1">
              {order.status === "confirmed" || order.status === "completed" ? (
                <Badge className="bg-green-100 text-green-700 border-0 text-[10px] gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Paiement confirmé
                </Badge>
              ) : order.status === "cancelled" ? (
                <Badge className="bg-red-100 text-red-700 border-0 text-[10px] gap-1">
                  <XCircle className="w-3 h-3" /> Paiement échoué
                </Badge>
              ) : (
                <Badge className="bg-yellow-100 text-yellow-700 border-0 text-[10px] gap-1">
                  <Clock className="w-3 h-3" /> En attente de paiement
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex gap-3">
          <Button variant="outline" className="flex-1 gap-2 text-xs h-10" onClick={handleDownloadInvoice}>
            <FileDown className="w-4 h-4" /> Télécharger la facture
          </Button>
          <Link to="/marketplace" className="flex-1">
            <Button variant="hero" className="w-full gap-2 text-xs h-10">
              <ShoppingBag className="w-4 h-4" /> Commander à nouveau
            </Button>
          </Link>
        </div>
      </main>
      <Footer />
      <MobileBottomNav />
    </div>
  );
};

export default OrderDetail;