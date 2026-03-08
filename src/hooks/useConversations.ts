import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface ConversationItem {
  id: string;
  participant: { id: string; name: string; avatar: string; isOnline: boolean };
  lastMessage: string;
  timestamp: string;
  unread: number;
  productName?: string;
  productImage?: string;
  productId?: string;
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
        };
      })
    );

    setConversations(items);
    setLoading(false);
  }, []);

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
