import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

export type ConversationCategory = "achat" | "vente" | "livraison" | "general";

export interface ConversationItem {
  id: string;
  participant: {
    id: string;
    name: string;
    avatar: string;
    isOnline: boolean;
    userId?: string;
    location?: string;
    timezone?: string;
    availabilityStart?: string;
    availabilityEnd?: string;
    isVerified?: boolean;
    yearsActive?: number;
  };
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

// Module-level cache: survives unmount so navigating back to Messages
// shows previous data instantly while a fresh fetch runs in the background.
const cache: {
  conversations: ConversationItem[];
  profileId: string | null;
  userId: string | null;
  hasData: boolean;
} = { conversations: [], profileId: null, userId: null, hasData: false };

export function useConversations() {
  const [conversations, setConversations] = useState<ConversationItem[]>(cache.conversations);
  const [loading, setLoading] = useState(!cache.hasData);
  const [profileId, setProfileId] = useState<string | null>(cache.profileId);
  const [userId, setUserId] = useState<string | null>(cache.userId);

  const fetchConversations = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setLoading(false); return; }

    setUserId(session.user.id);
    cache.userId = session.user.id;

    const { data: profile } = await supabase
      .from("profiles")
      .select("id, user_type")
      .eq("user_id", session.user.id)
      .single();

    if (!profile) { setLoading(false); return; }
    setProfileId(profile.id);
    cache.profileId = profile.id;

    const { data: convs } = await supabase
      .from("conversations")
      .select(`
        id, product_id, buyer_id, seller_id, updated_at,
        products:product_id (name, images),
        buyer:buyer_id (id, full_name, avatar_url, user_id, location, timezone, availability_start, availability_end, is_verified, years_active),
        seller:seller_id (id, full_name, avatar_url, user_id, location, timezone, availability_start, availability_end, is_verified, years_active)
      `)
      .or(`buyer_id.eq.${profile.id},seller_id.eq.${profile.id}`)
      .order("updated_at", { ascending: false });

    if (!convs) { setLoading(false); return; }

    // Batch fetch presence for all participants
    const participantUserIds: string[] = [];
    for (const c of convs as any[]) {
      const other = c.buyer_id === profile.id ? c.seller : c.buyer;
      if (other?.user_id) participantUserIds.push(other.user_id);
    }

    const presenceMap = new Map<string, boolean>();
    if (participantUserIds.length > 0) {
      const { data: presenceData } = await supabase
        .from("user_presence")
        .select("user_id, is_online")
        .in("user_id", participantUserIds);
      presenceData?.forEach((p: any) => presenceMap.set(p.user_id, p.is_online));
    }

    // Batch fetch last messages and unread counts
    const convIds = convs.map((c: any) => c.id);
    
    // Get last messages (cap at 500 most recent across all conversations for perf)
    const { data: allMessages } = await supabase
      .from("messages")
      .select("conversation_id, content, created_at, sender_id, is_read")
      .in("conversation_id", convIds)
      .order("created_at", { ascending: false })
      .limit(500);

    // Group by conversation - take first (latest) per conversation
    const lastMsgMap = new Map<string, any>();
    const unreadMap = new Map<string, number>();
    
    for (const msg of allMessages || []) {
      if (!lastMsgMap.has(msg.conversation_id)) {
        lastMsgMap.set(msg.conversation_id, msg);
      }
      // Count unread from others
      if (msg.sender_id !== profile.id && !msg.is_read) {
        unreadMap.set(msg.conversation_id, (unreadMap.get(msg.conversation_id) || 0) + 1);
      }
    }

    const items: ConversationItem[] = convs.map((c: any) => {
      const isBuyer = c.buyer_id === profile.id;
      const other = isBuyer ? c.seller : c.buyer;
      const isOnline = other?.user_id ? (presenceMap.get(other.user_id) || false) : false;

      const lastMsg = lastMsgMap.get(c.id);
      const unread = unreadMap.get(c.id) || 0;
      const product = c.products;

      let category: ConversationCategory = "general";
      if (c.product_id) {
        category = isBuyer ? "achat" : "vente";
      }

      return {
        id: c.id,
        participant: {
          id: other?.id || "",
          userId: other?.user_id,
          name: other?.full_name || "Utilisateur",
          avatar: other?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(other?.full_name || "U")}&background=1c98ed&color=fff`,
          isOnline,
          location: other?.location,
          timezone: other?.timezone,
          availabilityStart: other?.availability_start,
          availabilityEnd: other?.availability_end,
          isVerified: other?.is_verified,
          yearsActive: other?.years_active,
        },
        lastMessage: lastMsg?.content || "Nouvelle conversation",
        timestamp: lastMsg ? formatTime(lastMsg.created_at) : formatTime(c.updated_at),
        unread,
        productName: product?.name,
        productImage: product?.images?.[0],
        productId: c.product_id,
        category,
      };
    });

    // Fetch delivery conversations
    const deliveryItems = await fetchDeliveryConversations(session.user.id, profile.id);

    const merged = [...items, ...deliveryItems];
    setConversations(merged);
    cache.conversations = merged;
    cache.hasData = true;
    setLoading(false);
  }, []);

  async function fetchDeliveryConversations(currentUserId: string, currentProfileId: string): Promise<ConversationItem[]> {
    const { data: driverProfile } = await supabase
      .from("driver_profiles")
      .select("id, profile_id")
      .eq("user_id", currentUserId)
      .maybeSingle();

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

    if (deliveries.length === 0) return [];

    // Batch fetch delivery messages (cap at 500)
    const deliveryIds = deliveries.map(d => d.id);
    const { data: allDeliveryMsgs } = await supabase
      .from("delivery_messages")
      .select("delivery_id, content, created_at, sender_id, is_read")
      .in("delivery_id", deliveryIds)
      .order("created_at", { ascending: false })
      .limit(500);

    const lastDeliveryMsgMap = new Map<string, any>();
    const unreadDeliveryMap = new Map<string, number>();
    for (const msg of allDeliveryMsgs || []) {
      if (!lastDeliveryMsgMap.has(msg.delivery_id)) {
        lastDeliveryMsgMap.set(msg.delivery_id, msg);
      }
      if (msg.sender_id !== currentUserId && !msg.is_read) {
        unreadDeliveryMap.set(msg.delivery_id, (unreadDeliveryMap.get(msg.delivery_id) || 0) + 1);
      }
    }

    // Batch fetch driver/buyer names
    const driverIds = [...new Set(deliveries.filter(d => d.driver_id).map(d => d.driver_id))];
    const driverNameMap = new Map<string, string>();
    if (driverIds.length > 0) {
      const { data: dps } = await supabase
        .from("driver_profiles")
        .select("id, profile_id")
        .in("id", driverIds);
      if (dps?.length) {
        const profileIds = dps.map(dp => dp.profile_id);
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", profileIds);
        const profileNameMap = new Map<string, string>();
        profiles?.forEach(p => profileNameMap.set(p.id, p.full_name || "Livreur"));
        dps.forEach(dp => driverNameMap.set(dp.id, profileNameMap.get(dp.profile_id) || "Livreur"));
      }
    }

    const deliveryConvs: ConversationItem[] = deliveries.map((delivery) => {
      const lastMsg = lastDeliveryMsgMap.get(delivery.id);
      const unread = unreadDeliveryMap.get(delivery.id) || 0;

      let otherName = "Livreur";
      if (driverProfile && delivery.driver_id === driverProfile.id) {
        otherName = "Client";
      } else if (delivery.driver_id) {
        otherName = driverNameMap.get(delivery.driver_id) || "Livreur";
      }

      return {
        id: `delivery-${delivery.id}`,
        participant: {
          id: delivery.driver_id || "",
          name: otherName,
          avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(otherName)}&background=f97316&color=fff`,
          isOnline: false,
        },
        lastMessage: lastMsg?.content || "Chat livraison",
        timestamp: lastMsg ? formatTime(lastMsg.created_at) : formatTime(delivery.updated_at),
        unread,
        isDelivery: true,
        deliveryId: delivery.id,
        category: "livraison" as ConversationCategory,
      };
    });

    return deliveryConvs;
  }

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // Zero unread badge instantly when a conversation is read in this tab
  useEffect(() => {
    const onRead = (e: Event) => {
      const detail = (e as CustomEvent).detail || {};
      const convId = detail.conversationId as string | undefined;
      if (!convId) {
        // refetch as fallback
        fetchConversations();
        return;
      }
      setConversations((prev) => {
        const next = prev.map((c) => (c.id === convId ? { ...c, unread: 0 } : c));
        cache.conversations = next;
        return next;
      });
    };
    window.addEventListener("nuku:messages-read", onRead as EventListener);
    return () => window.removeEventListener("nuku:messages-read", onRead as EventListener);
  }, [fetchConversations]);

  // Prefetch on window focus / tab visibility / reconnect — instant cache + silent refresh
  useEffect(() => {
    const onFocus = () => fetchConversations();
    const onVisibility = () => {
      if (document.visibilityState === "visible") fetchConversations();
    };
    const onOnline = () => fetchConversations();
    window.addEventListener("focus", onFocus);
    window.addEventListener("online", onOnline);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("online", onOnline);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [fetchConversations]);

  // Realtime subscription with light debounce + instant local merge for new messages
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    const scheduleRefetch = () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      // Très court : on veut un rafraîchissement quasi instantané
      debounceRef.current = setTimeout(() => fetchConversations(), 250);
    };

    // Mise à jour locale immédiate du dernier message (sans attendre le refetch)
    const mergeLastMessage = (convId: string, content: string, fromOther: boolean, deliveryKey?: string) => {
      const targetId = deliveryKey ? `delivery-${deliveryKey}` : convId;
      setConversations((prev) => {
        const next = prev.map((c) => {
          if (c.id !== targetId) return c;
          return {
            ...c,
            lastMessage: content || c.lastMessage,
            timestamp: formatTime(new Date().toISOString()),
            unread: fromOther ? (c.unread || 0) + 1 : c.unread,
          };
        });
        // Remonte cette conversation en haut
        next.sort((a, b) => (a.id === targetId ? -1 : b.id === targetId ? 1 : 0));
        cache.conversations = next;
        return next;
      });
    };

    const channel = supabase
      .channel("conversations-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, (payload) => {
        const m = payload.new as any;
        // Update local instantly
        if (cache.profileId) {
          mergeLastMessage(m.conversation_id, m.content, m.sender_id !== cache.profileId);
        }
        scheduleRefetch();
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "messages" }, scheduleRefetch)
      .on("postgres_changes", { event: "*", schema: "public", table: "conversations" }, scheduleRefetch)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "delivery_messages" }, (payload) => {
        const m = payload.new as any;
        if (cache.userId) {
          mergeLastMessage("", m.content, m.sender_id !== cache.userId, m.delivery_id);
        }
        scheduleRefetch();
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "delivery_messages" }, scheduleRefetch)
      // 🔴 Présence en temps réel : si un participant se connecte/déconnecte, on met à jour le badge
      .on("postgres_changes", { event: "*", schema: "public", table: "user_presence" }, (payload) => {
        const row = (payload.new || payload.old) as any;
        if (!row?.user_id) return;
        setConversations((prev) => {
          const next = prev.map((c) => {
            if (c.participant.userId !== row.user_id) return c;
            return { ...c, participant: { ...c.participant, isOnline: !!row.is_online } };
          });
          cache.conversations = next;
          return next;
        });
      })
      .subscribe();

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      supabase.removeChannel(channel);
    };
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
