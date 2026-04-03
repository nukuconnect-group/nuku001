import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type ConversationCategory = "achat" | "vente" | "livraison" | "general";

export interface ConversationItem {
  id: string;
  participant: { id: string; name: string; avatar: string; isOnline: boolean };
  lastMessage: string;
  timestamp: string;
  unread: number;
  productName?: string;
  productImage?: string;
  productId?: string;
  isDelivery?: boolean;
  deliveryId?: string;
  category?: ConversationCategory;
}

export function useConversations() {
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const fetchConversations = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setLoading(false); return; }

    setUserId(session.user.id);

    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("user_id", session.user.id)
      .single();

    if (!profile) { setLoading(false); return; }
    setProfileId(profile.id);

    const { data: convs } = await supabase
      .from("conversations")
      .select(`
        id, product_id, buyer_id, seller_id, updated_at,
        products:product_id (name, images),
        buyer:buyer_id (id, full_name, avatar_url),
        seller:seller_id (id, full_name, avatar_url)
      `)
      .or(`buyer_id.eq.${profile.id},seller_id.eq.${profile.id}`)
      .order("updated_at", { ascending: false });

    if (!convs) { setLoading(false); return; }

    // Fetch presence for all participants
    const participantProfileIds = convs.map((c: any) => c.buyer_id === profile.id ? c.seller_id : c.buyer_id);
    const participantUserIds: string[] = [];
    const profileToUserMap = new Map<string, string>();
    
    for (const c of convs as any[]) {
      const other = c.buyer_id === profile.id ? c.seller : c.buyer;
      if (other?.id) {
        // We need user_id from profiles to check presence
        const { data: pData } = await supabase.from("profiles").select("user_id").eq("id", other.id).single();
        if (pData) {
          profileToUserMap.set(other.id, pData.user_id);
          participantUserIds.push(pData.user_id);
        }
      }
    }

    // Batch fetch presence
    const presenceMap = new Map<string, boolean>();
    if (participantUserIds.length > 0) {
      const { data: presenceData } = await supabase
        .from("user_presence")
        .select("user_id, is_online")
        .in("user_id", participantUserIds);
      presenceData?.forEach((p: any) => presenceMap.set(p.user_id, p.is_online));
    }

    const items: ConversationItem[] = await Promise.all(
      convs.map(async (c: any) => {
        const isBuyer = c.buyer_id === profile.id;
        const other = isBuyer ? c.seller : c.buyer;
        const otherUserId = profileToUserMap.get(other?.id || "");

        const { data: msgs } = await supabase
          .from("messages")
          .select("content, created_at, sender_id, is_read")
          .eq("conversation_id", c.id)
          .order("created_at", { ascending: false })
          .limit(1);

        const lastMsg = msgs?.[0];

        const { count } = await supabase
          .from("messages")
          .select("id", { count: "exact", head: true })
          .eq("conversation_id", c.id)
          .neq("sender_id", profile.id)
          .eq("is_read", false);

        const product = c.products;
        const isOnline = otherUserId ? (presenceMap.get(otherUserId) || false) : false;

        // Determine conversation category
        let category: ConversationCategory = "general";
        if (c.product_id) {
          category = isBuyer ? "achat" : "vente";
        }

        return {
          id: c.id,
          participant: {
            id: other?.id || "",
            name: other?.full_name || "Utilisateur",
            avatar: other?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(other?.full_name || "U")}&background=1c98ed&color=fff`,
            isOnline,
          },
          lastMessage: lastMsg?.content || "Nouvelle conversation",
          timestamp: lastMsg ? formatTime(lastMsg.created_at) : formatTime(c.updated_at),
          unread: count || 0,
          productName: product?.name,
          productImage: product?.images?.[0],
          productId: c.product_id,
          category,
        };
      })
    );

    // Fetch delivery conversations
    const deliveryItems = await fetchDeliveryConversations(session.user.id, profile.id);

    setConversations([...items, ...deliveryItems].sort((a, b) => {
      // Sort by most recent
      return 0; // already sorted by updated_at from DB
    }));
    setLoading(false);
  }, []);

  async function fetchDeliveryConversations(currentUserId: string, currentProfileId: string): Promise<ConversationItem[]> {
    // Get deliveries where user is buyer (via orders) or driver
    const { data: driverProfile } = await supabase
      .from("driver_profiles")
      .select("id, profile_id")
      .eq("user_id", currentUserId)
      .maybeSingle();

    // Get deliveries as buyer
    const { data: buyerOrders } = await supabase
      .from("orders")
      .select("id")
      .eq("buyer_id", currentProfileId);

    const orderIds = buyerOrders?.map(o => o.id) || [];

    let deliveries: any[] = [];

    if (orderIds.length > 0) {
      const { data } = await supabase
        .from("deliveries")
        .select("id, driver_id, order_id, status, updated_at")
        .in("order_id", orderIds)
        .neq("status", "delivered");
      if (data) deliveries.push(...data);
    }

    if (driverProfile) {
      const { data } = await supabase
        .from("deliveries")
        .select("id, driver_id, order_id, status, updated_at")
        .eq("driver_id", driverProfile.id)
        .neq("status", "delivered");
      if (data) {
        const existingIds = new Set(deliveries.map(d => d.id));
        data.forEach(d => { if (!existingIds.has(d.id)) deliveries.push(d); });
      }
    }

    const deliveryConvs: ConversationItem[] = [];

    for (const delivery of deliveries) {
      // Get last delivery message
      const { data: msgs } = await supabase
        .from("delivery_messages")
        .select("content, created_at, sender_id, is_read")
        .eq("delivery_id", delivery.id)
        .order("created_at", { ascending: false })
        .limit(1);

      const lastMsg = msgs?.[0];

      const { count } = await supabase
        .from("delivery_messages")
        .select("id", { count: "exact", head: true })
        .eq("delivery_id", delivery.id)
        .neq("sender_id", currentUserId)
        .eq("is_read", false);

      // Get the other party name
      let otherName = "Livreur";
      if (driverProfile && delivery.driver_id === driverProfile.id) {
        // I'm the driver, get buyer name
        const { data: order } = await supabase.from("orders").select("buyer_id").eq("id", delivery.order_id).single();
        if (order) {
          const { data: buyer } = await supabase.from("profiles").select("full_name").eq("id", order.buyer_id).single();
          otherName = buyer?.full_name || "Client";
        }
      } else if (delivery.driver_id) {
        // I'm the buyer, get driver name
        const { data: dp } = await supabase.from("driver_profiles").select("profile_id").eq("id", delivery.driver_id).single();
        if (dp) {
          const { data: driverP } = await supabase.from("profiles").select("full_name").eq("id", dp.profile_id).single();
          otherName = driverP?.full_name || "Livreur";
        }
      }

      deliveryConvs.push({
        id: `delivery-${delivery.id}`,
        participant: {
          id: delivery.driver_id || "",
          name: otherName,
          avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(otherName)}&background=f97316&color=fff`,
          isOnline: false,
        },
        lastMessage: lastMsg?.content || "Chat livraison",
        timestamp: lastMsg ? formatTime(lastMsg.created_at) : formatTime(delivery.updated_at),
        unread: count || 0,
        isDelivery: true,
        deliveryId: delivery.id,
        category: "livraison" as ConversationCategory,
      });
    }

    return deliveryConvs;
  }

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel("conversations-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, () => {
        fetchConversations();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "conversations" }, () => {
        fetchConversations();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "delivery_messages" }, () => {
        fetchConversations();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "user_presence" }, () => {
        fetchConversations();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchConversations]);

  return { conversations, loading, profileId, userId, refetch: fetchConversations };
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffDays === 0) return date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  if (diffDays === 1) return "Hier";
  if (diffDays < 7) return date.toLocaleDateString("fr-FR", { weekday: "short" });
  return date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}
