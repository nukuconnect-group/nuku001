import { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import MobileBottomNav from "@/components/layout/MobileBottomNav";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bell, ShoppingCart, MessageCircle, Package, Check, Trash2, Loader2, ArrowRight, Star, Truck } from "lucide-react";
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
  { key: "all", label: "Tout" },
  { key: "order", label: "Commandes" },
  { key: "message", label: "Messages" },
  { key: "product", label: "Produits" },
  { key: "delivery", label: "Livraison" },
  { key: "system", label: "Système" },
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
        .from("notifications" as any)
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      setNotifications((data || []) as unknown as Notification[]);
      setIsLoading(false);
    };
    fetchNotifs();

    const channel = supabase
      .channel("notifications-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications" }, (payload) => {
        const newNotif = payload.new as any;
        if (newNotif.user_id === userId) {
          setNotifications((prev) => [newNotif as Notification, ...prev]);
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [userId]);

  const filteredNotifications = useMemo(() => {
    if (activeTab === "all") return notifications;
    return notifications.filter(n => {
      if (activeTab === "system") return !["order", "message", "product", "delivery", "review"].includes(n.type);
      return n.type === activeTab;
    });
  }, [notifications, activeTab]);

  const unreadCount = notifications.filter((n) => !n.is_read).length;
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: notifications.length };
    notifications.forEach(n => {
      const cat = ["order", "message", "product", "delivery"].includes(n.type) ? n.type : "system";
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return counts;
  }, [notifications]);

  const getIcon = (type: string) => {
    switch (type) {
      case "order": return <ShoppingCart className="w-5 h-5 text-primary" />;
      case "message": return <MessageCircle className="w-5 h-5 text-secondary" />;
      case "product": return <Package className="w-5 h-5 text-primary" />;
      case "delivery": return <Truck className="w-5 h-5 text-primary" />;
      case "review": return <Star className="w-5 h-5 text-accent" />;
      default: return <Bell className="w-5 h-5 text-muted-foreground" />;
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
      await supabase.from("notifications" as any).update({ is_read: true } as any).eq("id", notif.id);
      setNotifications((prev) => prev.map((n) => n.id === notif.id ? { ...n, is_read: true } : n));
    }
    const link = getNotifLink(notif);
    if (link) navigate(link);
  };

  const timeAgo = (date: string) => {
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "À l'instant";
    if (mins < 60) return `Il y a ${mins} min`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `Il y a ${hrs}h`;
    const days = Math.floor(hrs / 24);
    return `Il y a ${days}j`;
  };

  const markAllAsRead = async () => {
    if (!userId) return;
    await supabase.from("notifications" as any).update({ is_read: true } as any).eq("user_id", userId).eq("is_read", false);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  };

  const deleteNotification = async (id: string) => {
    await supabase.from("notifications" as any).delete().eq("id", id);
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const deleteAllInCategory = async () => {
    if (!userId) return;
    const ids = filteredNotifications.map(n => n.id);
    if (ids.length === 0) return;
    for (const id of ids) {
      await supabase.from("notifications" as any).delete().eq("id", id);
    }
    setNotifications(prev => prev.filter(n => !ids.includes(n.id)));
  };

  return (
    <div className="min-h-screen bg-background pb-14 lg:pb-0">
      <Header />
      <main>
        <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6">
          <div className="max-w-2xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Bell className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                </div>
                <div>
                  <h1 className="font-heading text-base sm:text-xl font-bold text-foreground">Notifications</h1>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">{unreadCount} non lue(s)</p>
                </div>
              </div>
              {unreadCount > 0 && (
                <Button variant="outline" size="sm" className="gap-1 text-[10px] sm:text-xs h-7 sm:h-8 px-2 sm:px-3" onClick={markAllAsRead}>
                  <Check className="w-3 h-3 sm:w-3.5 sm:h-3.5" />Tout lire
                </Button>
              )}
            </div>

            {/* Category summary cards on mobile */}
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5 sm:gap-2 mb-3 sm:mb-4">
              {CATEGORIES.filter(c => c.key !== "all").map(cat => {
                const count = categoryCounts[cat.key] || 0;
                const iconMap: Record<string, React.ReactNode> = {
                  order: <ShoppingCart className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary" />,
                  message: <MessageCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-secondary" />,
                  product: <Package className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary" />,
                  delivery: <Truck className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary" />,
                  system: <Bell className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground" />,
                };
                return (
                  <button
                    key={cat.key}
                    onClick={() => setActiveTab(cat.key === activeTab ? "all" : cat.key)}
                    className={`flex flex-col items-center gap-1 p-2 sm:p-3 rounded-xl border transition-all ${
                      activeTab === cat.key
                        ? "border-primary bg-primary/5 shadow-sm"
                        : "border-border bg-card hover:bg-muted/50"
                    }`}
                  >
                    {iconMap[cat.key]}
                    <span className="text-[9px] sm:text-[10px] font-medium text-foreground leading-tight text-center">{cat.label}</span>
                    {count > 0 && (
                      <Badge variant="secondary" className="text-[8px] sm:text-[9px] px-1 py-0 h-3.5 sm:h-4 min-w-[14px]">
                        {count}
                      </Badge>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Active filter + delete */}
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] sm:text-xs text-muted-foreground">
                {activeTab === "all" ? "Toutes les notifications" : CATEGORIES.find(c => c.key === activeTab)?.label}
                {" "}({filteredNotifications.length})
              </p>
              {filteredNotifications.length > 0 && (
                <Button variant="ghost" size="sm" className="text-[10px] sm:text-xs text-destructive gap-1 h-6 sm:h-7 px-2" onClick={deleteAllInCategory}>
                  <Trash2 className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                  Supprimer
                </Button>
              )}
            </div>

            {/* Notifications list */}
            <div className="space-y-1.5 sm:space-y-2">
              {isLoading ? (
                <div className="flex justify-center py-16">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : filteredNotifications.length === 0 ? (
                <Card>
                  <CardContent className="p-6 sm:p-8 text-center">
                    <Bell className="w-10 h-10 sm:w-12 sm:h-12 text-muted-foreground/50 mx-auto mb-3" />
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      {userId ? "Aucune notification" : "Connectez-vous pour voir vos notifications"}
                    </p>
                  </CardContent>
                </Card>
              ) : (
                filteredNotifications.map((notif) => (
                  <Card 
                    key={notif.id} 
                    className={`transition-all cursor-pointer hover:shadow-md ${!notif.is_read ? "border-primary/20 bg-primary/5" : "hover:bg-muted/30"}`}
                    onClick={() => handleNotifClick(notif)}
                  >
                    <CardContent className="p-2.5 sm:p-4">
                      <div className="flex items-start gap-2 sm:gap-3">
                        <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                          notif.is_read ? "bg-muted" : "bg-primary/10"
                        }`}>
                          {getIcon(notif.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 sm:gap-2">
                            <p className={`text-xs sm:text-sm font-medium truncate ${notif.is_read ? "text-muted-foreground" : "text-foreground"}`}>
                              {notif.title}
                            </p>
                            {!notif.is_read && <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-primary flex-shrink-0" />}
                          </div>
                          {notif.description && (
                            <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 line-clamp-2">{notif.description}</p>
                          )}
                          <div className="flex items-center gap-2 mt-1">
                            <p className="text-[9px] sm:text-[10px] text-muted-foreground">{timeAgo(notif.created_at)}</p>
                            {getNotifLink(notif) && (
                              <span className="text-[9px] sm:text-[10px] text-primary font-medium flex items-center gap-0.5">
                                Voir <ArrowRight className="w-2 h-2 sm:w-2.5 sm:h-2.5" />
                              </span>
                            )}
                          </div>
                        </div>
                        <Button variant="ghost" size="icon" className="h-6 w-6 sm:h-8 sm:w-8 text-muted-foreground hover:text-destructive flex-shrink-0"
                          onClick={(e) => { e.stopPropagation(); deleteNotification(notif.id); }}>
                          <Trash2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>
        </div>
      </main>
      <Footer />
      <MobileBottomNav />
    </div>
  );
};

export default Notifications;
