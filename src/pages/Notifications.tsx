import SEO from "@/components/SEO";
import { useCallback, useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/layout/Header";
import MobileBottomNav from "@/components/layout/MobileBottomNav";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Bell, ShoppingCart, MessageCircle, Package, Check, Trash2,
  Star, Truck, CreditCard, Heart, ChevronRight
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ListSkeleton } from "@/components/layout/SectionSkeletons";
import { cacheGet, cacheSet } from "@/lib/localCache";

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

const NOTIFICATIONS_LIMIT = 80;
const notificationsCacheKey = (userId: string) => `notifications:${userId}:v2`;

const Notifications = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [userId, setUserId] = useState<string | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const queryKey = useMemo(() => ["notifications", userId] as const, [userId]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id ?? null);
      setAuthReady(true);
    });
  }, []);

  const { data: notifications = [], isLoading } = useQuery<Notification[]>({
    queryKey,
    enabled: Boolean(userId),
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from("notifications")
        .select("id, type, title, description, product_id, is_read, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(NOTIFICATIONS_LIMIT);
      if (error) throw error;
      const rows = (data || []) as unknown as Notification[];
      cacheSet(notificationsCacheKey(userId), rows, 1000 * 60 * 10);
      return rows;
    },
    initialData: () => userId ? cacheGet<Notification[]>(notificationsCacheKey(userId))?.data : undefined,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
  });

  const updateNotifications = useCallback((updater: (current: Notification[]) => Notification[]) => {
    if (!userId) return;
    queryClient.setQueryData<Notification[]>(queryKey, (current = []) => {
      const next = updater(current);
      cacheSet(notificationsCacheKey(userId), next, 1000 * 60 * 10);
      return next;
    });
  }, [queryClient, queryKey, userId]);

  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel("notifications-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` }, (payload) => {
        updateNotifications((prev) => [payload.new as Notification, ...prev].slice(0, NOTIFICATIONS_LIMIT));
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [userId, updateNotifications]);

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
    const title = (notif.title || "").toLowerCase();
    switch (notif.type) {
      case "order": return "/dashboard";
      case "message": return "/messages";
      case "product": return notif.product_id ? `/produit/${notif.product_id}` : "/marketplace";
      case "delivery":
        if (title.includes("livraison disponible") || title.includes("livreur")) return "/driver-dashboard";
        return "/suivi-livraison";
      case "kyc":
        if (title.includes("livreur")) return "/driver-dashboard";
        return "/dashboard";
      case "review": return notif.product_id ? `/produit/${notif.product_id}` : null;
      case "withdrawal": return "/dashboard";
      default: return notif.product_id ? `/produit/${notif.product_id}` : null;
    }
  };

  const handleNotifClick = async (notif: Notification) => {
    // Mark as read on first interaction
    if (!notif.is_read) {
      await supabase.from("notifications").update({ is_read: true }).eq("id", notif.id);
      updateNotifications((prev) => prev.map((n) => n.id === notif.id ? { ...n, is_read: true } : n));
      window.dispatchEvent(new CustomEvent("nuku:notifications-updated"));
    }
    // First tap = expand full content in place; second tap = navigate.
    if (expandedId !== notif.id) {
      setExpandedId(notif.id);
      return;
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
    updateNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    await supabase.from("notifications").update({ is_read: true }).eq("user_id", userId).eq("is_read", false);
    window.dispatchEvent(new CustomEvent("nuku:notifications-updated"));
  };

  const deleteNotification = async (id: string) => {
    await supabase.from("notifications").delete().eq("id", id);
    updateNotifications((prev) => prev.filter((n) => n.id !== id));
    window.dispatchEvent(new CustomEvent("nuku:notifications-updated"));
  };

  const deleteAllInCategory = async () => {
    if (!userId) return;
    const ids = filteredNotifications.map(n => n.id);
    if (ids.length === 0) return;
    await supabase.from("notifications").delete().in("id", ids);
    updateNotifications(prev => prev.filter(n => !ids.includes(n.id)));
    window.dispatchEvent(new CustomEvent("nuku:notifications-updated"));
  };

  const showLoading = !authReady || (!!userId && isLoading && notifications.length === 0);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SEO url="/notifications" title="Notifications" description="Restez informé de vos commandes, messages et activités sur NUKUCONNECT." noIndex />
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
              {showLoading ? (
                <ListSkeleton count={7} />
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
