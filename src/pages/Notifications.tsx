import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/layout/Header";
import MobileBottomNav from "@/components/layout/MobileBottomNav";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Bell, ShoppingCart, MessageCircle, Package, Check, Trash2,
  Loader2, ArrowRight, Star, Truck, CreditCard, Heart, ChevronRight
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Notification {
  id: string;
  type: string;
  title: string;
  description: string | null;
  product_id: string | null;
  is_read: boolean;
  created_at: string;
}

const CATEGORIES = [
  { key: "all", label: "Tout", icon: Bell },
  { key: "order", label: "Commandes", icon: ShoppingCart },
  { key: "message", label: "Messages", icon: MessageCircle },
  { key: "product", label: "Produits", icon: Package },
  { key: "delivery", label: "Livraison", icon: Truck },
  { key: "withdrawal", label: "Retraits", icon: CreditCard },
  { key: "demand", label: "Demandes", icon: Heart },
];

const Notifications = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("all");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id ?? null);
    });
  }, []);

  useEffect(() => {
    if (!userId) { setIsLoading(false); return; }
    const fetchNotifs = async () => {
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      setNotifications((data || []) as unknown as Notification[]);
      setIsLoading(false);
    };
    fetchNotifs();

    const channel = supabase
      .channel("notifications-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` }, (payload) => {
        setNotifications((prev) => [payload.new as Notification, ...prev]);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [userId]);

  const filteredNotifications = useMemo(() => {
    if (activeTab === "all") return notifications;
    return notifications.filter(n => n.type === activeTab);
  }, [notifications, activeTab]);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: notifications.length };
    notifications.forEach(n => {
      counts[n.type] = (counts[n.type] || 0) + 1;
    });
    return counts;
  }, [notifications]);

  const getIcon = (type: string) => {
    const cls = "w-4 h-4";
    switch (type) {
      case "order": return <ShoppingCart className={`${cls} text-primary`} />;
      case "message": return <MessageCircle className={`${cls} text-blue-500`} />;
      case "product": return <Package className={`${cls} text-emerald-500`} />;
      case "delivery": return <Truck className={`${cls} text-orange-500`} />;
      case "subscription": return <CreditCard className={`${cls} text-violet-500`} />;
      case "withdrawal": return <CreditCard className={`${cls} text-amber-500`} />;
      case "demand": return <Heart className={`${cls} text-rose-500`} />;
      case "review": return <Star className={`${cls} text-yellow-500`} />;
      default: return <Bell className={`${cls} text-muted-foreground`} />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "order": return "bg-primary/10 border-primary/20";
      case "message": return "bg-blue-500/10 border-blue-500/20";
      case "delivery": return "bg-orange-500/10 border-orange-500/20";
      case "product": return "bg-emerald-500/10 border-emerald-500/20";
      case "subscription": return "bg-violet-500/10 border-violet-500/20";
      case "withdrawal": return "bg-amber-500/10 border-amber-500/20";
      case "demand": return "bg-rose-500/10 border-rose-500/20";
      default: return "bg-muted border-border";
    }
  };

  const getNotifLink = (notif: Notification): string | null => {
    switch (notif.type) {
      case "order": return "/acheteur";
      case "message": return "/messages";
      case "product": return notif.product_id ? `/produit/${notif.product_id}` : "/marketplace";
      case "delivery": return "/suivi-livraison";
      case "review": return notif.product_id ? `/produit/${notif.product_id}` : null;
      default: return notif.product_id ? `/produit/${notif.product_id}` : null;
    }
  };

  const handleNotifClick = async (notif: Notification) => {
    if (!notif.is_read) {
      await supabase.from("notifications").update({ is_read: true }).eq("id", notif.id);
      setNotifications((prev) => prev.map((n) => n.id === notif.id ? { ...n, is_read: true } : n));
    }
    const link = getNotifLink(notif);
    if (link) navigate(link);
  };

  const timeAgo = (date: string) => {
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "À l'instant";
    if (mins < 60) return `${mins}min`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h`;
    const days = Math.floor(hrs / 24);
    return `${days}j`;
  };

  const markAllAsRead = async () => {
    if (!userId) return;
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    await supabase.from("notifications").update({ is_read: true }).eq("user_id", userId).eq("is_read", false);
  };

  const deleteNotification = async (id: string) => {
    await supabase.from("notifications").delete().eq("id", id);
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const deleteAllInCategory = async () => {
    if (!userId) return;
    const ids = filteredNotifications.map(n => n.id);
    if (ids.length === 0) return;
    for (const id of ids) {
      await supabase.from("notifications").delete().eq("id", id);
    }
    setNotifications(prev => prev.filter(n => !ids.includes(n.id)));
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1 overflow-y-auto pb-20 lg:pb-0">
        <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6">
          <div className="max-w-2xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Bell className="w-[18px] h-[18px] text-primary" />
                </div>
                <div>
                  <h1 className="text-[15px] sm:text-xl font-semibold tracking-tight text-foreground">Notifications</h1>
                  {unreadCount > 0 && (
                    <p className="text-[11px] sm:text-xs text-muted-foreground">{unreadCount} non lue{unreadCount > 1 ? "s" : ""}</p>
                  )}
                </div>
              </div>
              {unreadCount > 0 && (
                <Button variant="ghost" size="sm" className="text-[11px] h-7 px-2 text-primary hover:text-primary gap-1" onClick={markAllAsRead}>
                  <Check className="w-3 h-3" />Tout lire
                </Button>
              )}
            </div>

            {/* Category filter pills */}
            <div className="flex gap-1.5 overflow-x-auto pb-2 mb-3 -mx-3 px-3 sm:mx-0 sm:px-0 scrollbar-none">
              {CATEGORIES.map(cat => {
                const count = categoryCounts[cat.key] || 0;
                const isActive = activeTab === cat.key;
                return (
                  <button
                    key={cat.key}
                    onClick={() => setActiveTab(cat.key)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] sm:text-xs font-medium whitespace-nowrap transition-all border flex-shrink-0 ${
                      isActive
                        ? "bg-primary text-primary-foreground border-primary shadow-sm"
                        : "bg-card text-muted-foreground border-border hover:bg-muted/50 hover:text-foreground"
                    }`}
                  >
                    {cat.label}
                    {count > 0 && (
                      <span className={`text-[9px] px-1 py-0 rounded-full min-w-[16px] text-center ${
                        isActive ? "bg-primary-foreground/20 text-primary-foreground" : "bg-muted text-muted-foreground"
                      }`}>
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Active filter info + delete */}
            {activeTab !== "all" && filteredNotifications.length > 0 && (
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] text-muted-foreground">
                  {CATEGORIES.find(c => c.key === activeTab)?.label} ({filteredNotifications.length})
                </p>
                <Button variant="ghost" size="sm" className="text-[10px] text-destructive gap-1 h-6 px-2" onClick={deleteAllInCategory}>
                  <Trash2 className="w-2.5 h-2.5" />Supprimer tout
                </Button>
              </div>
            )}

            {/* Notifications list */}
            <div className="space-y-1">
              {isLoading ? (
                <div className="flex justify-center py-16">
                  <Loader2 className="w-7 h-7 animate-spin text-primary" />
                </div>
              ) : filteredNotifications.length === 0 ? (
                <div className="py-12 text-center">
                  <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                    <Bell className="w-5 h-5 text-muted-foreground/40" />
                  </div>
                  <p className="text-sm font-medium text-muted-foreground">
                    {userId ? "Aucune notification" : "Connectez-vous pour voir vos notifications"}
                  </p>
                  <p className="text-xs text-muted-foreground/70 mt-0.5">Vos alertes apparaîtront ici</p>
                </div>
              ) : (
                filteredNotifications.map((notif) => (
                  <div
                    key={notif.id}
                    onClick={() => handleNotifClick(notif)}
                    className={`flex items-start gap-3 px-3 py-3 rounded-xl cursor-pointer transition-all border ${
                      !notif.is_read
                        ? "bg-primary/[0.03] border-primary/10 hover:bg-primary/[0.06]"
                        : "bg-card border-border/50 hover:bg-muted/40"
                    }`}
                  >
                    {/* Icon */}
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 border ${getTypeColor(notif.type)}`}>
                      {getIcon(notif.type)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={`text-[12px] leading-snug line-clamp-1 ${
                          notif.is_read ? "text-muted-foreground font-normal" : "text-foreground font-semibold"
                        }`}>
                          {notif.title}
                        </p>
                        <span className="text-[10px] text-muted-foreground/70 flex-shrink-0 mt-0.5">
                          {timeAgo(notif.created_at)}
                        </span>
                      </div>
                      {notif.description && (
                        <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed mt-0.5">
                          {notif.description}
                        </p>
                      )}
                      {getNotifLink(notif) && (
                        <span className="inline-flex items-center gap-0.5 text-[10px] text-primary font-medium mt-1">
                          Voir <ChevronRight className="w-2.5 h-2.5" />
                        </span>
                      )}
                    </div>

                    {/* Unread dot + delete */}
                    <div className="flex flex-col items-center gap-2 flex-shrink-0">
                      {!notif.is_read && (
                        <div className="w-2 h-2 rounded-full bg-primary mt-1" />
                      )}
                      <button
                        className="p-1 rounded-md text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10 transition-colors"
                        onClick={(e) => { e.stopPropagation(); deleteNotification(notif.id); }}
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </main>
      <MobileBottomNav />
    </div>
  );
};

export default Notifications;
