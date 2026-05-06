import SEO from "@/components/SEO";
import { useState, useEffect, useCallback, useRef, lazy, Suspense } from "react";
import { Link, useNavigate } from "react-router-dom";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import MobileBottomNav from "@/components/layout/MobileBottomNav";
// TrustBadges est désormais rendu globalement dans <Footer />, ne pas l'importer ici.
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useCart } from "@/components/cart/CartContext";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { ShoppingCart, ArrowLeft, LogIn, CheckCircle2, MapPin, Loader2 } from "lucide-react";
import { generateOrderInvoice } from "@/utils/generateInvoicePDF";
import { paymentMethods } from "@/components/cart/PaymentMethodSelect";
import { deliveryOptions, buildDeliveryOptions } from "@/components/cart/DeliveryZoneMap";
import { openKKiaPay } from "@/lib/kkiapay";
import { PaymentStatusPanel } from "@/components/payments/PaymentStatusPanel";
import { PaymentStatus, PAYMENT_STATUS_DEFAULT_MESSAGES, mapBackendStateToKind } from "@/lib/paymentStatus";

const BillingForm = lazy(() => import("@/components/cart/BillingForm"));
const DeliveryZoneMap = lazy(() => import("@/components/cart/DeliveryZoneMap"));
const PaymentMethodSelect = lazy(() => import("@/components/cart/PaymentMethodSelect"));
const AvailableDrivers = lazy(() => import("@/components/checkout/AvailableDrivers"));
const AddressSelector = lazy(() => import("@/components/checkout/AddressSelector"));
const OrderSummary = lazy(() => import("@/components/cart/OrderSummary"));

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
  const [addressAutoFilled, setAddressAutoFilled] = useState(false);

  // Payment
  const [paymentMethod, setPaymentMethod] = useState("paygate");
  const [mobileNumber, setMobileNumber] = useState("");
  const [showPaymentStep, setShowPaymentStep] = useState(false);
  const [selectedNetwork, setSelectedNetwork] = useState("");

  // Promo
  const [promoDiscount, setPromoDiscount] = useState(0);
  const [promoCode, setPromoCode] = useState("");

  // Saved address
  const [selectedAddress, setSelectedAddress] = useState<any>(null);
  const [selectedDriver, setSelectedDriver] = useState<any>(null);

  // Paygate polling state
  const [paymentIdentifier, setPaymentIdentifier] = useState("");
  const [pollingEnabled, setPollingEnabled] = useState(false);
  const [pendingCheckoutData, setPendingCheckoutData] = useState<any>(null);
  const pendingCheckoutRef = useRef<any>(null);

  // Persistent payment status panel (shared model with FormationDetail)
  const [payStatus, setPayStatus] = useState<PaymentStatus>({ kind: "idle" });
  const [verifyingPay, setVerifyingPay] = useState(false);
  const [contactingSupport, setContactingSupport] = useState(false);

  // Load user profile and auto-fill billing
  const fillBillingFromUser = async (sessionUser: any) => {
    setBilling(prev => ({ ...prev, email: sessionUser.email || "" }));
    const { data } = await supabase.from("profiles").select("*").eq("user_id", sessionUser.id).single();
    if (data) {
      setProfile(data);
      const nameParts = (data.full_name || "").split(" ");
      const { data: privateData } = await supabase.from("profile_private").select("phone").eq("user_id", sessionUser.id).maybeSingle();
      const phone = privateData?.phone || "";
      setBilling(prev => ({
        ...prev,
        firstName: nameParts[0] || "",
        lastName: nameParts.slice(1).join(" ") || "",
        phone,
      }));
      if (data.location) setDeliveryCity(data.location);
      if (phone) setMobileNumber(phone);
    }
  };

  const filledRef = useRef(false);
  const filledForUserIdRef = useRef<string | null>(null);
  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      if (session?.user && !filledRef.current) {
        filledRef.current = true;
        filledForUserIdRef.current = session.user.id;
        await fillBillingFromUser(session.user);
      }
    };
    init();

    // Listen for auth changes - only auto-fill once per user.
    // Ignore TOKEN_REFRESHED, USER_UPDATED, INITIAL_SESSION to avoid wiping user input.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setUser(session?.user ?? null);
      if (event === "SIGNED_IN" && session?.user) {
        if (!filledRef.current || filledForUserIdRef.current !== session.user.id) {
          filledRef.current = true;
          filledForUserIdRef.current = session.user.id;
          await fillBillingFromUser(session.user);
        }
      }
      if (event === "SIGNED_OUT") {
        filledRef.current = false;
        filledForUserIdRef.current = null;
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  // Auto-scroll to payment section when "Payer" is clicked (showPaymentStep activated)
  useEffect(() => {
    if (showPaymentStep) {
      // Wait for lazy-loaded PaymentMethodSelect to mount
      const timer = setTimeout(() => {
        const el = document.getElementById("payment-section");
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [showPaymentStep]);

  const [dynamicDeliveryPrice, setDynamicDeliveryPrice] = useState(0);
  const selectedDelivery = deliveryOptions.find(d => d.id === deliveryMethod);
  const deliveryPrice = dynamicDeliveryPrice || selectedDelivery?.price || 0;
  const finalTotal = total + deliveryPrice - promoDiscount;

  // Strip phone to digits only for Paygate API
  const cleanPhone = (phone: string) => phone.replace(/[^\d]/g, "").replace(/^228/, "");

  // Finalize order after payment success
  const finalizeOrder = useCallback(async (checkoutData: any) => {
    try {
      const { buyerProfile, selectedPayment, fullAddress, buyerFullName, selectedRealDriverId, orderIds = [] } = checkoutData;
      const isValidUUID = (s: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
      const hasRealProducts = items.some(item => isValidUUID(item.product.id) && isValidUUID(item.product.producer.id));

      if (!hasRealProducts) {
        generateOrderInvoice(items, total, deliveryPrice, finalTotal, selectedDelivery?.name || "", selectedPayment?.name || "", buyerFullName, billing.phone, deliveryCity, fullAddress, mobileNumber);
        toast({ title: t("cart.orderSent"), description: t("cart.orderSentDesc") });
        clearCart();
        navigate("/suivi-livraison");
        return;
      }

      // Orders are already created with "pending" status before payment
      // Now update them to "confirmed" after successful payment
      for (const orderId of orderIds) {
        const { error } = await supabase.from("orders")
          .update({ 
            status: "confirmed",
            notes: `Paiement confirmé via polling | ${paymentIdentifier}`,
          })
          .eq("id", orderId)
          .eq("status", "pending"); // Only update if still pending (webhook may have already confirmed)
        
        if (error) {
          console.error("Order update error:", error);
        }
      }

      // Create delivery records
      if (deliveryMethod === "livreur" && orderIds.length > 0) {
        const driverFee = Math.round(deliveryPrice * 0.8);
        const platformFee = deliveryPrice - driverFee;

        for (const orderId of orderIds) {
          try {
            const deliveryInsert = await supabase.from("deliveries").insert({
              order_id: orderId,
              driver_id: selectedRealDriverId || null,
              dropoff_address: `${deliveryCity}, ${fullAddress}`,
              delivery_fee: deliveryPrice,
              driver_fee: driverFee,
              platform_fee: platformFee,
              distance_km: dynamicDeliveryPrice > 0 ? (dynamicDeliveryPrice / 100) : null,
              estimated_minutes: dynamicDeliveryPrice > 0 ? Math.round((dynamicDeliveryPrice / 100) * 5) : null,
              status: selectedRealDriverId ? "accepted" : "pending",
              accepted_at: selectedRealDriverId ? new Date().toISOString() : null,
            }).select("id").single();

            const deliveryData = deliveryInsert.data as unknown as { id: string } | null;

            if (deliveryData?.id) {
              const orderItemsSummary = items
                .map((cartItem) => `• ${cartItem.product.name} — ${cartItem.quantity} × ${cartItem.product.price.toLocaleString("en-US")} FCFA`)
                .join("\n");

              await supabase.from("delivery_messages").insert({
                delivery_id: deliveryData.id,
                sender_id: user.id,
                sender_role: "buyer",
                content: [
                  `Bonjour 👋, voici les détails de ma commande :`,
                  orderItemsSummary,
                  `Adresse : ${deliveryCity}, ${fullAddress}`,
                  `Mode de livraison : ${selectedDelivery?.name}`,
                  `Livreur demandé : ${selectedDriver?.profile?.full_name || "Attribution automatique"}`,
                ].join("\n"),
              } as any);

              // Send push notification to available drivers for pending deliveries
              if (!selectedRealDriverId) {
                try {
                  await supabase.functions.invoke("notify-drivers", {
                    body: {
                      delivery_id: deliveryData.id,
                      pickup_address: items[0]?.product?.location || "Collecte",
                      dropoff_address: `${deliveryCity}, ${fullAddress}`,
                      distance_km: dynamicDeliveryPrice > 0 ? (dynamicDeliveryPrice / 100) : undefined,
                      driver_fee: driverFee,
                    },
                  });
                } catch (pushErr) {
                  console.error("Driver push notification error (non-blocking):", pushErr);
                }
              }
            }
          } catch (deliveryErr) {
            console.error("Delivery creation error (non-blocking):", deliveryErr);
            // Don't fail the whole order for delivery creation issues
          }
        }
      }

      // Generate invoice PDF
      try {
        generateOrderInvoice(items, total, deliveryPrice, finalTotal, selectedDelivery?.name || "", selectedPayment?.name || "", buyerFullName, billing.phone, deliveryCity, fullAddress, mobileNumber);
      } catch (pdfErr) {
        console.error("PDF generation error (non-blocking):", pdfErr);
      }

      // Send confirmation email (non-blocking)
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

      // Also send via transactional email system (non-blocking)
      supabase.functions.invoke("send-transactional-email", {
        body: {
          templateName: "order-confirmation",
          recipientEmail: billing.email,
          idempotencyKey: `order-confirm-${invoiceNumber}`,
          templateData: {
            buyerName: buyerFullName,
            invoiceNumber,
            orderDate: now.toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" }),
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
          },
        },
      }).catch(err => console.error("Transactional email error:", err));

      // Notify admin about the new order (non-blocking)
      const orderSummary = items.map(i => `${i.product.name} x${i.quantity}`).join(", ");
      supabase.from("notifications").insert({
        user_id: user.id,
        type: "order",
        title: "🛒 Nouvelle commande confirmée",
        description: `${buyerFullName} a commandé: ${orderSummary}. Total: ${finalTotal.toLocaleString("en-US")} FCFA. Paiement: ${selectedPayment?.name || "Mobile Money"}`,
      }).then(() => {});

      supabase.from("user_roles").select("user_id").eq("role", "admin").then(({ data: admins }) => {
        if (admins?.length) {
          const adminNotifs = admins.map(a => ({
            user_id: a.user_id,
            type: "order",
            title: "🛒 Nouvelle commande confirmée",
            description: `${buyerFullName} a commandé: ${orderSummary}. Total: ${finalTotal.toLocaleString("en-US")} FCFA. Livraison: ${selectedDelivery?.name || "Retrait"}. Paiement: ${selectedPayment?.name || "Mobile Money"}`,
          }));
          supabase.from("notifications").insert(adminNotifs).then(() => {});
        }
      });

      // Notify buyer
      supabase.from("notifications").insert({
        user_id: user.id,
        type: "order",
        title: "✅ Commande confirmée !",
        description: `Votre commande ${invoiceNumber} de ${finalTotal.toLocaleString("en-US")} FCFA a été confirmée. Facture PDF disponible.`,
      }).then(() => {});

      toast({ title: "✅ Paiement confirmé & commande enregistrée !", description: "Votre reçu PDF a été téléchargé. Redirection vers vos commandes..." });
      setPayStatus({
        kind: "success",
        message: "Votre commande est confirmée. Le montant a été prélevé et votre facture PDF a été téléchargée.",
        details: {
          invoiceNumber,
          amount: finalTotal,
          method: selectedPayment?.name || "Mobile Money",
          orderIds,
        },
      });
      clearCart();

      // Navigate to order detail if we have a single order, otherwise to delivery tracking
      if (orderIds.length === 1) {
        navigate(`/commande/${orderIds[0]}`);
      } else {
        navigate("/suivi-livraison");
      }
    } catch (err: any) {
      console.error("Finalize order error:", err);
      setPayStatus({
        kind: "failed",
        message: err.message || "Une erreur est survenue lors de la finalisation. Le montant peut avoir été débité — contactez le support.",
      });
      toast({ title: "Erreur lors de la finalisation", description: err.message || "Une erreur est survenue. Contactez le support.", variant: "destructive" });
    }
  }, [items, total, deliveryPrice, finalTotal, deliveryMethod, selectedDelivery, deliveryCity, billing, mobileNumber, user, selectedDriver, dynamicDeliveryPrice, clearCart, navigate, toast, t]);

  // Paygate polling callbacks — use ref to avoid stale closure
  const handlePaymentCompleted = useCallback((data: any) => {
    setPollingEnabled(false);
    setIsCheckingOut(false);
    const checkoutData = pendingCheckoutRef.current;
    if (checkoutData) {
      finalizeOrder(checkoutData).catch((err) => {
        console.error("Finalize order error:", err);
        toast({ title: "Erreur", description: err.message, variant: "destructive" });
      });
    } else {
      console.error("Payment completed but no checkout data found");
      toast({ title: "Erreur", description: "Données de commande introuvables. Contactez le support.", variant: "destructive" });
    }
  }, [finalizeOrder, toast]);

  const markOrdersFailed = useCallback(async (reason: string) => {
    const checkoutData = pendingCheckoutRef.current;
    if (!checkoutData?.orderIds?.length) return;
    for (const orderId of checkoutData.orderIds) {
      await supabase.from("orders")
        .update({ status: "cancelled", notes: reason })
        .eq("id", orderId)
        .eq("status", "pending");
    }
    // Notify buyer
    if (user?.id) {
      await supabase.from("notifications").insert({
        user_id: user.id,
        type: "order",
        title: "❌ Paiement échoué",
        description: reason,
      });
    }
  }, [user]);

  const handlePaymentFailed = useCallback(async () => {
    setPollingEnabled(false);
    setIsCheckingOut(false);
    await markOrdersFailed(`Paiement échoué | tx_ref: ${paymentIdentifier}`);
    setPendingCheckoutData(null);
    pendingCheckoutRef.current = null;
    setPayStatus({
      kind: "failed",
      message: "La transaction n'a pas abouti — aucun montant n'a été débité. Vos commandes ont été annulées. Vous pouvez relancer le paiement.",
    });
    toast({ title: "❌ Paiement échoué", description: "La transaction n'a pas abouti. Vos commandes ont été annulées. Réessayez.", variant: "destructive" });
  }, [toast, markOrdersFailed, paymentIdentifier]);

  const handlePaymentExpired = useCallback(async () => {
    setPollingEnabled(false);
    setIsCheckingOut(false);
    await markOrdersFailed(`Paiement expiré (timeout) | tx_ref: ${paymentIdentifier}`);
    setPendingCheckoutData(null);
    pendingCheckoutRef.current = null;
    setPayStatus({
      kind: "expired",
      message: "Le paiement n'a pas été confirmé dans le délai imparti. Vos commandes ont été annulées — relancez le paiement pour réessayer.",
    });
    toast({ title: "⏰ Délai expiré", description: "Le paiement n'a pas été confirmé. Vos commandes ont été annulées.", variant: "destructive" });
  }, [toast, markOrdersFailed, paymentIdentifier]);

  // KKiaPay replaces Paygate polling — payment callbacks are handled inline in handleCheckout

  // -- Manual reconciliation (link from PaymentStatusPanel "Vérifier maintenant") --
  const handleVerifyNow = useCallback(async () => {
    if (!paymentIdentifier) return;
    setVerifyingPay(true);
    try {
      const { data, error } = await supabase.functions.invoke("reconcile-order", {
        body: { identifier: paymentIdentifier },
      });
      if (error) throw error;
      const result = (data as any) || {};
      const kind = mapBackendStateToKind(result.state);
      const orderIds = pendingCheckoutRef.current?.orderIds || [];
      const baseDetails = {
        amount: result.amount ?? finalTotal,
        method: pendingCheckoutRef.current?.selectedPayment?.name || "Mobile Money",
        identifier: paymentIdentifier,
        orderIds,
      };
      if (kind === "success") {
        // Trigger the same finalize path used by polling
        setPollingEnabled(false);
        if (pendingCheckoutRef.current) {
          await finalizeOrder(pendingCheckoutRef.current);
        } else {
          setPayStatus({
            kind: "success",
            message: result.user_message || PAYMENT_STATUS_DEFAULT_MESSAGES.success,
            details: baseDetails,
          });
        }
      } else {
        setPayStatus({
          kind,
          message: result.user_message || PAYMENT_STATUS_DEFAULT_MESSAGES[kind],
          details: baseDetails,
        });
      }
    } catch (e: any) {
      toast({ title: "Vérification impossible", description: e.message || "Réessayez dans un instant.", variant: "destructive" });
    } finally {
      setVerifyingPay(false);
    }
  }, [paymentIdentifier, finalTotal, toast, finalizeOrder]);

  const handleContactSupport = useCallback(async () => {
    if (!paymentIdentifier && !pendingCheckoutRef.current?.orderIds?.length) return;
    setContactingSupport(true);
    try {
      const orderIds = pendingCheckoutRef.current?.orderIds || [];
      const { data, error } = await supabase.functions.invoke("report-payment-mismatch", {
        body: {
          identifier: paymentIdentifier || undefined,
          order_id: orderIds[0],
          observed_state: payStatus.kind,
        },
      });
      if (error) throw error;
      toast({
        title: "Support contacté",
        description: (data as any)?.user_message || "Un agent vous répondra rapidement.",
      });
    } catch (e: any) {
      toast({ title: "Échec de l'envoi", description: e.message || "Réessayez.", variant: "destructive" });
    } finally {
      setContactingSupport(false);
    }
  }, [paymentIdentifier, payStatus.kind, toast]);

  const handleCheckout = async () => {
    if (!user) {
      toast({ title: t("cart.loginRequired"), description: t("cart.loginRequiredDesc"), variant: "destructive" });
      navigate("/auth?returnTo=/panier");
      return;
    }

    if (!billing.firstName.trim() || !billing.lastName.trim() || !billing.phone.trim()) {
      toast({ title: "Informations manquantes", description: "Veuillez remplir vos détails de facturation (prénom, nom, téléphone).", variant: "destructive" });
      return;
    }

    if (deliveryMethod !== "pickup" && (!deliveryAddress.trim() || !deliveryCity)) {
      toast({ title: t("cart.addressRequired"), description: "Veuillez sélectionner une ville et entrer votre adresse de livraison.", variant: "destructive" });
      return;
    }

    // Validation Mobile Money (numéro + auto-détection du réseau)
    const phoneValidation = validateMobileMoneyPhone(mobileNumber);
    if (!phoneValidation.valid || !phoneValidation.network) {
      toast({
        title: "Numéro Mobile Money invalide",
        description: phoneValidation.reason || "Vérifiez votre numéro avant de payer.",
        variant: "destructive",
      });
      return;
    }
    const detectedNetwork = phoneValidation.network;

    setIsCheckingOut(true);
    setPayStatus({ kind: "initiating" });
    try {
      const { data: buyerProfile } = await supabase
        .from("profiles").select("id").eq("user_id", user.id).single();

      if (!buyerProfile) throw new Error("Profile not found");

      const selectedPayment = paymentMethods.find(p => p.id === paymentMethod);
      const fullAddress = [deliveryQuarter, deliveryAddress].filter(Boolean).join(", ");
      const buyerFullName = `${billing.firstName} ${billing.lastName}`.trim();
      const selectedRealDriverId = selectedDriver && !String(selectedDriver.id).startsWith("demo-") ? selectedDriver.id : null;

      const identifier = `NUKU-${Date.now()}`;
      setPaymentIdentifier(identifier);

      // Create orders BEFORE payment so the webhook can find them by tx_reference
      const isValidUUID = (s: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
      const orderIds: string[] = [];
      for (const item of items) {
        const sellerId = item.product.producer.id;
        const productId = item.product.id;
        if (!isValidUUID(productId) || !isValidUUID(sellerId)) continue;

        const { data: orderData, error: orderErr } = await supabase.from("orders").insert({
          buyer_id: buyerProfile.id,
          seller_id: sellerId,
          product_id: productId,
          quantity: item.quantity,
          total_price: item.product.price * item.quantity,
          status: "pending",
          delivery_method: deliveryMethod, // 'pickup' | 'livreur' | 'international'
          notes: [
            `Client: ${buyerFullName} | ${billing.phone}`,
            deliveryMethod !== "pickup" ? `Livraison: ${selectedDelivery?.name} - ${deliveryCity}, ${fullAddress}` : "Retrait sur place",
            `Paiement: ${selectedPayment?.name}`,
            selectedRealDriverId ? `Livreur: ${selectedDriver?.profile?.full_name || "Livreur"}` : "",
            mobileNumber ? `Tél paiement: ${mobileNumber}` : "",
            `tx_ref: ${identifier}`,
          ].filter(Boolean).join(" | "),
        } as any).select("id").single();

        if (orderErr) {
          console.error("Order insert error:", orderErr);
          throw new Error("Erreur lors de la création de la commande.");
        }
        if (orderData) orderIds.push(orderData.id);
      }

      const checkoutData = { buyerProfile, selectedPayment, fullAddress, buyerFullName, selectedRealDriverId, orderIds };
      setPendingCheckoutData(checkoutData);
      pendingCheckoutRef.current = checkoutData;

      const phoneDigits = cleanPhone(mobileNumber);
      const { data, error } = await supabase.functions.invoke("paygate-init", {
        body: {
          amount: finalTotal,
          description: `Commande NUKUCONNECT - ${finalTotal} FCFA`,
          identifier,
          phone_number: phoneDigits,
          network: detectedNetwork,
          // Mobile Money: paiement direct via push USSD (pas de redirection)
          use_redirect: false,
        },
      });

      if (error) throw error;

      if (!data?.success) {
        throw new Error(data?.error || "Échec de l'initialisation du paiement.");
      }

      // Mobile Money direct: l'utilisateur reçoit une notification push sur son téléphone
      setPollingEnabled(true);
      setPayStatus({
        kind: "pending",
        message: `Validez la transaction sur votre téléphone ${detectedNetwork === "FLOOZ" ? "Moov Money" : "Mixx by Yas"}. Le statut sera confirmé automatiquement.`,
      });
      toast({
        title: "📱 Paiement initié",
        description: `Validez la transaction sur votre téléphone ${detectedNetwork === "FLOOZ" ? "Moov Money" : "Mixx by Yas"}.`,
      });

    } catch (error: any) {
      console.error("Checkout error:", error);
      setIsCheckingOut(false);
      setPendingCheckoutData(null);
      pendingCheckoutRef.current = null;
      setPayStatus({
        kind: "failed",
        message: error.message || "Impossible d'initier le paiement. Aucun montant n'a été débité.",
      });
      toast({ title: t("common.error"), description: error.message, variant: "destructive" });
    }
  };

  // Empty cart
  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-background pb-14 lg:pb-0">
        <SEO url="/cart" title="Panier" description="Consultez votre panier d'achats sur NukuConnect. Finalisez vos commandes de produits agricoles frais." noIndex />
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
        {/* TrustBadges est rendu dans <Footer /> */}
        <Footer />
        <MobileBottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 lg:pb-0 overflow-x-hidden">
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
        <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 max-w-full overflow-hidden">
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
                <Link to="/auth?returnTo=/panier">
                  <Button variant="hero" size="sm">Se connecter</Button>
                </Link>
              </CardContent>
            </Card>
          )}

          {/* Persistent payment status panel — shared model with FormationDetail */}
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
            {/* Left: Billing + Delivery + Payment */}
            <div className="lg:col-span-2 space-y-3 sm:space-y-4 min-w-0">
              <BillingForm data={billing} onChange={setBilling} />

              {/* Address selector first - auto-fills delivery zone */}
              <AddressSelector
                selectedId={selectedAddress?.id}
                onSelect={(addr) => {
                  setSelectedAddress(addr);
                  if (addr.city) setDeliveryCity(addr.city);
                  if (addr.street) setDeliveryAddress(addr.street);
                  if (addr.quarter) setDeliveryQuarter(addr.quarter);
                  setAddressAutoFilled(true);
                }}
              />

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

              {deliveryMethod === "livreur" && (
                <>
                  {/* Seller location & distance info */}
                  <Card className="border-muted">
                    <CardContent className="p-3">
                      <h4 className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-primary" />
                        Distance fournisseur — acheteur
                      </h4>
                      <div className="space-y-1.5">
                        {items.map((item) => {
                          const sellerLoc = item.product.location || "Non définie";
                          const buyerLoc = deliveryCity || "Non définie";
                          return (
                            <div key={item.product.id} className="flex flex-col sm:flex-row sm:items-center justify-between text-[10px] sm:text-[11px] bg-muted/50 rounded-lg p-2 gap-1">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="font-medium truncate">{item.product.name}</span>
                              </div>
                              <div className="flex items-center gap-1 sm:gap-1.5 flex-shrink-0 text-muted-foreground flex-wrap">
                                <MapPin className="w-2.5 h-2.5 text-primary" />
                                <span className="truncate max-w-[80px] sm:max-w-none">{sellerLoc}</span>
                                <span>→</span>
                                <span className="truncate max-w-[80px] sm:max-w-none">{buyerLoc}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      {dynamicDeliveryPrice > 0 && (
                        <p className="text-[10px] text-muted-foreground mt-2">
                          💡 Le prix de livraison ({(dynamicDeliveryPrice).toLocaleString("en-US")} FCFA) est calculé en fonction de la distance réelle entre vous et le fournisseur.
                        </p>
                      )}
                    </CardContent>
                  </Card>
                  <AvailableDrivers
                    city={deliveryCity}
                    distanceKm={dynamicDeliveryPrice > 0 ? (dynamicDeliveryPrice / 100) : null}
                    cartItems={items.map(item => ({ name: item.product.name, id: item.product.id, quantity: item.quantity, price: item.product.price }))}
                    selectedDriverId={selectedDriver?.id || null}
                    onSelectDriver={setSelectedDriver}
                  />
                </>
              )}

              {/* Payment section: only shown after clicking "Passer la commande" */}
              {showPaymentStep && (
                <div className="animate-fade-in" id="payment-section">
                <PaymentMethodSelect
                    paymentMethod={paymentMethod}
                    onPaymentMethodChange={setPaymentMethod}
                    mobileNumber={mobileNumber}
                    onMobileNumberChange={setMobileNumber}
                    amount={finalTotal}
                    hidePayButton
                    isPolling={pollingEnabled}
                    onNetworkChange={setSelectedNetwork}
                  />
                </div>
              )}
            </div>

            {/* Right: Order Summary */}
            <div className="lg:col-span-1">
              <OrderSummary
                deliveryPrice={deliveryPrice}
                isCheckingOut={isCheckingOut}
                canCheckout={!!user}
                onCheckout={handleCheckout}
                onDiscountChange={(discount, code) => { setPromoDiscount(discount); setPromoCode(code); }}
                isPolling={pollingEnabled}
                showPaymentStep={showPaymentStep}
                onShowPayment={() => setShowPaymentStep(true)}
              />
            </div>
          </div>
        </div>
      </main>
      {/* TrustBadges est rendu dans <Footer /> */}
      <Footer />
      <MobileBottomNav />
    </div>
  );
};

export default Cart;
