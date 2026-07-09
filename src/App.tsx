import { useState, useEffect } from "react";
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

import Index from "./pages/Index";
import Marketplace from "./pages/Marketplace";
import ProductDetail from "./pages/ProductDetail";
import ProducerProfile from "./pages/ProducerProfile";
import UserShopRedirect from "./pages/UserShopRedirect";
import Producers from "./pages/Producers";
import NukuAI from "./pages/NukuAI";
import Formations from "./pages/Formations";
import Traceability from "./pages/Traceability";
import Messages from "./pages/Messages";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import BuyerDashboard from "./pages/BuyerDashboard";
import Cart from "./pages/Cart";
import DriverDashboard from "./pages/DriverDashboard";
import LearnerDashboard from "./pages/LearnerDashboard";
import Plans from "./pages/Plans";
import Tokens from "./pages/Tokens";
import DeliveryTracking from "./pages/DeliveryTracking";
import PublicDeliveryTracking from "./pages/PublicDeliveryTracking";
import About from "./pages/About";
import Notifications from "./pages/Notifications";
import Favorites from "./pages/Favorites";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import Legal from "./pages/Legal";
import PurchasePolicy from "./pages/PurchasePolicy";
import Contact from "./pages/Contact";
import Help from "./pages/Help";
import Support from "./pages/Support";
import NotFound from "./pages/NotFound";
import AdminDashboard from "./pages/AdminDashboard";
import AdminWatermarkErrors from "./pages/AdminWatermarkErrors";
import SeoPreview from "./pages/admin/SeoPreview";
import SeoCanonical from "./pages/admin/SeoCanonical";
import RealtimeDiagnostics from "./pages/admin/RealtimeDiagnostics";
import ErrorLogs from "./pages/admin/ErrorLogs";
import Settings from "./pages/Settings";
import DeliveryAddress from "./pages/DeliveryAddress";
import BecomeSeller from "./pages/BecomeSeller";
import FormationDetail from "./pages/FormationDetail";
import OrderDetail from "./pages/OrderDetail";
import MesCommandes from "./pages/MesCommandes";
import Unsubscribe from "./pages/Unsubscribe";
import Categories from "./pages/Categories";
import Affiliation from "./pages/Affiliation";
import AffiliationStatus from "./pages/AffiliationStatus";
import Blog from "./pages/Blog";
import BlogPost from "./pages/BlogPost";
import Moderation from "./pages/Moderation";
import FAQNukuAI from "./pages/FAQNukuAI";
import PremiumDashboard from "./pages/PremiumDashboard";
import AccountAccess from "./pages/AccountAccess";
import Refunds from "./pages/Refunds";
import Invoices from "./pages/Invoices";
import DeleteAccount from "./pages/DeleteAccount";
import PaymentCallback from "./pages/PaymentCallback";
import PaymentTracking from "./pages/PaymentTracking";
import ShareDiagnostic from "./pages/ShareDiagnostic";
import UpdatePrompt from "./components/UpdatePrompt";
import AuthCacheGuard from "./components/AuthCacheGuard";

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
            <UpdatePrompt />
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
              {/* ProfileLeavePopup désactivé — seul le popup principal de la Marketplace est conservé */}
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
                  <Route path="/support" element={<Support />} />
                  <Route path="/admin" element={<AdminDashboard />} />
                  <Route path="/admin/seo-preview" element={<SeoPreview />} />
                  <Route path="/admin/seo-canonical" element={<SeoCanonical />} />
                  <Route path="/admin/watermark-errors" element={<AdminWatermarkErrors />} />
                  <Route path="/admin/realtime-diagnostics" element={<RealtimeDiagnostics />} />
                  <Route path="/admin/errors" element={<ErrorLogs />} />
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
