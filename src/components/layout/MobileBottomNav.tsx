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
        .single();
      setProfile(data);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSellClick = async () => {
    if (!user) {
      toast({ title: "Connexion requise", description: "Connectez-vous pour vendre vos produits" });
      navigate("/auth");
      return;
    }

    // If profile is still loading, show loading and wait
    if (isLoading || !profile) {
      setShowSellLoading(true);
      // Re-fetch profile and wait
      try {
        const { data } = await supabase
          .from("profiles")
          .select("*")
          .eq("user_id", user.id)
          .single();
        setProfile(data);
        setShowSellLoading(false);
        
        if (!data || data.user_type !== "producer") {
          toast({ title: "Compte producteur requis", description: "Inscrivez-vous comme producteur pour vendre" });
          navigate("/auth");
          return;
        }
        setShowAddProduct(true);
      } catch {
        setShowSellLoading(false);
        toast({ title: "Erreur", description: "Impossible de charger votre profil", variant: "destructive" });
      }
      return;
    }

    if (profile.user_type !== "producer") {
      toast({ title: "Compte producteur requis", description: "Inscrivez-vous comme producteur pour vendre" });
      navigate("/auth");
      return;
    }
    
    setShowAddProduct(true);
  };

  const isActive = (href: string) => {
    if (href === "/") return location.pathname === "/";
    return location.pathname.startsWith(href.split("?")[0]);
  };

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-card/98 backdrop-blur-lg border-t border-border lg:hidden">
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

          <div className="relative -mt-5">
            <button onClick={handleSellClick}
              className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg text-primary-foreground hover:opacity-90 transition-all active:scale-95">
              {showSellLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-6 h-6" />}
            </button>
            <span className="absolute -bottom-3.5 left-1/2 -translate-x-1/2 text-[9px] font-semibold text-primary whitespace-nowrap">
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

      {profile && profile.user_type === "producer" && (
        <AddProductModal
          open={showAddProduct}
          onOpenChange={setShowAddProduct}
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
