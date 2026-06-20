import { useState, useEffect, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider, onlineManager } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import {
  createOfflinePersister,
  PERSIST_MAX_AGE,
  PERSIST_BUSTER,
} from "@/lib/offlinePersistence";
import OfflineBanner from "@/components/layout/OfflineBanner";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { CartProvider } from "@/components/cart/CartContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { ProfileProvider } from "@/contexts/ProfileContext";
import { CallProvider } from "@/contexts/CallContext";
import CallModal from "@/components/calls/CallModal";
import { ThemeProvider } from "@/contexts/ThemeContext";
import SplashScreen from "@/components/SplashScreen";
import RealtimeNotifications from "./components/RealtimeNotifications";
import AnalyticsTracker from "./components/AnalyticsTracker";
import ScrollToTop from "./components/ScrollToTop";
import PresenceTracker from "./components/PresenceTracker";
import ProfileLeavePopup from "./components/ProfileLeavePopup";
import RouteProgress from "./components/layout/RouteProgress";
import SmartSuspense from "./components/layout/SmartSuspense";
import PerformanceTracker from "./components/PerformanceTracker";
import LinkPrefetcher from "./components/LinkPrefetcher";
import CookieConsent from "./components/CookieConsent";
import CleanTrackingParams from "./components/CleanTrackingParams";

// Lazy load all pages
const Index = lazy(() => import("./pages/Index"));
const Marketplace = lazy(() => import("./pages/Marketplace"));
const ProductDetail = lazy(() => import("./pages/ProductDetail"));
const ProducerProfile = lazy(() => import("./pages/ProducerProfile"));
const UserShopRedirect = lazy(() => import("./pages/UserShopRedirect"));
const Producers = lazy(() => import("./pages/Producers"));
const NukuAI = lazy(() => import("./pages/NukuAI"));
const Formations = lazy(() => import("./pages/Formations"));
const Traceability = lazy(() => import("./pages/Traceability"));
const Messages = lazy(() => import("./pages/Messages"));
const Auth = lazy(() => import("./pages/Auth"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const BuyerDashboard = lazy(() => import("./pages/BuyerDashboard"));
const Cart = lazy(() => import("./pages/Cart"));
const DriverDashboard = lazy(() => import("./pages/DriverDashboard"));
const LearnerDashboard = lazy(() => import("./pages/LearnerDashboard"));
const Plans = lazy(() => import("./pages/Plans"));
const Tokens = lazy(() => import("./pages/Tokens"));
const DeliveryTracking = lazy(() => import("./pages/DeliveryTracking"));
const PublicDeliveryTracking = lazy(() => import("./pages/PublicDeliveryTracking"));
const About = lazy(() => import("./pages/About"));
const Notifications = lazy(() => import("./pages/Notifications"));
const Favorites = lazy(() => import("./pages/Favorites"));
const Terms = lazy(() => import("./pages/Terms"));
const Privacy = lazy(() => import("./pages/Privacy"));
const Legal = lazy(() => import("./pages/Legal"));
const PurchasePolicy = lazy(() => import("./pages/PurchasePolicy"));
const Contact = lazy(() => import("./pages/Contact"));
const Help = lazy(() => import("./pages/Help"));
const NotFound = lazy(() => import("./pages/NotFound"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const AdminWatermarkErrors = lazy(() => import("./pages/AdminWatermarkErrors"));
const SeoPreview = lazy(() => import("./pages/admin/SeoPreview"));
const SeoCanonical = lazy(() => import("./pages/admin/SeoCanonical"));
const Settings = lazy(() => import("./pages/Settings"));
const DeliveryAddress = lazy(() => import("./pages/DeliveryAddress"));
const BecomeSeller = lazy(() => import("./pages/BecomeSeller"));
const FormationDetail = lazy(() => import("./pages/FormationDetail"));
const OrderDetail = lazy(() => import("./pages/OrderDetail"));
const MesCommandes = lazy(() => import("./pages/MesCommandes"));
const Unsubscribe = lazy(() => import("./pages/Unsubscribe"));
const Categories = lazy(() => import("./pages/Categories"));
const Affiliation = lazy(() => import("./pages/Affiliation"));
const AffiliationStatus = lazy(() => import("./pages/AffiliationStatus"));
const Blog = lazy(() => import("./pages/Blog"));
const BlogPost = lazy(() => import("./pages/BlogPost"));
const Moderation = lazy(() => import("./pages/Moderation"));
const FAQNukuAI = lazy(() => import("./pages/FAQNukuAI"));
const PremiumDashboard = lazy(() => import("./pages/PremiumDashboard"));
const AccountAccess = lazy(() => import("./pages/AccountAccess"));
const Refunds = lazy(() => import("./pages/Refunds"));
const Invoices = lazy(() => import("./pages/Invoices"));
const DeleteAccount = lazy(() => import("./pages/DeleteAccount"));
const PaymentCallback = lazy(() => import("./pages/PaymentCallback"));
const PaymentTracking = lazy(() => import("./pages/PaymentTracking"));
const ShareDiagnostic = lazy(() => import("./pages/ShareDiagnostic"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2,
      gcTime: 1000 * 60 * 60 * 24, // 24h pour cohérence avec persistance
      retry: (failureCount, error: any) => {
        // Pas de retry hors-ligne (inutile, on ressert le cache)
        if (typeof navigator !== "undefined" && !navigator.onLine) return false;
        // Pas de retry sur les 4xx (sauf 408/429)
        const status = error?.status ?? error?.response?.status;
        if (status >= 400 && status < 500 && status !== 408 && status !== 429) {
          return false;
        }
        return failureCount < 2;
      },
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
      refetchOnWindowFocus: false,
      refetchOnReconnect: "always",
      networkMode: "offlineFirst",
    },
    mutations: {
      networkMode: "offlineFirst",
      retry: (failureCount) => failureCount < 2,
    },
  },
});

// Resync automatique : React Query suit l'état réseau du navigateur
if (typeof window !== "undefined") {
  onlineManager.setEventListener((setOnline) => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  });
}

const offlinePersister = createOfflinePersister();


const App = () => {
  const [showSplash, setShowSplash] = useState(true);
  const [isFirstVisit, setIsFirstVisit] = useState(true);

  useEffect(() => {
    const hasSeenSplash = sessionStorage.getItem("nukuconnect-splash-seen");
    if (hasSeenSplash) {
      setShowSplash(false);
      setIsFirstVisit(false);
    }
  }, []);

  const handleSplashComplete = () => {
    sessionStorage.setItem("nukuconnect-splash-seen", "true");
    setShowSplash(false);
  };

  const QueryProvider: any = offlinePersister ? PersistQueryClientProvider : QueryClientProvider;
  const queryProviderProps: any = offlinePersister
    ? {
        client: queryClient,
        persistOptions: {
          persister: offlinePersister,
          maxAge: PERSIST_MAX_AGE,
          buster: PERSIST_BUSTER,
          dehydrateOptions: {
            shouldDehydrateQuery: (q: any) =>
              q.state.status === "success" && !!q.state.data,
          },
        },
      }
    : { client: queryClient };

  return (
    <HelmetProvider>
    <QueryProvider {...queryProviderProps}>
      <ThemeProvider>
      <LanguageProvider>
        <ProfileProvider>
        <CallProvider>
        <CartProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            {showSplash && isFirstVisit && (
              <SplashScreen onComplete={handleSplashComplete} />
            )}
            <BrowserRouter>
              <RouteProgress />
              <OfflineBanner />
              <PerformanceTracker />
              <LinkPrefetcher />
              <ScrollToTop />
              <CleanTrackingParams />
              <AnalyticsTracker />
              <PresenceTracker />
              <RealtimeNotifications />
              <ProfileLeavePopup />
              <SmartSuspense>
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/marketplace" element={<Marketplace />} />
                  <Route path="/produit/:id" element={<ProductDetail />} />
                  <Route path="/producteurs" element={<Producers />} />
                  <Route path="/producteurs/:name" element={<ProducerProfile />} />
                  <Route path="/@:username" element={<UserShopRedirect />} />
                  <Route path="/nuku-ai" element={<NukuAI />} />
                  <Route path="/formations" element={<Formations />} />
                  <Route path="/formations/:id" element={<FormationDetail />} />
                  <Route path="/tracabilite" element={<Traceability />} />
                  <Route path="/messages" element={<Messages />} />
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/reset-password" element={<ResetPassword />} />
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/premium" element={<PremiumDashboard />} />
                  <Route path="/buyer-dashboard" element={<BuyerDashboard />} />
                  <Route path="/panier" element={<Cart />} />
                  <Route path="/commande/:id" element={<OrderDetail />} />
                  <Route path="/mes-commandes" element={<MesCommandes />} />
                  <Route path="/driver-dashboard" element={<DriverDashboard />} />
                  <Route path="/learner-dashboard" element={<LearnerDashboard />} />
                  <Route path="/plans" element={<Plans />} />
                  <Route path="/jetons" element={<Tokens />} />
                  <Route path="/tokens" element={<Tokens />} />
                  <Route path="/suivi-livraison" element={<DeliveryTracking />} />
                  <Route path="/tracking/:token" element={<PublicDeliveryTracking />} />
                  <Route path="/a-propos" element={<About />} />
                  <Route path="/notifications" element={<Notifications />} />
                  <Route path="/favoris" element={<Favorites />} />
                  <Route path="/terms" element={<Terms />} />
                  <Route path="/privacy" element={<Privacy />} />
                 <Route path="/legal" element={<Legal />} />
                 <Route path="/politique-achat" element={<PurchasePolicy />} />
                 <Route path="/politique-remboursement" element={<PurchasePolicy />} />
                  <Route path="/contact" element={<Contact />} />
                  <Route path="/aide" element={<Help />} />
                  <Route path="/faq" element={<Help />} />
                  <Route path="/admin" element={<AdminDashboard />} />
                  <Route path="/admin/seo-preview" element={<SeoPreview />} />
                  <Route path="/admin/seo-canonical" element={<SeoCanonical />} />
                  <Route path="/admin/watermark-errors" element={<AdminWatermarkErrors />} />
                  <Route path="/mon-compte" element={<AccountAccess />} />
                  <Route path="/remboursements" element={<Refunds />} />
                  <Route path="/factures" element={<Invoices />} />
                  <Route path="/adresse-livraison" element={<DeliveryAddress />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/devenir-fournisseur" element={<BecomeSeller />} />
                  <Route path="/unsubscribe" element={<Unsubscribe />} />
                  <Route path="/categories" element={<Categories />} />
                  <Route path="/affiliation" element={<Affiliation />} />
                  <Route path="/affiliation/statut" element={<AffiliationStatus />} />
                  <Route path="/blog" element={<Blog />} />
                  <Route path="/blog/:slug" element={<BlogPost />} />
                  <Route path="/moderation" element={<Moderation />} />
                  <Route path="/faq-nuku-ai" element={<FAQNukuAI />} />
                  <Route path="/nuku-ai/faq" element={<FAQNukuAI />} />
                  <Route path="/delete-account" element={<DeleteAccount />} />
                  <Route path="/payment-callback" element={<PaymentCallback />} />
                  <Route path="/suivi-paiement" element={<PaymentTracking />} />
                  <Route path="/diagnostic-partage" element={<ShareDiagnostic />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </SmartSuspense>
              <CookieConsent />
            </BrowserRouter>
            <CallModal />
          </TooltipProvider>
        </CartProvider>
        </CallProvider>
        </ProfileProvider>
      </LanguageProvider>
      </ThemeProvider>
    </QueryProvider>
    </HelmetProvider>
  );
};

export default App;
