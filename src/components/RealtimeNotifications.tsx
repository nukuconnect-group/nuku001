import { useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

/**
 * Plays a short notification sound using Web Audio API.
 */
const playNotificationSound = () => {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.type = "sine";
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.setValueAtTime(1100, ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.4);
  } catch {
    // Audio not supported or blocked
  }
};

/**
 * Triggers device vibration if supported.
 */
const vibrateDevice = () => {
  try {
    if (navigator.vibrate) {
      navigator.vibrate([100, 50, 100]);
    }
  } catch {
    // Vibration not supported
  }
};

/**
 * Request browser push notification permission.
 */
const requestPushPermission = async (): Promise<boolean> => {
  if (!("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  const result = await Notification.requestPermission();
  return result === "granted";
};

/**
 * Send a browser push notification.
 */
const sendPushNotification = (title: string, body: string, onClick?: () => void) => {
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  
  try {
    const notification = new Notification(title, {
      body,
      icon: "/lovable-uploads/nukuconnect-logo-header.png",
      badge: "/lovable-uploads/nukuconnect-logo-header.png",
      tag: `nuku-${Date.now()}`,
      requireInteraction: false,
      silent: false,
    });

    if (onClick) {
      notification.onclick = () => {
        window.focus();
        onClick();
        notification.close();
      };
    }

    setTimeout(() => notification.close(), 8000);
  } catch {
    // Push notification failed
  }
};

/**
 * Combined notification alert (sound + vibration + push).
 */
const notifyUser = (title?: string, body?: string, onClick?: () => void) => {
  playNotificationSound();
  vibrateDevice();
  if (document.hidden && title && body) {
    sendPushNotification(title, body, onClick);
  }
};

/**
 * Listens for new products, orders, and messages in realtime and shows in-app push notifications.
 * Must be rendered inside BrowserRouter.
 */
const RealtimeNotifications = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const permissionRequested = useRef(false);

  // Request push permission on first user interaction
  useEffect(() => {
    const requestOnInteraction = () => {
      if (!permissionRequested.current) {
        permissionRequested.current = true;
        requestPushPermission();
      }
    };
    
    document.addEventListener("click", requestOnInteraction, { once: true });
    return () => document.removeEventListener("click", requestOnInteraction);
  }, []);

  const getCurrentUserId = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    return user?.id || null;
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel("realtime-notifications")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "products" },
        async (payload) => {
          const product = payload.new as any;
          const { data: producer } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("id", product.producer_id)
            .single();

          const title = "🌱 Nouveau produit disponible !";
          const body = `${producer?.full_name || "Un producteur"} vient de publier "${product.name}"`;
          
          notifyUser(title, body, () => navigate(`/produit/${product.id}`));
          toast({
            title,
            description: body,
            action: (
              <button
                onClick={() => navigate(`/produit/${product.id}`)}
                className="text-xs font-semibold text-primary hover:underline whitespace-nowrap"
              >
                Voir →
              </button>
            ),
          });
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "orders" },
        async (payload) => {
          const order = payload.new as any;
          const oldOrder = payload.old as any;
          if (order.status !== "confirmed" || oldOrder?.status === "confirmed") return;
          const userId = await getCurrentUserId();
          if (!userId) return;

          const { data: sellerProfile } = await supabase
            .from("profiles")
            .select("user_id")
            .eq("id", order.seller_id)
            .single();

          if (sellerProfile?.user_id === userId) {
            const title = "🎉 Commande payée reçue !";
            const body = `Paiement confirmé : ${order.quantity} unité(s) pour ${Number(order.total_price).toLocaleString("en-US")} FCFA`;
            
            notifyUser(title, body, () => navigate("/suivi-livraison"));
            toast({ title, description: body });
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        async (payload) => {
          const msg = payload.new as any;
          const userId = await getCurrentUserId();
          if (!userId) return;

          // Get the sender profile to check it's not from us
          const { data: senderProfile } = await supabase
            .from("profiles")
            .select("full_name, user_id")
            .eq("id", msg.sender_id)
            .single();

          if (senderProfile?.user_id === userId) return; // Don't notify for own messages

          const title = `💬 Message de ${senderProfile?.full_name || "quelqu'un"}`;
          const body = msg.content?.substring(0, 120) || "Nouveau message";

          notifyUser(title, body, () => navigate("/messages"));
          
          // Only show in-app toast if not on messages page
          if (!window.location.pathname.startsWith("/messages")) {
            toast({
              title,
              description: body,
              action: (
                <button
                  onClick={() => navigate("/messages")}
                  className="text-xs font-semibold text-primary hover:underline whitespace-nowrap"
                >
                  Répondre →
                </button>
              ),
            });
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: "type=eq.message" },
        async (payload) => {
          const notif = payload.new as any;
          const userId = await getCurrentUserId();
          if (!userId || notif.user_id !== userId) return;

          // Push notification for message notifications (backup, won't duplicate since messages listener handles it)
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [toast, navigate, getCurrentUserId]);

  return null;
};

export default RealtimeNotifications;
