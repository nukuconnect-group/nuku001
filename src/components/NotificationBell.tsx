import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Bell, ShoppingCart, MessageCircle, Package, Check, Truck, AlertCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/contexts/ProfileContext";

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
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const MAX_VISIBLE = 3;

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
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user?.id]);

  const unreadCount = notifications.filter(n => !n.is_read).length;
  const visibleNotifications = notifications.slice(0, MAX_VISIBLE);
  const remainingCount = notifications.length - MAX_VISIBLE;

  const getIcon = (type: string) => {
    switch (type) {
      case "order": return <ShoppingCart className="w-3.5 h-3.5 text-primary" />;
      case "message": return <MessageCircle className="w-3.5 h-3.5 text-accent-foreground" />;
      case "delivery": return <Truck className="w-3.5 h-3.5 text-primary" />;
      case "product": return <Package className="w-3.5 h-3.5 text-primary" />;
      default: return <AlertCircle className="w-3.5 h-3.5 text-muted-foreground" />;
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
    if (mins < 60) return `Il y a ${mins} min`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `Il y a ${hours}h`;
    const days = Math.floor(hours / 24);
    return `Il y a ${days}j`;
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <Badge className="absolute -top-1 -right-1 w-5 h-5 p-0 flex items-center justify-center text-[10px] bg-destructive">
              {unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 max-h-none">
        <DropdownMenuLabel className="flex items-center justify-between py-2">
          <span className="text-sm">Notifications</span>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" className="text-[10px] h-auto py-0.5 px-1.5" onClick={markAllAsRead}>
              <Check className="w-3 h-3 mr-1" />
              Tout lire
            </Button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {notifications.length === 0 ? (
          <div className="py-6 text-center">
            <Bell className="w-6 h-6 mx-auto text-muted-foreground/50 mb-1.5" />
            <p className="text-xs text-muted-foreground">Aucune notification</p>
          </div>
        ) : (
          <>
            {visibleNotifications.map((notification) => (
              <Link key={notification.id} to="/notifications">
                <DropdownMenuItem className="flex items-start gap-2.5 p-2.5 cursor-pointer">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${notification.is_read ? 'bg-muted' : 'bg-primary/10'}`}>
                    {getIcon(notification.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className={`text-[11px] font-medium leading-tight ${notification.is_read ? 'text-muted-foreground' : 'text-foreground'}`}>
                        {notification.title}
                      </p>
                      {!notification.is_read && (
                        <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                      )}
                    </div>
                    <p className="text-[10px] text-muted-foreground truncate leading-tight mt-0.5">{notification.description}</p>
                    <p className="text-[9px] text-muted-foreground mt-0.5">{timeAgo(notification.created_at)}</p>
                  </div>
                </DropdownMenuItem>
              </Link>
            ))}
            {remainingCount > 0 && (
              <>
                <DropdownMenuSeparator />
                <Link to="/notifications">
                  <DropdownMenuItem className="text-center text-xs text-muted-foreground cursor-pointer justify-center py-2">
                    + {remainingCount} autre{remainingCount > 1 ? "s" : ""} notification{remainingCount > 1 ? "s" : ""}
                  </DropdownMenuItem>
                </Link>
              </>
            )}
          </>
        )}
        <DropdownMenuSeparator />
        <Link to="/notifications">
          <DropdownMenuItem className="text-center text-primary cursor-pointer justify-center text-xs py-2">
            Voir toutes les notifications
          </DropdownMenuItem>
        </Link>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default NotificationBell;
