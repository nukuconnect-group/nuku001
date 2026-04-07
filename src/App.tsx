import { useState, useEffect, lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { CartProvider } from "@/components/cart/CartContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { ProfileProvider } from "@/contexts/ProfileContext";
import SplashScreen from "@/components/SplashScreen";
import RealtimeNotifications from "./components/RealtimeNotifications";
import AnalyticsTracker from "./components/AnalyticsTracker";
import ScrollToTop from "./components/ScrollToTop";
import PresenceTracker from "./components/PresenceTracker";
import { Loader2 } from "lucide-react";

// Lazy load all pages
const Index = lazy(() => import("./pages/Index"));
const Marketplace = lazy(() => import("./pages/Marketplace"));
const ProductDetail = lazy(() => import("./pages/ProductDetail"));
const ProducerProfile = lazy(() => import("./pages/ProducerProfile"));
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
const DeliveryTracking = lazy(() => import("./pages/DeliveryTracking"));
const About = lazy(() => import("./pages/About"));
const Notifications = lazy(() => import("./pages/Notifications"));
const Favorites = lazy(() => import("./pages/Favorites"));
const Terms = lazy(() => import("./pages/Terms"));
const Privacy = lazy(() => import("./pages/Privacy"));
const Legal = lazy(() => import("./pages/Legal"));
const Contact = lazy(() => import("./pages/Contact"));
const Help = lazy(() => import("./pages/Help"));
const NotFound = lazy(() => import("./pages/NotFound"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const Settings = lazy(() => import("./pages/Settings"));
const DeliveryAddress = lazy(() => import("./pages/DeliveryAddress"));
const BecomeSeller = lazy(() => import("./pages/BecomeSeller"));
const FormationDetail = lazy(() => import("./pages/FormationDetail"));
const OrderDetail = lazy(() => import("./pages/OrderDetail"));
const Unsubscribe = lazy(() => import("./pages/Unsubscribe"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2,
      gcTime: 1000 * 60 * 10,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <Loader2 className="w-8 h-8 animate-spin text-primary" />
  </div>
);

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

  return (
    <HelmetProvider>
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <ProfileProvider>
        <CartProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            {showSplash && isFirstVisit && (
              <SplashScreen onComplete={handleSplashComplete} />
            )}
            <BrowserRouter>
              <ScrollToTop />
              <AnalyticsTracker />
              <PresenceTracker />
              <RealtimeNotifications />
              <Suspense fallback={<PageLoader />}>
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/marketplace" element={<Marketplace />} />
                  <Route path="/produit/:id" element={<ProductDetail />} />
                  <Route path="/producteurs" element={<Producers />} />
                  <Route path="/producteurs/:name" element={<ProducerProfile />} />
                  <Route path="/nuku-ai" element={<NukuAI />} />
                  <Route path="/formations" element={<Formations />} />
                  <Route path="/formations/:id" element={<FormationDetail />} />
                  <Route path="/tracabilite" element={<Traceability />} />
                  <Route path="/messages" element={<Messages />} />
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/reset-password" element={<ResetPassword />} />
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/buyer-dashboard" element={<BuyerDashboard />} />
                  <Route path="/panier" element={<Cart />} />
                  <Route path="/commande/:id" element={<OrderDetail />} />
                  <Route path="/driver-dashboard" element={<DriverDashboard />} />
                  <Route path="/learner-dashboard" element={<LearnerDashboard />} />
                  <Route path="/plans" element={<Plans />} />
                  <Route path="/suivi-livraison" element={<DeliveryTracking />} />
                  <Route path="/a-propos" element={<About />} />
                  <Route path="/notifications" element={<Notifications />} />
                  <Route path="/favoris" element={<Favorites />} />
                  <Route path="/terms" element={<Terms />} />
                  <Route path="/privacy" element={<Privacy />} />
                  <Route path="/legal" element={<Legal />} />
                  <Route path="/contact" element={<Contact />} />
                  <Route path="/aide" element={<Help />} />
                  <Route path="/faq" element={<Help />} />
                  <Route path="/admin" element={<AdminDashboard />} />
                  <Route path="/adresse-livraison" element={<DeliveryAddress />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/devenir-fournisseur" element={<BecomeSeller />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </BrowserRouter>
          </TooltipProvider>
        </CartProvider>
        </ProfileProvider>
      </LanguageProvider>
    </QueryClientProvider>
    </HelmetProvider>
  );
};

export default App;
