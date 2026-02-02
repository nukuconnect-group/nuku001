import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Home, LayoutGrid, Store, MessageCircle, Plus, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import AccountSidebar from "./AccountSidebar";
import AddProductModal from "@/components/dashboard/AddProductModal";
import { useToast } from "@/hooks/use-toast";

const MobileBottomNav = () => {
  const location = useLocation();
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [showCategoriesSheet, setShowCategoriesSheet] = useState(false);

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

  const navItems = [
    { icon: Home, label: "Accueil", href: "/" },
    { icon: LayoutGrid, label: "Catégories", href: "/marketplace?view=categories" },
  ];

  const rightNavItems = [
    { icon: Store, label: "Marché", href: "/marketplace" },
    { icon: MessageCircle, label: "Messages", href: "/messages" },
  ];

  const isActive = (href: string) => {
    if (href === "/") return location.pathname === "/";
    return location.pathname.startsWith(href.split("?")[0]);
  };

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-lg border-t border-border lg:hidden">
        <div className="flex items-center justify-around h-16 relative">
          {/* Left nav items */}
          {navItems.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                to={item.href}
                className={`flex flex-col items-center justify-center gap-0.5 px-3 py-2 rounded-lg transition-colors ${
                  active
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <item.icon className={`w-5 h-5 ${active ? "fill-primary/20" : ""}`} />
                <span className="text-[10px] font-medium">{item.label}</span>
              </Link>
            );
          })}

          {/* Center Sell Button */}
          <div className="relative -mt-6">
            <button
              onClick={handleSellClick}
              className="w-14 h-14 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-elevated text-primary-foreground hover:opacity-90 transition-opacity"
            >
              <Plus className="w-7 h-7" />
            </button>
            <span className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-[10px] font-medium text-primary whitespace-nowrap">
              Vendre
            </span>
          </div>

          {/* Right nav items */}
          {rightNavItems.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                to={item.href}
                className={`flex flex-col items-center justify-center gap-0.5 px-3 py-2 rounded-lg transition-colors ${
                  active
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <item.icon className={`w-5 h-5 ${active ? "fill-primary/20" : ""}`} />
                <span className="text-[10px] font-medium">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
      
      <AccountSidebar isOpen={isAccountOpen} onClose={() => setIsAccountOpen(false)} />

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
