import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import MobileBottomNav from "@/components/layout/MobileBottomNav";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useCart } from "@/components/cart/CartContext";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { ShoppingCart, ArrowLeft, LogIn, CheckCircle2 } from "lucide-react";
import { generateOrderInvoice } from "@/utils/generateInvoicePDF";
import BillingForm from "@/components/cart/BillingForm";
import DeliveryZoneMap, { deliveryOptions, buildDeliveryOptions } from "@/components/cart/DeliveryZoneMap";
import PaymentMethodSelect, { paymentMethods } from "@/components/cart/PaymentMethodSelect";
import AvailableDrivers from "@/components/checkout/AvailableDrivers";
import AddressSelector from "@/components/checkout/AddressSelector";
import OrderSummary from "@/components/cart/OrderSummary";

const Cart = () => {
  const { items, clearCart, total, itemCount } = useCart();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { t, formatPrice } = useLanguage();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  // Billing
  const [billing, setBilling] = useState({
    firstName: "", lastName: "", email: "", phone: "", company: "", country: "Togo",
  });

  // Delivery
  const [deliveryMethod, setDeliveryMethod] = useState("pickup");
  const [deliveryCity, setDeliveryCity] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [deliveryQuarter, setDeliveryQuarter] = useState("");

  // Payment
  const [paymentMethod, setPaymentMethod] = useState("mobile_money");
  const [mobileNumber, setMobileNumber] = useState("");

  // Promo
  const [promoDiscount, setPromoDiscount] = useState(0);
  const [promoCode, setPromoCode] = useState("");

  // Saved address
  const [selectedAddress, setSelectedAddress] = useState<any>(null);

  // Load user profile and auto-fill billing
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        // Auto-fill email from auth
        setBilling(prev => ({ ...prev, email: session.user.email || "" }));

        supabase.from("profiles").select("*").eq("user_id", session.user.id).single()
          .then(({ data }) => {
            if (data) {
              setProfile(data);
              const nameParts = (data.full_name || "").split(" ");
              setBilling(prev => ({
                ...prev,
                firstName: nameParts[0] || "",
                lastName: nameParts.slice(1).join(" ") || "",
                phone: data.phone || "",
              }));
              // Auto-fill delivery city from profile location
              if (data.location) {
                setDeliveryCity(data.location);
              }
              // Auto-fill mobile number for payment
              if (data.phone) {
                setMobileNumber(data.phone);
              }
            }
          });
      }
    });
  }, []);

  const [dynamicDeliveryPrice, setDynamicDeliveryPrice] = useState(0);
  const selectedDelivery = deliveryOptions.find(d => d.id === deliveryMethod);
  const deliveryPrice = dynamicDeliveryPrice || selectedDelivery?.price || 0;
  const finalTotal = total + deliveryPrice - promoDiscount;

  const handleCheckout = async () => {
    if (!user) {
      toast({ title: t("cart.loginRequired"), description: t("cart.loginRequiredDesc"), variant: "destructive" });
      navigate("/auth");
      return;
    }

    // Validate billing
    if (!billing.firstName.trim() || !billing.lastName.trim() || !billing.phone.trim()) {
      toast({ title: "Informations manquantes", description: "Veuillez remplir vos détails de facturation (prénom, nom, téléphone).", variant: "destructive" });
      return;
    }

    // Validate delivery address
    if (deliveryMethod !== "pickup" && (!deliveryAddress.trim() || !deliveryCity)) {
      toast({ title: t("cart.addressRequired"), description: "Veuillez sélectionner une ville et entrer votre adresse de livraison.", variant: "destructive" });
      return;
    }

    // Validate mobile payment number
    if ((paymentMethod === "mobile_money" || paymentMethod === "wave") && !mobileNumber.trim()) {
      toast({ title: "Numéro requis", description: "Veuillez entrer votre numéro de téléphone pour le paiement mobile.", variant: "destructive" });
      return;
    }

    setIsCheckingOut(true);
    try {
      const { data: buyerProfile } = await supabase
        .from("profiles").select("id").eq("user_id", user.id).single();

      if (!buyerProfile) throw new Error("Profile not found");

      const selectedPayment = paymentMethods.find(p => p.id === paymentMethod);
      const fullAddress = [deliveryQuarter, deliveryAddress].filter(Boolean).join(", ");
      const buyerFullName = `${billing.firstName} ${billing.lastName}`.trim();

      const isValidUUID = (s: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
      const hasRealProducts = items.some(item => isValidUUID(item.product.id) && isValidUUID(item.product.producer.id));

      if (!hasRealProducts) {
        generateOrderInvoice(items, total, deliveryPrice, finalTotal, selectedDelivery?.name || "", selectedPayment?.name || "", buyerFullName, billing.phone, deliveryCity, fullAddress, mobileNumber);
        toast({ title: t("cart.orderSent"), description: t("cart.orderSentDesc") });
        clearCart();
        navigate("/suivi-livraison");
        setIsCheckingOut(false);
        return;
      }

      const orderIds: string[] = [];
      for (const item of items) {
        const sellerId = item.product.producer.id;
        const productId = item.product.id;
        if (!isValidUUID(productId) || !isValidUUID(sellerId)) continue;

        const { data: orderData, error } = await supabase.from("orders").insert({
          buyer_id: buyerProfile.id,
          seller_id: sellerId,
          product_id: productId,
          quantity: item.quantity,
          total_price: item.product.price * item.quantity,
          status: "pending",
          notes: [
            `Client: ${buyerFullName} | ${billing.phone}`,
            deliveryMethod !== "pickup" ? `Livraison: ${selectedDelivery?.name} - ${deliveryCity}, ${fullAddress}` : "Retrait sur place",
            `Paiement: ${selectedPayment?.name}`,
            mobileNumber ? `Tél paiement: ${mobileNumber}` : "",
          ].filter(Boolean).join(" | "),
        }).select("id").single();

        if (error) throw error;
        if (orderData) orderIds.push(orderData.id);
      }

      // Create delivery records if delivery method is not pickup
      if (deliveryMethod !== "pickup" && orderIds.length > 0) {
        const driverFee = Math.round(deliveryPrice * 0.8);
        const platformFee = deliveryPrice - driverFee;
        
        for (const orderId of orderIds) {
          await supabase.from("deliveries" as any).insert({
            order_id: orderId,
            dropoff_address: `${deliveryCity}, ${fullAddress}`,
            delivery_fee: deliveryPrice,
            driver_fee: driverFee,
            platform_fee: platformFee,
            distance_km: dynamicDeliveryPrice > 0 ? (dynamicDeliveryPrice / 100) : null,
            estimated_minutes: dynamicDeliveryPrice > 0 ? Math.round((dynamicDeliveryPrice / 100) * 5) : null,
            status: "pending",
          });
        }
      }

      generateOrderInvoice(items, total, deliveryPrice, finalTotal, selectedDelivery?.name || "", selectedPayment?.name || "", buyerFullName, billing.phone, deliveryCity, fullAddress, mobileNumber);

      // Send confirmation email (fire & forget)
      const now = new Date();
      const invoiceNumber = `NK-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}-${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}${String(now.getSeconds()).padStart(2, "0")}`;
      supabase.functions.invoke("order-confirmation", {
        body: {
          buyerEmail: billing.email,
          buyerName: buyerFullName,
          orderItems: items.map(item => ({
            name: item.product.name,
            quantity: item.quantity,
            unitPrice: item.product.price,
            unit: item.product.unit,
            sellerName: item.product.producer.name,
          })),
          subtotal: total,
          deliveryPrice,
          total: finalTotal,
          deliveryMethod: selectedDelivery?.name || "Retrait",
          paymentMethod: selectedPayment?.name || "Mobile Money",
          deliveryCity,
          deliveryAddress: fullAddress,
          invoiceNumber,
          orderDate: now.toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" }),
        },
      }).catch(err => console.error("Email confirmation error:", err));

      toast({ title: t("cart.orderSent"), description: "Commande enregistrée ! Un email de confirmation vous sera envoyé." });
      clearCart();
      navigate("/suivi-livraison");
    } catch (error: any) {
      console.error("Checkout error:", error);
      toast({ title: t("common.error"), description: error.message, variant: "destructive" });
    } finally {
      setIsCheckingOut(false);
    }
  };

  // Empty cart
  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-background pb-14 lg:pb-0">
        <Header />
        <main>
          <div className="container mx-auto px-4 py-12">
            <div className="text-center">
              <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center mx-auto mb-6">
                <ShoppingCart className="w-10 h-10 text-muted-foreground" />
              </div>
              <h1 className="font-heading text-2xl font-bold text-foreground mb-2">{t("cart.empty")}</h1>
              <p className="text-muted-foreground mb-6">{t("cart.emptyDesc")}</p>
              <Link to="/marketplace">
                <Button variant="hero">{t("cart.explore")}</Button>
              </Link>
            </div>
          </div>
        </main>
        <Footer />
        <MobileBottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-14 lg:pb-0">
      <Header />

      {/* Success banner */}
      <div className="bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 py-2.5 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <p className="text-xs sm:text-sm">
            <Link to="/marketplace" className="underline font-medium">Poursuivre les achats</Link>
            {" — "}{itemCount} article{itemCount > 1 ? "s" : ""} dans votre panier
          </p>
        </div>
      </div>

      <main>
        <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6">
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4 transition-colors text-sm">
            <ArrowLeft className="w-4 h-4" /><span>Retour</span>
          </button>

          {!user && (
            <Card className="mb-4 border-accent">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <LogIn className="w-5 h-5 text-accent" />
                  <div>
                    <p className="font-medium text-sm">Déjà client ?</p>
                    <p className="text-xs text-muted-foreground">Connectez-vous pour pré-remplir vos informations</p>
                  </div>
                </div>
                <Link to="/auth">
                  <Button variant="hero" size="sm">Se connecter</Button>
                </Link>
              </CardContent>
            </Card>
          )}

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Left: Billing + Delivery + Payment */}
            <div className="lg:col-span-2 space-y-4">
              <BillingForm data={billing} onChange={setBilling} />

              <DeliveryZoneMap
                deliveryMethod={deliveryMethod}
                onDeliveryMethodChange={setDeliveryMethod}
                city={deliveryCity}
                onCityChange={setDeliveryCity}
                address={deliveryAddress}
                onAddressChange={setDeliveryAddress}
                quarter={deliveryQuarter}
                onQuarterChange={setDeliveryQuarter}
                onDynamicPriceChange={setDynamicDeliveryPrice}
              />

              {/* Saved address selector */}
              {deliveryMethod !== "pickup" && (
                <AddressSelector
                  selectedId={selectedAddress?.id}
                  onSelect={(addr) => {
                    setSelectedAddress(addr);
                    if (addr.city) setDeliveryCity(addr.city);
                    if (addr.street) setDeliveryAddress(addr.street);
                    if (addr.quarter) setDeliveryQuarter(addr.quarter);
                  }}
                />
              )}

              {/* Available drivers */}
              {deliveryMethod !== "pickup" && (
                <AvailableDrivers 
                  city={deliveryCity} 
                  distanceKm={dynamicDeliveryPrice > 0 ? (dynamicDeliveryPrice / 100) : null}
                  cartItems={items.map(item => ({ name: item.product.name, id: item.product.id, quantity: item.quantity, price: item.product.price }))}
                />
              )}

              <PaymentMethodSelect
                paymentMethod={paymentMethod}
                onPaymentMethodChange={setPaymentMethod}
                mobileNumber={mobileNumber}
                onMobileNumberChange={setMobileNumber}
              />
            </div>

            {/* Right: Order Summary */}
            <div className="lg:col-span-1">
              <OrderSummary
                deliveryPrice={deliveryPrice}
                isCheckingOut={isCheckingOut}
                canCheckout={!!user}
                onCheckout={handleCheckout}
                onDiscountChange={(discount, code) => { setPromoDiscount(discount); setPromoCode(code); }}
              />
            </div>
          </div>
        </div>
      </main>
      <Footer />
      <MobileBottomNav />
    </div>
  );
};

export default Cart;
