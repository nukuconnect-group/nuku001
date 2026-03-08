import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Home, LayoutGrid, Store, MessageCircle, Plus, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import AddProductModal from "@/components/dashboard/AddProductModal";
import CategorySheet from "./CategorySheet";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const MobileBottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [showCategories, setShowCategories] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showSellLoading, setShowSellLoading] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setProfile(null);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string) => {
    setIsLoading(true);
    try {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();
      setProfile(data);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSellClick = async () => {
    console.log("[SELL] clicked, user:", !!user, "profile:", profile?.user_type, "isLoading:", isLoading);
    
    if (!user) {
      toast({ title: "Connexion requise", description: "Connectez-vous pour vendre vos produits" });
      navigate("/auth");
      return;
    }

    // Always re-fetch profile to ensure fresh data
    setShowSellLoading(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();
      
      console.log("[SELL] fetched profile:", data?.user_type, "error:", error?.message);
      setProfile(data);
      setShowSellLoading(false);
      
      if (!data || data.user_type !== "producer") {
        toast({ title: "Compte producteur requis", description: "Inscrivez-vous comme producteur pour vendre" });
        navigate("/auth");
        return;
      }
      
      console.log("[SELL] opening modal for profile:", data.id);
      setShowAddProduct(true);
    } catch (err) {
      console.error("[SELL] error:", err);
      setShowSellLoading(false);
      toast({ title: "Erreur", description: "Impossible de charger votre profil", variant: "destructive" });
    }
  };

  const isActive = (href: string) => {
    if (href === "/") return location.pathname === "/";
    return location.pathname.startsWith(href.split("?")[0]);
  };

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-card border-t border-border lg:hidden">
        <div className="flex items-center justify-around h-14 relative px-1">
          <Link to="/"
            className={`flex flex-col items-center justify-center gap-0.5 px-2 py-1.5 rounded-lg transition-colors min-w-[48px] ${
              isActive("/") ? "text-primary" : "text-muted-foreground hover:text-foreground"
            }`}>
            <Home className="w-5 h-5" />
            <span className="text-[9px] font-medium">Accueil</span>
          </Link>

          <button onClick={() => setShowCategories(true)}
            className="flex flex-col items-center justify-center gap-0.5 px-2 py-1.5 rounded-lg transition-colors text-muted-foreground hover:text-foreground min-w-[48px]">
            <LayoutGrid className="w-5 h-5" />
            <span className="text-[9px] font-medium">Catégories</span>
          </button>

          <div className="relative -mt-7 flex flex-col items-center">
            <div className="absolute -inset-1 rounded-full bg-primary/20 blur-md animate-pulse" />
            <button onClick={handleSellClick}
              className="relative w-14 h-14 rounded-full bg-gradient-to-br from-primary via-primary/90 to-accent flex items-center justify-center shadow-[0_4px_20px_hsl(var(--primary)/0.4)] text-primary-foreground hover:shadow-[0_6px_28px_hsl(var(--primary)/0.55)] transition-all duration-300 active:scale-90 ring-[3px] ring-background">
              {showSellLoading ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                <Plus className="w-7 h-7 stroke-[2.5]" />
              )}
            </button>
            <span className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-[10px] font-bold text-primary whitespace-nowrap tracking-wide uppercase">
              Vendre
            </span>
          </div>

          <Link to="/marketplace"
            className={`flex flex-col items-center justify-center gap-0.5 px-2 py-1.5 rounded-lg transition-colors min-w-[48px] ${
              isActive("/marketplace") ? "text-primary" : "text-muted-foreground hover:text-foreground"
            }`}>
            <Store className="w-5 h-5" />
            <span className="text-[9px] font-medium">Marché</span>
          </Link>

          <Link to="/messages"
            className={`flex flex-col items-center justify-center gap-0.5 px-2 py-1.5 rounded-lg transition-colors min-w-[48px] ${
              isActive("/messages") ? "text-primary" : "text-muted-foreground hover:text-foreground"
            }`}>
            <MessageCircle className="w-5 h-5" />
            <span className="text-[9px] font-medium">Messages</span>
          </Link>
        </div>
      </nav>
      
      <CategorySheet open={showCategories} onOpenChange={setShowCategories} />

      {profile && (
        <AddProductModal
          open={showAddProduct && profile.user_type === "producer"}
          onOpenChange={(open) => {
            if (!open) setShowAddProduct(false);
          }}
          profileId={profile.id}
          onProductAdded={() => {
            toast({ title: "Produit publié !", description: "Votre produit est visible sur le marketplace" });
            setShowAddProduct(false);
          }}
        />
      )}
    </>
  );
};

export default MobileBottomNav;
