import SEO from "@/components/SEO";
import { useState, useEffect, useCallback, useRef, lazy, Suspense } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useProfile } from "@/contexts/ProfileContext";
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
import { deliveryOptions, buildDeliveryOptions, type DeliveryDistanceInfo } from "@/components/cart/DeliveryZoneMap";
import { openMonerooPay } from "@/lib/moneroo";
import { PaymentStatusPanel } from "@/components/payments/PaymentStatusPanel";
import { PaymentStatus, PAYMENT_STATUS_DEFAULT_MESSAGES, mapBackendStateToKind } from "@/lib/paymentStatus";

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

const Cart = () => {
  const { items, clearCart, total, itemCount } = useCart();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { t, formatPrice } = useLanguage();
  const savedCheckoutForm = readSavedCheckoutForm();
  const { user, profile: contextProfile, isReady: authReady } = useProfile();
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [billing, setBilling] = useState({
    firstName: savedCheckoutForm?.billing?.firstName || "",
    lastName: savedCheckoutForm?.billing?.lastName || "",
    email: savedCheckoutForm?.billing?.email || "",
    phone: savedCheckoutForm?.billing?.phone || "",
    company: savedCheckoutForm?.billing?.company || "",
    country: savedCheckoutForm?.billing?.country || "Togo",
  });

  // Delivery
  const [deliveryMethod, setDeliveryMethod] = useState(savedCheckoutForm?.deliveryMethod || "livreur");
  const [deliveryCity, setDeliveryCity] = useState(savedCheckoutForm?.deliveryCity || "");
  const [deliveryAddress, setDeliveryAddress] = useState(savedCheckoutForm?.deliveryAddress || "");
  const [deliveryQuarter, setDeliveryQuarter] = useState(savedCheckoutForm?.deliveryQuarter || "");
  const [addressAutoFilled, setAddressAutoFilled] = useState(false);

  // Payment
  const [paymentMethod, setPaymentMethod] = useState("moneroo");
  const [mobileNumber, setMobileNumber] = useState(savedCheckoutForm?.mobileNumber || savedCheckoutForm?.billing?.phone || "");
  const [showPaymentStep, setShowPaymentStep] = useState(false);

  // Promo
  const [promoDiscount, setPromoDiscount] = useState(0);
  const [promoCode, setPromoCode] = useState("");

  // Saved address
  const [selectedAddress, setSelectedAddress] = useState<any>(null);
  const [selectedDriver, setSelectedDriver] = useState<any>(null);

  // Payment polling state
  const [paymentIdentifier, setPaymentIdentifier] = useState("");
  const [pollingEnabled, setPollingEnabled] = useState(false);
  const [pendingCheckoutData, setPendingCheckoutData] = useState<any>(null);
  const pendingCheckoutRef = useRef<any>(null);

  // Persistent payment status panel (shared model with FormationDetail)
  const [payStatus, setPayStatus] = useState<PaymentStatus>({ kind: "idle" });
  const [verifyingPay, setVerifyingPay] = useState(false);
  const [contactingSupport, setContactingSupport] = useState(false);

  // Load user profile and auto-fill billing
  const fillBillingFromUser = useCallback(async (sessionUser: any, userProfile: any) => {
    setBilling(prev => ({ ...prev, email: prev.email || sessionUser.email || "" }));
    if (userProfile) {
      const nameParts = (userProfile.full_name || "").split(" ");
      const { data: privateData } = await supabase.from("profile_private").select("phone").eq("user_id", sessionUser.id).maybeSingle();
      const phone = privateData?.phone || "";
      setBilling(prev => ({
        ...prev,
        firstName: prev.firstName || nameParts[0] || "",
        lastName: prev.lastName || nameParts.slice(1).join(" ") || "",
        phone: prev.phone || phone,
      }));
      if (userProfile.location && !hasSavedCheckoutFormRef.current) setDeliveryCity(userProfile.location);
      if (phone && !hasSavedCheckoutFormRef.current) setMobileNumber(phone);
    }
  }, [t]);
