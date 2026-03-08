import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

/**
 * Listens for new products in realtime and shows in-app push notifications.
 * Must be rendered inside BrowserRouter.
 */
const RealtimeNotifications = () => {
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const channel = supabase
      .channel("realtime-new-products")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "products" },
        async (payload) => {
          const product = payload.new as any;
          // Get producer name
          const { data: producer } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("id", product.producer_id)
            .single();

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
          // Only notify the seller
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) return;
          const { data: sellerProfile } = await supabase
            .from("profiles")
            .select("user_id")
            .eq("id", order.seller_id)
            .single();
          
          if (sellerProfile?.user_id === user.id) {
            toast({
              title: "🎉 Nouvelle commande reçue !",
              description: `Commande de ${order.quantity} unité(s) pour ${Number(order.total_price).toLocaleString()} FCFA`,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [toast, navigate]);

  return null;
};

export default RealtimeNotifications;
