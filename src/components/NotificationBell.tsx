import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Bell, ShoppingCart, MessageCircle, Package, Check, Truck, AlertCircle, ChevronRight, CreditCard, Star, Heart } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/contexts/ProfileContext";
import { useIsMobile } from "@/hooks/use-mobile";

interface Notification {
  id: string;
  type: string;
  title: string;
  description: string | null;
  created_at: string;
  is_read: boolean;
}

const NotificationBell = () => {
  const { user } = useProfile();
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const MAX_VISIBLE = 5;

  useEffect(() => {
    if (!user?.id) return;
    const fetchNotifications = async () => {
      const { data } = await supabase
        .from("notifications")
        .select("id, type, title, description, created_at, is_read")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);
      if (data) setNotifications(data);
    };
    fetchNotifications();

    const channel = supabase
      .channel("notif-bell")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` }, (payload) => {
        setNotifications(prev => [payload.new as Notification, ...prev].slice(0, 20));
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` }, (payload) => {
        setNotifications(prev => prev.map(n => n.id === (payload.new as Notification).id ? (payload.new as Notification) : n));
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user?.id]);

  const unreadCount = notifications.filter(n => !n.is_read).length;
  const visibleNotifications = notifications.slice(0, MAX_VISIBLE);
  const remainingCount = Math.max(0, notifications.length - MAX_VISIBLE);

  const getIcon = (type: string) => {
    switch (type) {
      case "order": return <ShoppingCart className="w-4 h-4 text-primary" />;
      case "message": return <MessageCircle className="w-4 h-4 text-blue-500" />;
      case "delivery": return <Truck className="w-4 h-4 text-orange-500" />;
      case "product": return <Package className="w-4 h-4 text-emerald-500" />;
      case "subscription": return <CreditCard className="w-4 h-4 text-violet-500" />;
      case "withdrawal": return <CreditCard className="w-4 h-4 text-amber-500" />;
      case "demand": return <Heart className="w-4 h-4 text-rose-500" />;
      default: return <Bell className="w-4 h-4 text-muted-foreground" />;
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

  const markAllAsRead = async () => {
    if (!user?.id) return;
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    await supabase.from("notifications").update({ is_read: true }).eq("user_id", user.id).eq("is_read", false);
  };

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "À l'instant";
    if (mins < 60) return `${mins}min`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    return `${days}j`;
  };

  const bellButton = (
    <Button
      variant="ghost"
      size="icon"
      className="relative"
    >
      <Bell className="w-5 h-5" />
      {unreadCount > 0 && (
        <Badge className="absolute -top-1 -right-1 w-5 h-5 p-0 flex items-center justify-center text-[10px] bg-destructive border-2 border-background">
          {unreadCount > 9 ? "9+" : unreadCount}
        </Badge>
      )}
    </Button>
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {bellButton}
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-[360px] p-0 shadow-xl border border-border rounded-xl overflow-hidden"
        sideOffset={8}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold tracking-tight">Notifications</h3>
            {unreadCount > 0 && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5 font-medium">
                {unreadCount} nouvelle{unreadCount > 1 ? "s" : ""}
              </Badge>
            )}
          </div>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-[11px] h-7 px-2 text-primary hover:text-primary"
              onClick={(e) => { e.stopPropagation(); markAllAsRead(); }}
            >
              <Check className="w-3 h-3 mr-1" />
              Tout lire
            </Button>
          )}
        </div>

        {/* Notification list */}
        <div className="max-h-[380px] overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="py-10 text-center">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                <Bell className="w-5 h-5 text-muted-foreground/40" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">Aucune notification</p>
              <p className="text-xs text-muted-foreground/70 mt-0.5">Vos alertes apparaîtront ici</p>
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {visibleNotifications.map((notification) => (
                <Link
                  key={notification.id}
                  to="/notifications"
                  onClick={() => setOpen(false)}
                  className={`flex items-start gap-3 px-4 py-3 hover:bg-muted/40 transition-colors ${
                    !notification.is_read ? "bg-primary/[0.03]" : ""
                  }`}
                >
                  {/* Icon */}
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 border ${getTypeColor(notification.type)}`}>
                    {getIcon(notification.type)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={`text-[12px] leading-snug line-clamp-1 ${
                        notification.is_read ? "text-muted-foreground font-normal" : "text-foreground font-semibold"
                      }`}>
                        {notification.title}
                      </p>
                      <span className="text-[10px] text-muted-foreground/70 flex-shrink-0 mt-0.5">
                        {timeAgo(notification.created_at)}
                      </span>
                    </div>
                    {notification.description && (
                      <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed mt-0.5">
                        {notification.description}
                      </p>
                    )}
                  </div>

                  {/* Unread indicator */}
                  {!notification.is_read && (
                    <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-1.5" />
                  )}
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {notifications.length > 0 && (
          <div className="border-t border-border bg-muted/20">
            <Link
              to="/notifications"
              onClick={() => setOpen(false)}
              className="flex items-center justify-center gap-1.5 py-2.5 text-[12px] font-medium text-primary hover:text-primary/80 transition-colors"
            >
              {remainingCount > 0
                ? `Voir toutes les notifications (+${remainingCount})`
                : "Voir toutes les notifications"
              }
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
};

export default NotificationBell;
