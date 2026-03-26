import { useState, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { CartProvider } from "@/components/cart/CartContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { ProfileProvider } from "@/contexts/ProfileContext";
import SplashScreen from "@/components/SplashScreen";
import Index from "./pages/Index";
import Marketplace from "./pages/Marketplace";
import ProductDetail from "./pages/ProductDetail";
import ProducerProfile from "./pages/ProducerProfile";
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
import Plans from "./pages/Plans";
import DeliveryTracking from "./pages/DeliveryTracking";
import About from "./pages/About";
import Notifications from "./pages/Notifications";
import Favorites from "./pages/Favorites";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import Legal from "./pages/Legal";
import Contact from "./pages/Contact";
import Help from "./pages/Help";
import NotFound from "./pages/NotFound";
import AdminDashboard from "./pages/AdminDashboard";
import Settings from "./pages/Settings";
import RealtimeNotifications from "./components/RealtimeNotifications";
import AnalyticsTracker from "./components/AnalyticsTracker";
import ScrollToTop from "./components/ScrollToTop";
import PresenceTracker from "./components/PresenceTracker";

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
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/marketplace" element={<Marketplace />} />
                <Route path="/produit/:id" element={<ProductDetail />} />
                <Route path="/producteurs" element={<Producers />} />
                <Route path="/producteurs/:name" element={<ProducerProfile />} />
                <Route path="/nuku-ai" element={<NukuAI />} />
                <Route path="/formations" element={<Formations />} />
                <Route path="/tracabilite" element={<Traceability />} />
                <Route path="/messages" element={<Messages />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/buyer-dashboard" element={<BuyerDashboard />} />
                <Route path="/panier" element={<Cart />} />
                <Route path="/driver-dashboard" element={<DriverDashboard />} />
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
                <Route path="/settings" element={<Settings />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </CartProvider>
        </ProfileProvider>
      </LanguageProvider>
    </QueryClientProvider>
  );
};

export default App;
