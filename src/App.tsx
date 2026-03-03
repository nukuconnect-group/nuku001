import { useState, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { CartProvider } from "@/components/cart/CartContext";
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
import Dashboard from "./pages/Dashboard";
import BuyerDashboard from "./pages/BuyerDashboard";
import Cart from "./pages/Cart";
import Plans from "./pages/Plans";
import DeliveryTracking from "./pages/DeliveryTracking";
import About from "./pages/About";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

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
      <CartProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          {showSplash && isFirstVisit && (
            <SplashScreen onComplete={handleSplashComplete} />
          )}
          <BrowserRouter>
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
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/buyer-dashboard" element={<BuyerDashboard />} />
              <Route path="/panier" element={<Cart />} />
              <Route path="/plans" element={<Plans />} />
              <Route path="/suivi-livraison" element={<DeliveryTracking />} />
              <Route path="/a-propos" element={<About />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </CartProvider>
    </QueryClientProvider>
  );
};

export default App;
