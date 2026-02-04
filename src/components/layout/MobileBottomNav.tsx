import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Home, LayoutGrid, Store, MessageCircle, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import AddProductModal from "@/components/dashboard/AddProductModal";
import CategorySheet from "./CategorySheet";
import { useToast } from "@/hooks/use-toast";

const MobileBottomNav = () => {
  const location = useLocation();
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [showCategories, setShowCategories] = useState(false);

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
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", userId)
      .single();
    setProfile(data);
  };

  const handleSellClick = () => {
    if (!user) {
      toast({
        title: "Connexion requise",
        description: "Connectez-vous pour vendre vos produits",
        variant: "destructive",
      });
      return;
    }
    
    if (profile?.user_type !== "producer") {
      toast({
        title: "Compte producteur requis",
        description: "Seuls les producteurs peuvent vendre des produits",
      });
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
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/98 backdrop-blur-lg border-t border-border lg:hidden safe-area-inset-bottom">
        <div className="flex items-center justify-around h-16 relative px-2">
          {/* Home */}
          <Link
            to="/"
            className={`flex flex-col items-center justify-center gap-0.5 px-3 py-2 rounded-lg transition-colors min-w-[56px] ${
              isActive("/")
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Home className={`w-5 h-5 ${isActive("/") ? "fill-primary/20" : ""}`} />
            <span className="text-[10px] font-medium">Accueil</span>
          </Link>

          {/* Categories */}
          <button
            onClick={() => setShowCategories(true)}
            className="flex flex-col items-center justify-center gap-0.5 px-3 py-2 rounded-lg transition-colors text-muted-foreground hover:text-foreground min-w-[56px]"
          >
            <LayoutGrid className="w-5 h-5" />
            <span className="text-[10px] font-medium">Catégories</span>
          </button>

          {/* Center Sell Button */}
          <div className="relative -mt-6">
            <button
              onClick={handleSellClick}
              className="w-14 h-14 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-elevated text-primary-foreground hover:opacity-90 transition-opacity active:scale-95"
            >
              <Plus className="w-7 h-7" />
            </button>
            <span className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-[10px] font-semibold text-primary whitespace-nowrap">
              Vendre
            </span>
          </div>

          {/* Marketplace */}
          <Link
            to="/marketplace"
            className={`flex flex-col items-center justify-center gap-0.5 px-3 py-2 rounded-lg transition-colors min-w-[56px] ${
              isActive("/marketplace")
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Store className={`w-5 h-5 ${isActive("/marketplace") ? "fill-primary/20" : ""}`} />
            <span className="text-[10px] font-medium">Marché</span>
          </Link>

          {/* Messages */}
          <Link
            to="/messages"
            className={`flex flex-col items-center justify-center gap-0.5 px-3 py-2 rounded-lg transition-colors min-w-[56px] ${
              isActive("/messages")
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <MessageCircle className={`w-5 h-5 ${isActive("/messages") ? "fill-primary/20" : ""}`} />
            <span className="text-[10px] font-medium">Messages</span>
          </Link>
        </div>
      </nav>
      
      {/* Category Sheet */}
      <CategorySheet open={showCategories} onOpenChange={setShowCategories} />

      {/* Add Product Modal */}
      {profile && (
        <AddProductModal
          open={showAddProduct}
          onOpenChange={setShowAddProduct}
          profileId={profile.id}
          onProductAdded={() => {
            toast({
              title: "Produit publié !",
              description: "Votre produit est visible sur le marketplace",
            });
          }}
        />
      )}
    </>
  );
};

export default MobileBottomNav;
