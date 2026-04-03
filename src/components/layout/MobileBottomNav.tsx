import { useState, useEffect, useCallback } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Home, Store, MessageCircle, Plus, Loader2, UserCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/contexts/ProfileContext";
import AddProductModal from "@/components/dashboard/AddProductModal";
import AccountSidebar from "./AccountSidebar";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const MobileBottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, profile: ctxProfile } = useProfile();
  const [profile, setProfile] = useState<any>(null);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [showAccount, setShowAccount] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showSellLoading, setShowSellLoading] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [showBecomeSellerDialog, setShowBecomeSellerDialog] = useState(false);

  // Sync profile from context
  useEffect(() => {
    setProfile(ctxProfile);
  }, [ctxProfile]);

  // Fetch unread messages count
  const fetchUnreadMessages = useCallback(async (profileId: string) => {
    const { count } = await supabase
      .from("messages")
      .select("id", { count: "exact", head: true })
      .neq("sender_id", profileId)
      .eq("is_read", false);
    setUnreadMessages(count || 0);
  }, []);

  useEffect(() => {
    if (!profile?.id) return;
    fetchUnreadMessages(profile.id);

    const channel = supabase
      .channel("mobile-unread-messages")
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, () => {
        fetchUnreadMessages(profile.id);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [profile?.id, fetchUnreadMessages]);

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    setProfile(data);
  };

  const handleSellClick = async () => {
    if (!user) {
      toast({ title: "Connexion requise", description: "Connectez-vous pour vendre vos produits" });
      navigate("/auth");
      return;
    }

    setShowSellLoading(true);
    try {
      const [{ data, error }, { data: subscription }] = await Promise.all([
        supabase
          .from("profiles")
          .select("*")
          .eq("user_id", user.id)
          .single(),
        supabase
          .from("subscriptions")
          .select("plan, status")
          .eq("user_id", user.id)
          .maybeSingle(),
      ]);
      
      setProfile(data);
      setShowSellLoading(false);
      
      if (!data || (data.user_type !== "producer" && data.user_type !== "trainer")) {
        setShowSellLoading(false);
        setShowBecomeSellerDialog(true);
        return;
      }

      if (!subscription || subscription.status !== "active") {
        toast({ title: "Pack requis", description: "Choisissez d'abord un pack d'adhésion pour publier vos produits." });
        navigate("/plans");
        return;
      }
      
      setShowAddProduct(true);
    } catch (err) {
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

          <Link to="/marketplace"
            className={`flex flex-col items-center justify-center gap-0.5 px-2 py-1.5 rounded-lg transition-colors min-w-[48px] ${
              isActive("/marketplace") ? "text-primary" : "text-muted-foreground hover:text-foreground"
            }`}>
            <Store className="w-5 h-5" />
            <span className="text-[9px] font-medium">Marché</span>
          </Link>

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

          <Link to="/messages"
            className={`flex flex-col items-center justify-center gap-0.5 px-2 py-1.5 rounded-lg transition-colors min-w-[48px] relative ${
              isActive("/messages") ? "text-primary" : "text-muted-foreground hover:text-foreground"
            }`}>
            <div className="relative">
              <MessageCircle className="w-5 h-5" />
              {unreadMessages > 0 && (
                <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 px-1 bg-destructive text-white rounded-full text-[9px] flex items-center justify-center font-bold">
                  {unreadMessages > 99 ? "99+" : unreadMessages}
                </span>
              )}
            </div>
            <span className="text-[9px] font-medium">Messages</span>
          </Link>

          <button onClick={() => setShowAccount(true)}
            className={`flex flex-col items-center justify-center gap-0.5 px-2 py-1.5 rounded-lg transition-colors min-w-[48px] text-muted-foreground hover:text-foreground`}>
            <UserCircle className="w-5 h-5" />
            <span className="text-[9px] font-medium">Compte</span>
          </button>
        </div>
      </nav>
      
      <AccountSidebar isOpen={showAccount} onClose={() => setShowAccount(false)} />

      {/* Become Seller Dialog */}
      <AlertDialog open={showBecomeSellerDialog} onOpenChange={setShowBecomeSellerDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Store className="w-5 h-5 text-primary" />
              Devenez fournisseur
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm">
              Pour publier des produits et vendre sur NukuConnect, vous devez d'abord devenir fournisseur. 
              Cela vous donnera accès à un tableau de bord dédié pour gérer vos produits et commandes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-xs">Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="gap-1.5 text-xs"
              onClick={() => {
                setShowBecomeSellerDialog(false);
                navigate("/devenir-fournisseur");
              }}
            >
              <Store className="w-3.5 h-3.5" />
              Devenir fournisseur
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {profile && (
        <AddProductModal
          open={showAddProduct && (profile.user_type === "producer" || profile.user_type === "trainer")}
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
