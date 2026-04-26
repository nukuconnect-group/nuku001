import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface MessageItem {
  id: string;
  senderId: string;
  content: string;
  timestamp: Date;
  status: "sent" | "delivered" | "read";
  type?: "text" | "image" | "voice" | "file";
  fileUrl?: string;
  fileName?: string;
  replyToId?: string;
}

export function useMessages(conversationId: string | null, profileId: string | null, userId: string | null) {
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [loading, setLoading] = useState(false);

  const isDeliveryConversation = !!conversationId?.startsWith("delivery-");
  const deliveryId = isDeliveryConversation ? conversationId.replace("delivery-", "") : null;

  const fetchMessages = useCallback(async () => {
    if (!conversationId) { setMessages([]); return; }
    setLoading(true);

    const query = isDeliveryConversation
      ? supabase
          .from("delivery_messages")
          .select("id, content, sender_id, is_read, created_at, sender_role")
          .eq("delivery_id", deliveryId)
          .order("created_at", { ascending: true })
      : supabase
          .from("messages")
          .select("id, content, sender_id, is_read, created_at, reply_to_id")
          .eq("conversation_id", conversationId)
          .order("created_at", { ascending: true });

    const { data } = await query;

    if (data) {
      setMessages(
        data.map((m: any) => ({
          id: m.id,
          senderId: m.sender_id === (isDeliveryConversation ? userId : profileId) ? "me" : "other",
          content: m.content,
          timestamp: new Date(m.created_at),
          status: m.is_read ? "read" as const : "delivered" as const,
          type: "text" as const,
          replyToId: m.reply_to_id || undefined,
        }))
      );

      // Mark unread messages as read
      if (isDeliveryConversation && userId) {
        await supabase
          .from("delivery_messages")
          .update({ is_read: true })
          .eq("delivery_id", deliveryId)
          .neq("sender_id", userId)
          .eq("is_read", false);
      } else if (profileId) {
        await supabase
          .from("messages")
          .update({ is_read: true })
          .eq("conversation_id", conversationId)
          .neq("sender_id", profileId)
          .eq("is_read", false);
      }
    }

    setLoading(false);
  }, [conversationId, deliveryId, isDeliveryConversation, profileId, userId]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  // Realtime for this conversation
  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase
      .channel(`messages-${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: isDeliveryConversation ? "delivery_messages" : "messages",
          filter: isDeliveryConversation ? `delivery_id=eq.${deliveryId}` : `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const m = payload.new as any;
          const newMsg: MessageItem = {
            id: m.id,
            senderId: m.sender_id === (isDeliveryConversation ? userId : profileId) ? "me" : "other",
            content: m.content,
            timestamp: new Date(m.created_at),
            status: m.is_read ? "read" : "delivered",
            type: "text",
            replyToId: m.reply_to_id || undefined,
          };
          setMessages((prev) => {
            if (prev.some((p) => p.id === m.id)) return prev;
            return [...prev, newMsg];
          });

          // Auto-mark as read if from other
          if (isDeliveryConversation && m.sender_id !== userId && userId) {
            supabase.from("delivery_messages").update({ is_read: true }).eq("id", m.id).then();
          } else if (m.sender_id !== profileId && profileId) {
            supabase.from("messages").update({ is_read: true }).eq("id", m.id).then();
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [conversationId, deliveryId, isDeliveryConversation, profileId, userId]);

  const sendMessage = useCallback(
    async (content: string, replyToId?: string) => {
      if (!conversationId || !content.trim()) return;
      if (isDeliveryConversation && !userId) return;
      if (!isDeliveryConversation && !profileId) return;

      const tempId = `temp-${Date.now()}`;
      const optimistic: MessageItem = {
        id: tempId, senderId: "me", content, timestamp: new Date(),
        status: "sent", type: "text", replyToId,
      };
      setMessages((prev) => [...prev, optimistic]);

      const currentDeliveryRole = await (async () => {
        if (!isDeliveryConversation || !userId) return null;
        const { data } = await supabase.from("driver_profiles").select("id").eq("user_id", userId).maybeSingle();
        return data ? "driver" : "buyer";
      })();

      const request = isDeliveryConversation
        ? supabase
            .from("delivery_messages")
            .insert({
              delivery_id: deliveryId,
              sender_id: userId,
              sender_role: currentDeliveryRole || "buyer",
              content,
            } as any)
            .select("id")
            .single()
        : supabase
            .from("messages")
            .insert({
              conversation_id: conversationId,
              sender_id: profileId,
              content,
              ...(replyToId && !replyToId.startsWith("temp-") ? { reply_to_id: replyToId } : {}),
            } as any)
            .select("id")
            .single();

      const { data, error } = await request;

      if (error) {
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
        return;
      }

      setMessages((prev) =>
        prev.map((m) => (m.id === tempId ? { ...m, id: data.id, status: "delivered" as const } : m))
      );

      if (!isDeliveryConversation) {
        await supabase.from("conversations").update({ updated_at: new Date().toISOString() }).eq("id", conversationId);
        // Notify recipient by email (throttled server-side per 5 min)
        supabase.functions
          .invoke("notify-message-recipient", {
            body: { conversationId, preview: content },
          })
          .catch(() => {});
      }
    },
    [conversationId, deliveryId, isDeliveryConversation, profileId, userId]
  );

  return { messages, setMessages, loading, sendMessage };
}
