import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import MobileBottomNav from "@/components/layout/MobileBottomNav";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Bell, ShoppingCart, MessageCircle, Package, Check, Trash2, Loader2 } from "lucide-react";
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

const Notifications = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

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

    // Realtime subscription
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

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const getIcon = (type: string) => {
    switch (type) {
      case "order": return <ShoppingCart className="w-5 h-5 text-primary" />;
      case "message": return <MessageCircle className="w-5 h-5 text-secondary" />;
      case "product": return <Package className="w-5 h-5 text-primary" />;
      default: return <Bell className="w-5 h-5 text-muted-foreground" />;
    }
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

  return (
    <div className="min-h-screen bg-background pb-14 lg:pb-0">
      <Header />
      <main>
        <div className="container mx-auto px-3 sm:px-4 py-6">
          <div className="max-w-2xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Bell className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h1 className="font-heading text-lg sm:text-xl font-bold text-foreground">Notifications</h1>
                  <p className="text-xs text-muted-foreground">{unreadCount} non lue(s)</p>
                </div>
              </div>
              {unreadCount > 0 && (
                <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={markAllAsRead}>
                  <Check className="w-3.5 h-3.5" />Tout lire
                </Button>
              )}
            </div>

            <div className="space-y-2">
              {isLoading ? (
                <div className="flex justify-center py-16">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : notifications.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <Bell className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">
                      {userId ? "Aucune notification" : "Connectez-vous pour voir vos notifications"}
                    </p>
                  </CardContent>
                </Card>
              ) : (
                notifications.map((notif) => (
                  <Card key={notif.id} className={`transition-all ${!notif.is_read ? "border-primary/20 bg-primary/5" : ""}`}>
                    <CardContent className="p-3 sm:p-4">
                      <div className="flex items-start gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                          notif.is_read ? "bg-muted" : "bg-primary/10"
                        }`}>
                          {getIcon(notif.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className={`text-sm font-medium ${notif.is_read ? "text-muted-foreground" : "text-foreground"}`}>
                              {notif.title}
                            </p>
                            {!notif.is_read && <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">{notif.description}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <p className="text-[10px] text-muted-foreground">{timeAgo(notif.created_at)}</p>
                            {notif.product_id && (
                              <Link to={`/produit/${notif.product_id}`} className="text-[10px] text-primary font-medium">
                                Voir le produit →
                              </Link>
                            )}
                          </div>
                        </div>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive flex-shrink-0"
                          onClick={() => deleteNotification(notif.id)}>
                          <Trash2 className="w-3.5 h-3.5" />
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
