import SEO from "@/components/SEO";
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import MobileBottomNav from "@/components/layout/MobileBottomNav";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useCart } from "@/components/cart/CartContext";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { useProfile } from "@/contexts/ProfileContext";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, CheckCircle2, Loader2, LogIn, MapPin, ShoppingCart } from "lucide-react";
import { deliveryOptions, type DeliveryDistanceInfo } from "@/components/cart/DeliveryZoneMap";
import { openSolimiPay } from "@/lib/solimi";
import { PaymentStatusPanel } from "@/components/payments/PaymentStatusPanel";
import { PaymentStatus } from "@/lib/paymentStatus";
import { generateOrderInvoice } from "@/utils/generateInvoicePDF";

const BillingForm = lazy(() => import("@/components/cart/BillingForm"));
const DeliveryZoneMap = lazy(() => import("@/components/cart/DeliveryZoneMap"));
const AvailableDrivers = lazy(() => import("@/components/checkout/AvailableDrivers"));
const AddressSelector = lazy(() => import("@/components/checkout/AddressSelector"));
const OrderSummary = lazy(() => import("@/components/cart/OrderSummary"));

const CHECKOUT_FORM_KEY = "nuku:checkoutForm";
const CART_RETURN_KEY = "nuku:cartReturn";

const readSavedCheckoutForm = () => {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(CHECKOUT_FORM_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const isValidUUID = (value?: string) =>
  !!value && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

const cleanPhone = (phone: string) => phone.replace(/[^\d]/g, "").replace(/^228/, "");

const LoadingCard = () => (
  <Card>
    <CardContent className="p-4 flex items-center gap-2 text-sm text-muted-foreground">
      <Loader2 className="w-4 h-4 animate-spin text-primary" /> Chargement…
    </CardContent>
  </Card>
);

const Cart = () => {
  const { items, clearCart, total, itemCount } = useCart();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { t, formatPrice } = useLanguage();
  const { user, profile, isReady: authReady } = useProfile();
  const savedCheckoutForm = readSavedCheckoutForm();
  const hasSavedCheckoutFormRef = useRef(!!savedCheckoutForm);

  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [billing, setBilling] = useState({
    firstName: savedCheckoutForm?.billing?.firstName || "",
    lastName: savedCheckoutForm?.billing?.lastName || "",
    email: savedCheckoutForm?.billing?.email || "",
    phone: savedCheckoutForm?.billing?.phone || "",
    company: savedCheckoutForm?.billing?.company || "",
    country: savedCheckoutForm?.billing?.country || "Togo",
  });
  const [deliveryMethod, setDeliveryMethod] = useState(savedCheckoutForm?.deliveryMethod || "livreur");
  const [deliveryCity, setDeliveryCity] = useState(savedCheckoutForm?.deliveryCity || "");
  const [deliveryAddress, setDeliveryAddress] = useState(savedCheckoutForm?.deliveryAddress || "");
  const [deliveryQuarter, setDeliveryQuarter] = useState(savedCheckoutForm?.deliveryQuarter || "");
  const [mobileNumber, setMobileNumber] = useState(savedCheckoutForm?.mobileNumber || savedCheckoutForm?.billing?.phone || "");
  const [promoDiscount, setPromoDiscount] = useState(0);
  const [promoCode, setPromoCode] = useState("");
  const [selectedAddress, setSelectedAddress] = useState<any>(null);
  const [selectedDriver, setSelectedDriver] = useState<any>(null);
  const [dynamicDeliveryPrice, setDynamicDeliveryPrice] = useState(0);
  const [deliveryDistanceInfo, setDeliveryDistanceInfo] = useState<DeliveryDistanceInfo | null>(null);
  const [paymentIdentifier, setPaymentIdentifier] = useState("");
  const [payStatus, setPayStatus] = useState<PaymentStatus>({ kind: "idle" });
  const [verifyingPay, setVerifyingPay] = useState(false);
  const [contactingSupport, setContactingSupport] = useState(false);
  const pendingCheckoutRef = useRef<any>(null);

  const selectedDelivery = deliveryOptions.find((d) => d.id === deliveryMethod);
  const deliveryPrice = dynamicDeliveryPrice || selectedDelivery?.price || 0;
  const finalTotal = Math.max(0, total + deliveryPrice - promoDiscount);
  const fullAddress = [deliveryQuarter, deliveryAddress].filter(Boolean).join(", ");
  const buyerFullName = `${billing.firstName} ${billing.lastName}`.trim();
  const canCheckout = itemCount > 0 && finalTotal > 0 && authReady && !isCheckingOut;

  useEffect(() => {
    if (!authReady || !user) return;
    setBilling((prev) => ({ ...prev, email: prev.email || user.email || "" }));
  }, [authReady, user]);

  useEffect(() => {
    if (!profile) return;
    const parts = (profile.full_name || "").split(" ").filter(Boolean);
    setBilling((prev) => ({
      ...prev,
      firstName: prev.firstName || parts[0] || "",
      lastName: prev.lastName || parts.slice(1).join(" ") || "",
    }));
    if (profile.location && !hasSavedCheckoutFormRef.current) setDeliveryCity((prev) => prev || profile.location);
  }, [profile]);

  useEffect(() => {
    if (!user?.id || billing.phone) return;
    supabase
      .from("profile_private")
      .select("phone")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        const phone = data?.phone || "";
        if (!phone) return;
        setBilling((prev) => ({ ...prev, phone: prev.phone || phone }));
        if (!hasSavedCheckoutFormRef.current) setMobileNumber((prev) => prev || phone);
      });
  }, [user?.id, billing.phone]);

  useEffect(() => {
    try {
      localStorage.setItem(
        CHECKOUT_FORM_KEY,
        JSON.stringify({ billing, deliveryMethod, deliveryCity, deliveryAddress, deliveryQuarter, mobileNumber: mobileNumber || billing.phone }),
      );
    } catch {
      // ignore
    }
  }, [billing, deliveryMethod, deliveryCity, deliveryAddress, deliveryQuarter, mobileNumber]);

  const markOrdersFailed = useCallback(async (orderIds: string[], reason: string) => {
    if (!orderIds.length) return;
    await supabase.from("orders").update({ status: "cancelled", notes: reason }).in("id", orderIds).eq("status", "pending");
  }, []);

  const finalizeLocalSuccess = useCallback((orderIds: string[], paymentId: string) => {
    try {
      generateOrderInvoice(
        items,
        total,
        deliveryPrice,
        finalTotal,
        selectedDelivery?.name || "",
        "SOLIMI",
        buyerFullName,
        billing.phone,
        deliveryCity,
        fullAddress,
        mobileNumber,
      );
    } catch (error) {
      console.error("PDF generation error:", error);
    }

    setPayStatus({
      kind: "success",
      message: "Paiement confirmé. La commande, le crédit vendeur et le suivi de livraison ont été finalisés.",
      details: { invoiceNumber: paymentId, amount: finalTotal, method: "SOLIMI", orderIds },
    });
    toast({ title: "✅ Paiement confirmé", description: "Commande finalisée et traçabilité créée." });
    // Règle panier: on ne vide le panier qu'après confirmation explicite du paiement.
    // Aucun échec, annulation, navigation ou rafraîchissement ne doit retirer les articles.
    clearCart();
    navigate(orderIds.length === 1 ? `/commande/${orderIds[0]}` : "/suivi-livraison");
  }, [billing.phone, buyerFullName, clearCart, deliveryCity, deliveryPrice, finalTotal, fullAddress, items, mobileNumber, navigate, selectedDelivery?.name, toast, total]);

  const handleCheckout = async () => {
    if (!authReady) return;
    if (!user) {
      try {
        localStorage.setItem(CHECKOUT_FORM_KEY, JSON.stringify({ billing, deliveryMethod, deliveryCity, deliveryAddress, deliveryQuarter, mobileNumber: mobileNumber || billing.phone }));
        localStorage.setItem(CART_RETURN_KEY, "/panier");
      } catch {
        // ignore
      }
      toast({ title: t("cart.loginRequired"), description: t("cart.loginRequiredDesc"), variant: "destructive" });
      navigate(`/auth?returnTo=${encodeURIComponent("/panier")}`);
      return;
    }

    if (!billing.firstName.trim() || !billing.lastName.trim() || !billing.phone.trim()) {
      toast({ title: "Informations manquantes", description: "Renseignez prénom, nom et téléphone.", variant: "destructive" });
      return;
    }
    if (deliveryMethod !== "pickup" && (!deliveryCity || !deliveryAddress.trim())) {
      toast({ title: t("cart.addressRequired"), description: "Sélectionnez une ville et une adresse de livraison.", variant: "destructive" });
      return;
    }

    const realItems = items.filter((item) => isValidUUID(item.product.id) && isValidUUID(item.product.producer.id));
    if (!realItems.length) {
      toast({ title: "Produit indisponible", description: "Aucun produit réel ne peut être commandé dans ce panier.", variant: "destructive" });
      return;
    }

    setIsCheckingOut(true);
    setPayStatus({ kind: "initiating", message: "Préparation de votre paiement sécurisé…" });
    const identifier = `NUKU-${Date.now()}`;
    const orderIds: string[] = [];

    try {
      let buyerProfileId = profile?.id;
      if (!buyerProfileId) {
        const { data: ensuredId } = await supabase.rpc("ensure_my_profile" as any);
        buyerProfileId = (ensuredId as string) || undefined;
      }
      if (!buyerProfileId) throw new Error("Profil acheteur introuvable. Rechargez la page puis réessayez.");

      for (const item of realItems) {
        const { data, error } = await supabase
          .from("orders")
          .insert({
            buyer_id: buyerProfileId,
            seller_id: item.product.producer.id,
            product_id: item.product.id,
            quantity: item.quantity,
            total_price: item.product.price * item.quantity,
            status: "pending",
            delivery_method: deliveryMethod,
            notes: [
              `Client: ${buyerFullName} | ${billing.phone}`,
              deliveryMethod !== "pickup" ? `Livraison: ${selectedDelivery?.name || "Livreur NukuConnect"} - ${deliveryCity}, ${fullAddress}` : "Retrait sur place",
              `Paiement: SOLIMI`,
              `tx_ref: ${identifier}`,
            ].join(" | "),
          } as any)
          .select("id")
          .single();
        if (error) throw error;
        if (data?.id) orderIds.push(data.id);
      }

      pendingCheckoutRef.current = { orderIds, identifier };
      setPaymentIdentifier(identifier);

      const opened = await openSolimiPay({
        amount: finalTotal,
        description: `Commande NUKUCONNECT - ${identifier}`,
        customer: {
          first_name: billing.firstName,
          last_name: billing.lastName,
          phone: cleanPhone(mobileNumber || billing.phone),
          email: billing.email || user.email || "",
        },
        context: "cart",
        contextData: {
          orderIds,
          orderIdsCsv: orderIds.join(","),
          txRef: identifier,
          deliveryMethod,
          deliveryCity,
          deliveryAddress: fullAddress,
          deliveryPrice,
          distanceKm: deliveryDistanceInfo?.maxDistance ?? null,
          selectedDriverId: selectedDriver && !String(selectedDriver.id).startsWith("demo-") ? selectedDriver.id : null,
          buyerFullName,
          buyerPhone: billing.phone,
          buyerEmail: billing.email || user.email || "",
        },
        onError: (msg) => {
          setPayStatus({ kind: "failed", message: msg });
          toast({ title: "❌ Erreur de paiement", description: msg, variant: "destructive" });
        },
      });

      const pendingPayment = (() => {
        try {
          const raw = sessionStorage.getItem("nuku:pendingPayment") || localStorage.getItem("nuku:pendingPayment");
          return raw ? JSON.parse(raw) : null;
        } catch {
          return null;
        }
      })();
      if (pendingPayment?.paymentId) {
        pendingCheckoutRef.current = { ...pendingCheckoutRef.current, paymentId: pendingPayment.paymentId };
      }

      if (!opened) {
        await markOrdersFailed(orderIds, `Initialisation SOLIMI échouée | tx_ref: ${identifier}`);
        setIsCheckingOut(false);
        return;
      }

      setPayStatus({ kind: "pending", message: "Redirection vers SOLIMI. Validez le paiement puis revenez automatiquement sur NukuConnect." });
    } catch (error: any) {
      console.error("Checkout error:", error);
      if (orderIds.length) await markOrdersFailed(orderIds, `Erreur checkout: ${error?.message || "inconnue"} | tx_ref: ${identifier}`);
      setIsCheckingOut(false);
      setPayStatus({ kind: "failed", message: error?.message || "Impossible d'initier le paiement. Aucun montant n'a été débité." });
      toast({ title: t("common.error"), description: error?.message || "Erreur checkout", variant: "destructive" });
    }
  };

  const handleVerifyNow = useCallback(async () => {
    const paymentId = pendingCheckoutRef.current?.paymentId;
    if (!paymentId) return;
    setVerifyingPay(true);
    try {
      const { data, error } = await supabase.functions.invoke("solimi-verify", { body: { payment_id: paymentId } });
      if (error) throw error;
      const result = data as any;
      if (result?.status === "success") finalizeLocalSuccess(result?.transaction?.context_data?.orderIds || pendingCheckoutRef.current?.orderIds || [], paymentId);
    } catch (error: any) {
      toast({ title: "Vérification impossible", description: error?.message || "Réessayez dans un instant.", variant: "destructive" });
    } finally {
      setVerifyingPay(false);
    }
  }, [finalizeLocalSuccess, toast]);

  const handleContactSupport = useCallback(async () => {
    setContactingSupport(true);
    try {
      await supabase.functions.invoke("report-payment-mismatch", { body: { identifier: paymentIdentifier, observed_state: payStatus.kind } });
      toast({ title: "Support contacté", description: "Un agent vérifiera la transaction." });
    } catch (error: any) {
      toast({ title: "Échec de l'envoi", description: error?.message || "Réessayez.", variant: "destructive" });
    } finally {
      setContactingSupport(false);
    }
  }, [paymentIdentifier, payStatus.kind, toast]);

  const handleSelectAddress = (address: any) => {
    setSelectedAddress(address);
    if (address.city) setDeliveryCity(address.city);
    if (address.quarter) setDeliveryQuarter(address.quarter);
    setDeliveryAddress([address.street, address.country].filter(Boolean).join(", ") || address.label || deliveryAddress);
    if (address.phone) setBilling((prev) => ({ ...prev, phone: prev.phone || address.phone }));
  };

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-background pb-14 lg:pb-0">
        <SEO url="/cart" title="Panier" description="Consultez votre panier d'achats sur NukuConnect." noIndex />
        <Header />
        <main className="container mx-auto px-4 py-12 text-center">
          <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center mx-auto mb-6">
            <ShoppingCart className="w-10 h-10 text-muted-foreground" />
          </div>
          <h1 className="font-heading text-2xl font-bold text-foreground mb-2">{t("cart.empty")}</h1>
          <p className="text-muted-foreground mb-6">{t("cart.emptyDesc")}</p>
          <Link to="/marketplace"><Button variant="hero">{t("cart.explore")}</Button></Link>
        </main>
        <Footer />
        <MobileBottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 lg:pb-0 overflow-x-clip w-full max-w-[100vw]">
      <SEO url="/cart" title="Panier" description="Finalisez vos commandes de produits agricoles frais sur NukuConnect." noIndex />
      <Header />
      <div className="bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 py-2.5 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <p className="text-xs sm:text-sm"><Link to="/marketplace" className="underline font-medium">Poursuivre les achats</Link> — {itemCount} article{itemCount > 1 ? "s" : ""} dans votre panier</p>
        </div>
      </div>

      <main>
        <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 max-w-full overflow-x-clip">
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4 transition-colors text-sm">
            <ArrowLeft className="w-4 h-4" /><span>Retour</span>
          </button>

          {authReady && !user && (
            <Card className="mb-4 border-accent">
              <CardContent className="p-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <LogIn className="w-5 h-5 text-accent flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="font-medium text-sm">Déjà client ?</p>
                    <p className="text-xs text-muted-foreground">Connectez-vous pour finaliser sans perdre le panier.</p>
                  </div>
                </div>
                <Link to="/auth?returnTo=/panier"><Button variant="hero" size="sm">Se connecter</Button></Link>
              </CardContent>
            </Card>
          )}

          <div className="mb-4">
            <PaymentStatusPanel
              status={payStatus}
              onVerifyNow={paymentIdentifier ? handleVerifyNow : undefined}
              isVerifying={verifyingPay}
              onContactSupport={handleContactSupport}
              isContactingSupport={contactingSupport}
              onRetry={() => setPayStatus({ kind: "idle" })}
            />
          </div>

          <div className="grid lg:grid-cols-3 gap-4 sm:gap-6">
            <div className="lg:col-span-2 space-y-3 sm:space-y-4 min-w-0">
              <Suspense fallback={<LoadingCard />}>
                <BillingForm data={billing} onChange={setBilling} />
                <AddressSelector onSelect={handleSelectAddress} selectedId={selectedAddress?.id} />
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
                  onDistanceInfoChange={setDeliveryDistanceInfo}
                />

                {deliveryMethod === "livreur" && (
                  <Card className="border-muted">
                    <CardContent className="p-3">
                      <h4 className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-primary" /> Distance fournisseur — acheteur
                      </h4>
                      <div className="space-y-1.5">
                        {items.map((item) => {
                          const sellerLoc = item.product.location || "Non définie";
                          const distance = deliveryDistanceInfo?.sellerDistances.find((d) => d.location === sellerLoc)?.distanceKm;
                          return (
                            <div key={item.product.id} className="flex justify-between gap-2 text-[11px] sm:text-xs rounded-md bg-muted/40 px-2 py-1.5">
                              <span className="truncate">{item.product.name}</span>
                              <span className="font-medium whitespace-nowrap">{distance ? `${distance.toFixed(1)} km` : "Calcul…"}</span>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {deliveryMethod === "livreur" && (
                  <AvailableDrivers
                    city={deliveryCity}
                    distanceKm={deliveryDistanceInfo?.maxDistance || null}
                    cartItems={items.map((item) => ({ id: item.product.id, name: item.product.name, quantity: item.quantity, price: item.product.price }))}
                    onSelectDriver={setSelectedDriver}
                    selectedDriverId={selectedDriver?.id}
                  />
                )}
              </Suspense>
            </div>

            <div className="lg:col-span-1 min-w-0">
              <Suspense fallback={<LoadingCard />}>
                <OrderSummary
                  deliveryPrice={deliveryPrice}
                  isCheckingOut={isCheckingOut}
                  canCheckout={canCheckout}
                  onCheckout={handleCheckout}
                  onDiscountChange={(discount, code) => { setPromoDiscount(discount); setPromoCode(code); }}
                />
              </Suspense>
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