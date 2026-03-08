import { useEffect, useCallback } from "react";
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

    // Pleasant two-tone chime
    osc.type = "sine";
    osc.frequency.setValueAtTime(880, ctx.currentTime); // A5
    osc.frequency.setValueAtTime(1100, ctx.currentTime + 0.1); // C#6
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
      navigator.vibrate([100, 50, 100]); // short double vibration
    }
  } catch {
    // Vibration not supported
  }
};

/**
 * Combined notification alert (sound + vibration).
 */
const notifyUser = () => {
  playNotificationSound();
  vibrateDevice();
};

/**
 * Listens for new products, orders, and messages in realtime and shows in-app push notifications.
 * Must be rendered inside BrowserRouter.
 */
const RealtimeNotifications = () => {
  const { toast } = useToast();
  const navigate = useNavigate();

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

          notifyUser();
          toast({
            title: "🌱 Nouveau produit disponible !",
            description: `${producer?.full_name || "Un producteur"} vient de publier "${product.name}"`,
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
        { event: "INSERT", schema: "public", table: "orders" },
        async (payload) => {
          const order = payload.new as any;
          const userId = await getCurrentUserId();
          if (!userId) return;

          const { data: sellerProfile } = await supabase
            .from("profiles")
            .select("user_id")
            .eq("id", order.seller_id)
            .single();

          if (sellerProfile?.user_id === userId) {
            notifyUser();
            toast({
              title: "🎉 Nouvelle commande reçue !",
              description: `Commande de ${order.quantity} unité(s) pour ${Number(order.total_price).toLocaleString()} FCFA`,
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

          notifyUser();
          toast({
            title: `💬 ${notif.title}`,
            description: notif.description,
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
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [toast, navigate, getCurrentUserId]);

  return null;
};

export default RealtimeNotifications;
