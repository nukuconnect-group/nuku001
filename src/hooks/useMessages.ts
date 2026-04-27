import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  emitMessagesRead,
  queueOfflineRead,
  replayOfflineReads,
} from "@/lib/messageReadEvents";

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

export type EmailNotifyStatus =
  | { state: "idle" }
  | { state: "pending"; at: number }
  | { state: "ok"; at: number; ms: number }
  | { state: "error"; at: number; ms: number; message: string };

export function useMessages(conversationId: string | null, profileId: string | null, userId: string | null) {
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastEmailStatus, setLastEmailStatus] = useState<EmailNotifyStatus>({ state: "idle" });

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

      // Count "other"-authored unread messages BEFORE marking them read,
      // so we can decrement the global counter instantly in the UI.
      const myId = isDeliveryConversation ? userId : profileId;
      const decrement = data.filter(
        (m: any) => m.sender_id !== myId && m.is_read === false
      ).length;

      // Mark unread messages as read (offline-aware)
      let didMarkRead = false;
      const isOnline = typeof navigator === "undefined" ? true : navigator.onLine;
      if (!isOnline && decrement > 0) {
        // Queue for replay when back online; still update UI optimistically
        queueOfflineRead({ conversationId: conversationId!, decrement });
        didMarkRead = true;
      } else if (isDeliveryConversation && userId) {
        const { error: upErr } = await supabase
          .from("delivery_messages")
          .update({ is_read: true })
          .eq("delivery_id", deliveryId)
          .neq("sender_id", userId)
          .eq("is_read", false);
        if (!upErr) didMarkRead = true;
        else if (decrement > 0) { queueOfflineRead({ conversationId: conversationId!, decrement }); didMarkRead = true; }
      } else if (profileId) {
        const { error: upErr } = await supabase
          .from("messages")
          .update({ is_read: true })
          .eq("conversation_id", conversationId)
          .neq("sender_id", profileId)
          .eq("is_read", false);
        if (!upErr) didMarkRead = true;
        else if (decrement > 0) { queueOfflineRead({ conversationId: conversationId!, decrement }); didMarkRead = true; }
      }
      if (didMarkRead) {
        emitMessagesRead({ conversationId: conversationId!, decrement });
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
            supabase.from("delivery_messages").update({ is_read: true }).eq("id", m.id).then(() => {
              emitMessagesRead({ conversationId: conversationId!, decrement: 1 });
            });
          } else if (m.sender_id !== profileId && profileId) {
            supabase.from("messages").update({ is_read: true }).eq("id", m.id).then(() => {
              emitMessagesRead({ conversationId: conversationId!, decrement: 1 });
            });
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
        const startedAt = Date.now();
        setLastEmailStatus({ state: "pending", at: startedAt });
        console.info("[email-notify] invoking notify-message-recipient", { conversationId });
        supabase.functions
          .invoke("notify-message-recipient", {
            body: { conversationId, preview: content },
          })
          .then(({ data, error }) => {
            const ms = Date.now() - startedAt;
            if (error) {
              const msg = error.message ?? "Erreur inconnue";
              console.error("[email-notify] FAILED", { error, ms });
              setLastEmailStatus({ state: "error", at: Date.now(), ms, message: msg });
              try {
                import("sonner").then(({ toast }) => {
                  toast.error("Notification email non envoyée", { description: msg });
                });
              } catch {}
            } else {
              console.info("[email-notify] OK", { data, ms });
              setLastEmailStatus({ state: "ok", at: Date.now(), ms });
              try {
                import("sonner").then(({ toast }) => {
                  toast.success("Email de notification envoyé", { duration: 1800 });
                });
              } catch {}
            }
          })
          .catch((err) => {
            const ms = Date.now() - startedAt;
            const msg = err?.message ?? String(err);
            console.error("[email-notify] EXCEPTION", err);
            setLastEmailStatus({ state: "error", at: Date.now(), ms, message: msg });
            try {
              import("sonner").then(({ toast }) => {
                toast.error("Notification email non envoyée", { description: msg });
              });
            } catch {}
          });
      }
    },
    [conversationId, deliveryId, isDeliveryConversation, profileId, userId]
  );

  return { messages, setMessages, loading, sendMessage, lastEmailStatus };
}
