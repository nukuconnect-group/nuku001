import { useState, useEffect, useCallback, lazy, Suspense } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Home, Store, MessageCircle, Plus, Loader2, UserCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/contexts/ProfileContext";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const AddProductModal = lazy(() => import("@/components/dashboard/AddProductModal"));
const AddFormationModal = lazy(() => import("@/components/dashboard/AddFormationModal"));
const PublishChoiceModal = lazy(() => import("@/components/dashboard/PublishChoiceModal"));
const AccountSidebar = lazy(() => import("./AccountSidebar"));

const MobileBottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, profile: ctxProfile } = useProfile();
  const [profile, setProfile] = useState<any>(null);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [showAddFormation, setShowAddFormation] = useState(false);
  const [showPublishChoice, setShowPublishChoice] = useState(false);
  const [showAccount, setShowAccount] = useState(false);
  const [showProductSubmittedDialog, setShowProductSubmittedDialog] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showSellLoading, setShowSellLoading] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [showBecomeSellerDialog, setShowBecomeSellerDialog] = useState(false);

  // Sync profile from context
  useEffect(() => {
    setProfile(ctxProfile);
  }, [ctxProfile]);

  // Fetch unread messages count (RLS limits to user's conversations)
  const fetchUnreadMessages = useCallback(async (profileId: string, uid: string | undefined) => {
    const { count: msgCount } = await supabase
      .from("messages")
      .select("id", { count: "exact", head: true })
      .neq("sender_id", profileId)
      .eq("is_read", false);
    let total = msgCount || 0;
    if (uid) {
      const { count: dmCount } = await supabase
        .from("delivery_messages")
        .select("id", { count: "exact", head: true })
        .neq("sender_id", uid)
        .eq("is_read", false);
      total += dmCount || 0;
    }
    setUnreadMessages(total);
  }, []);

  useEffect(() => {
    if (!profile?.id) return;
    const refresh = () => fetchUnreadMessages(profile.id, user?.id);
    refresh();

    const channel = supabase
      .channel("mobile-unread-messages")
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "delivery_messages" }, refresh)
      .subscribe();

    // Instant local decrement when a conversation is read in this tab.
    // The server count refetch then reconciles any drift.
    const onRead = (e: Event) => {
      const detail = (e as CustomEvent).detail || {};
      const decrement = typeof detail.decrement === "number" ? detail.decrement : null;
      if (decrement && decrement > 0) {
        setUnreadMessages((prev) => Math.max(0, prev - decrement));
      }
      refresh();
    };
    const onFocus = () => refresh();
    const onVisibility = () => {
      if (document.visibilityState === "visible") refresh();
    };
    const onOnline = () => refresh();
    window.addEventListener("nuku:messages-read", onRead as EventListener);
    window.addEventListener("focus", onFocus);
    window.addEventListener("online", onOnline);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener("nuku:messages-read", onRead as EventListener);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("online", onOnline);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [profile?.id, user?.id, fetchUnreadMessages]);

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
      
      setShowPublishChoice(true);
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
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-card border-t border-border lg:hidden pb-[env(safe-area-inset-bottom)]">
        <div className="flex items-stretch justify-around h-12 sm:h-14 relative px-0.5 sm:px-1 gap-0.5">
          <Link to="/"
            className={`flex flex-col items-center justify-center gap-0.5 px-1 sm:px-2 py-1 rounded-lg transition-colors flex-1 min-w-0 ${
              isActive("/") ? "text-primary" : "text-muted-foreground hover:text-foreground"
            }`}>
            <Home className="w-[18px] h-[18px] sm:w-5 sm:h-5" />
            <span className="text-[8px] sm:text-[9px] font-medium leading-none">Accueil</span>
          </Link>

          <Link to="/marketplace"
            className={`flex flex-col items-center justify-center gap-0.5 px-1 sm:px-2 py-1 rounded-lg transition-colors flex-1 min-w-0 ${
              isActive("/marketplace") ? "text-primary" : "text-muted-foreground hover:text-foreground"
            }`}>
            <Store className="w-[18px] h-[18px] sm:w-5 sm:h-5" />
            <span className="text-[8px] sm:text-[9px] font-medium leading-none">Marché</span>
          </Link>

          <div className="flex flex-col items-center justify-center -mt-4 sm:-mt-5 flex-1 min-w-0">
            <div className="relative">
              <div className="absolute -inset-1 rounded-full bg-primary/20 blur-md animate-pulse" />
              <button onClick={handleSellClick}
                aria-label="Vendre"
                className="relative w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-primary via-primary/90 to-accent flex items-center justify-center shadow-[0_4px_20px_hsl(var(--primary)/0.4)] text-primary-foreground hover:shadow-[0_6px_28px_hsl(var(--primary)/0.55)] transition-all duration-300 active:scale-90 ring-[3px] ring-background">
                {showSellLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Plus className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2.5]" />
                )}
              </button>
            </div>
            <span className="text-[8px] sm:text-[9px] font-bold text-primary mt-0.5 tracking-wide leading-none">Vendre</span>
          </div>

          <Link to="/messages"
            className={`flex flex-col items-center justify-center gap-0.5 px-1 sm:px-2 py-1 rounded-lg transition-colors flex-1 min-w-0 relative ${
              isActive("/messages") ? "text-primary" : "text-muted-foreground hover:text-foreground"
            }`}>
            <div className="relative">
              <MessageCircle className="w-[18px] h-[18px] sm:w-5 sm:h-5" />
              {unreadMessages > 0 && (
                <span className="absolute -top-1.5 -right-2 min-w-[14px] h-3.5 px-1 bg-destructive text-white rounded-full text-[8px] sm:text-[9px] flex items-center justify-center font-bold leading-none">
                  {unreadMessages > 99 ? "99+" : unreadMessages}
                </span>
              )}
            </div>
            <span className="text-[8px] sm:text-[9px] font-medium leading-none">Messages</span>
          </Link>

          <button onClick={() => {
              if (!user) {
                navigate("/auth");
              } else {
                setShowAccount(true);
              }
            }}
            className={`flex flex-col items-center justify-center gap-0.5 px-1 sm:px-2 py-1 rounded-lg transition-colors flex-1 min-w-0 text-muted-foreground hover:text-foreground`}>
            <UserCircle className="w-[18px] h-[18px] sm:w-5 sm:h-5" />
            <span className="text-[8px] sm:text-[9px] font-medium leading-none">Compte</span>
          </button>
        </div>
      </nav>
      
      <Suspense fallback={null}>
        <AccountSidebar isOpen={showAccount} onClose={() => setShowAccount(false)} />
      </Suspense>

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
        <Suspense fallback={null}>
          <PublishChoiceModal
            open={showPublishChoice && (profile.user_type === "producer" || profile.user_type === "trainer")}
            onOpenChange={(open) => { if (!open) setShowPublishChoice(false); }}
            onChoose={(type) => {
              setShowPublishChoice(false);
              if (type === "product") setShowAddProduct(true);
              else setShowAddFormation(true);
            }}
          />
          <AddProductModal
            open={showAddProduct && (profile.user_type === "producer" || profile.user_type === "trainer")}
            onOpenChange={(open) => {
              if (!open) setShowAddProduct(false);
            }}
            profileId={profile.id}
            onProductAdded={() => {
              setShowAddProduct(false);
              setShowProductSubmittedDialog(true);
            }}
          />
          <AddFormationModal
            open={showAddFormation && (profile.user_type === "producer" || profile.user_type === "trainer")}
            onOpenChange={(open) => { if (!open) setShowAddFormation(false); }}
            instructorName={profile.full_name || profile.business_name || "Formateur"}
            onCreated={() => {
              toast({ title: "Formation publiée !", description: "Votre formation est visible dans le module Formations." });
              setShowAddFormation(false);
            }}
          />
        </Suspense>
      )}

      {/* Popup confirmation : produit soumis pour analyse */}
      <AlertDialog open={showProductSubmittedDialog} onOpenChange={setShowProductSubmittedDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Produit soumis avec succès</AlertDialogTitle>
            <AlertDialogDescription>
              Votre produit a été pris en compte. Il sera analysé par l'équipe Nukuconnect dans environ
              <strong> 20 minutes</strong> avant d'être publié sur la marketplace. Vous recevrez une notification dès qu'il sera validé.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setShowProductSubmittedDialog(false)}>
              Compris
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default MobileBottomNav;
