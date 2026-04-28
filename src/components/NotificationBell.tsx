import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Bell,
  ShoppingCart,
  MessageCircle,
  Package,
  Check,
  Truck,
  AlertCircle,
  CreditCard,
  Heart,
  X,
  CheckCircle2,
  Filter,
  AlertTriangle,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
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

const CRITICAL_TYPES = new Set(["kyc", "withdrawal", "delivery"]);

const NotificationBell = () => {
  const { user } = useProfile();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    const fetchNotifications = async () => {
      const { data } = await supabase
        .from("notifications")
        .select("id, type, title, description, created_at, is_read")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (data) setNotifications(data);
    };
    fetchNotifications();

    const channel = supabase
      .channel("notif-bell")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        (payload) => {
          setNotifications((prev) => [payload.new as Notification, ...prev].slice(0, 50));
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        (payload) => {
          setNotifications((prev) =>
            prev.map((n) => (n.id === (payload.new as Notification).id ? (payload.new as Notification) : n)),
          );
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const unreadCount = notifications.filter((n) => !n.is_read).length;
  const criticalNotifs = useMemo(
    () => notifications.filter((n) => CRITICAL_TYPES.has(n.type)),
    [notifications],
  );

  const getIcon = (type: string) => {
    switch (type) {
      case "order":
        return <ShoppingCart className="w-3.5 h-3.5 text-primary" />;
      case "message":
        return <MessageCircle className="w-3.5 h-3.5 text-primary" />;
      case "delivery":
        return <Truck className="w-3.5 h-3.5 text-primary" />;
      case "product":
        return <Package className="w-3.5 h-3.5 text-primary" />;
      case "subscription":
      case "withdrawal":
        return <CreditCard className="w-3.5 h-3.5 text-primary" />;
      case "demand":
        return <Heart className="w-3.5 h-3.5 text-primary" />;
      case "kyc":
        return <AlertCircle className="w-3.5 h-3.5 text-primary" />;
      default:
        return <Bell className="w-3.5 h-3.5 text-primary" />;
    }
  };

  const getNotifRoute = (notif: Notification): string => {
    const title = (notif.title || "").toLowerCase();
    switch (notif.type) {
      case "order":
        return "/dashboard";
      case "message":
        return "/messages";
      case "delivery":
        if (title.includes("livreur") || title.includes("livraison disponible")) return "/driver-dashboard";
        return "/suivi-livraison";
      case "product":
        return "/marketplace";
      case "kyc":
        if (title.includes("livreur")) return "/driver-dashboard";
        return "/dashboard";
      case "withdrawal":
        return "/dashboard";
      default:
        return "/notifications";
    }
  };

  const handleNotifClick = async (notif: Notification) => {
    if (!notif.is_read && user?.id) {
      await supabase.from("notifications").update({ is_read: true }).eq("id", notif.id);
      setNotifications((prev) => prev.map((n) => (n.id === notif.id ? { ...n, is_read: true } : n)));
      window.dispatchEvent(new CustomEvent("nuku:notifications-updated"));
    }
    setOpen(false);
    navigate(getNotifRoute(notif));
  };

  const dismissNotif = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!user?.id) return;
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    await supabase.from("notifications").delete().eq("id", id);
    window.dispatchEvent(new CustomEvent("nuku:notifications-updated"));
  };

  const markAllAsRead = async () => {
    if (!user?.id) return;
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    await supabase.from("notifications").update({ is_read: true }).eq("user_id", user.id).eq("is_read", false);
    window.dispatchEvent(new CustomEvent("nuku:notifications-updated"));
  };

  const formatDateShort = (dateStr: string) => {
    const d = new Date(dateStr);
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    return `${day}/${month} ${hh}:${mm}`;
  };

  // Truncate description to keep it succinct (single short line)
  const truncate = (s: string, max = 90) => (s.length > max ? s.slice(0, max - 1).trimEnd() + "…" : s);

  const renderList = (items: Notification[]) => {
    if (items.length === 0) {
      return (
        <div className="py-12 text-center">
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
            <Bell className="w-5 h-5 text-muted-foreground/40" />
          </div>
          <p className="text-sm font-medium text-muted-foreground">Aucune notification</p>
        </div>
      );
    }
    return (
      <ul className="space-y-2 px-1 py-2">
        {items.map((n) => (
          <li
            key={n.id}
            onClick={() => handleNotifClick(n)}
            className={`group relative flex items-start gap-3 rounded-xl border border-border bg-card hover:bg-muted/40 transition-colors cursor-pointer pl-3 pr-9 py-2.5 ${
              !n.is_read ? "border-l-4 border-l-primary" : ""
            }`}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                handleNotifClick(n);
              }
            }}
          >
            {/* Status icon (left) */}
            <div className="flex-shrink-0 mt-0.5">
              {n.is_read ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              ) : (
                <div className="w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center">
                  <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
                </div>
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                {getIcon(n.type)}
                <p className="text-[13px] font-semibold text-foreground truncate">
                  {n.title}
                </p>
              </div>
              {n.description && (
                <p className="text-[12px] text-muted-foreground leading-snug line-clamp-1">
                  {truncate(n.description)}
                </p>
              )}
              <p className="text-[11px] text-muted-foreground/70 mt-1">
                {formatDateShort(n.created_at)}
              </p>
            </div>

            {/* Dismiss */}
            <button
              type="button"
              onClick={(e) => dismissNotif(e, n.id)}
              aria-label="Supprimer la notification"
              className="absolute top-2 right-2 w-6 h-6 rounded-md flex items-center justify-center text-destructive/80 hover:bg-destructive/10 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </li>
        ))}
      </ul>
    );
  };

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="relative"
        onClick={() => setOpen(true)}
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <Badge className="absolute -top-1 -right-1 w-5 h-5 p-0 flex items-center justify-center text-[10px] bg-destructive border-2 border-background">
            {unreadCount > 9 ? "9+" : unreadCount}
          </Badge>
        )}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md p-0 gap-0 overflow-hidden">
          <DialogHeader className="px-5 pt-5 pb-3 flex-row items-center justify-between space-y-0">
            <DialogTitle className="flex items-center gap-2 text-base">
              <Bell className="w-4 h-4" />
              Notifications
              <Badge variant="secondary" className="rounded-full text-[11px] font-medium px-2 py-0.5">
                {notifications.length}
              </Badge>
            </DialogTitle>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllAsRead}
                className="text-[12px] text-muted-foreground hover:text-primary transition-colors"
              >
                Tout marquer comme lu
              </button>
            )}
          </DialogHeader>

          <Tabs defaultValue="all" className="w-full">
            <div className="px-3">
              <TabsList className="grid w-full grid-cols-3 h-9 bg-muted/50">
                <TabsTrigger value="all" className="text-[12px]">
                  Toutes ({notifications.length})
                </TabsTrigger>
                <TabsTrigger value="categories" className="text-[12px] gap-1">
                  <Filter className="w-3 h-3" />
                  Catégories
                </TabsTrigger>
                <TabsTrigger value="critical" className="text-[12px] gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  Critiques ({criticalNotifs.length})
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="max-h-[55vh] overflow-y-auto px-2">
              <TabsContent value="all" className="mt-0">
                {renderList(notifications)}
              </TabsContent>
              <TabsContent value="categories" className="mt-0">
                {renderList(notifications)}
              </TabsContent>
              <TabsContent value="critical" className="mt-0">
                {renderList(criticalNotifs)}
              </TabsContent>
            </div>
          </Tabs>

          <div className="border-t border-border bg-muted/20 px-5 py-2.5 text-center">
            <p className="text-[12px] text-muted-foreground">
              {unreadCount > 0
                ? `${unreadCount} notification${unreadCount > 1 ? "s" : ""} non lue${unreadCount > 1 ? "s" : ""}`
                : "Toutes les notifications sont lues"}
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default NotificationBell;
