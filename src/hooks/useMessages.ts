import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  emitMessagesRead,
  queueOfflineRead,
  replayOfflineReads,
} from "@/lib/messageReadEvents";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";
import { translateBackendError } from "@/lib/i18nErrors";

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
  const { t } = useLanguage();
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
      const otherUnread = data.filter(
        (m: any) => m.sender_id !== myId && m.is_read === false
      );
      const decrement = otherUnread.length;
      // Deterministic eventId: based on the latest unread "other" message id.
      // → Re-opening the same conversation without any new incoming message
      //   produces the SAME eventId, so dedupe blocks the second decrement.
      const lastUnreadId = otherUnread.length
        ? otherUnread[otherUnread.length - 1].id
        : null;
      const eventId = lastUnreadId
        ? `${conversationId}:lastSeen:${lastUnreadId}`
        : `${conversationId}:empty`;

      // Mark unread messages as read (offline-aware)
      let didMarkRead = false;
      const isOnline = typeof navigator === "undefined" ? true : navigator.onLine;
      if (!isOnline && decrement > 0) {
        queueOfflineRead({ conversationId: conversationId!, decrement, eventId });
        didMarkRead = true;
      } else if (isDeliveryConversation && userId) {
        const { error: upErr } = await supabase
          .from("delivery_messages")
          .update({ is_read: true })
          .eq("delivery_id", deliveryId)
          .neq("sender_id", userId)
          .eq("is_read", false);
        if (!upErr) didMarkRead = true;
        else if (decrement > 0) { queueOfflineRead({ conversationId: conversationId!, decrement, eventId }); didMarkRead = true; }
      } else if (profileId) {
        const { error: upErr } = await supabase
          .from("messages")
          .update({ is_read: true })
          .eq("conversation_id", conversationId)
          .neq("sender_id", profileId)
          .eq("is_read", false);
        if (!upErr) didMarkRead = true;
        else if (decrement > 0) { queueOfflineRead({ conversationId: conversationId!, decrement, eventId }); didMarkRead = true; }
      }
      if (didMarkRead) {
        emitMessagesRead({ conversationId: conversationId!, decrement, eventId });
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

          // Auto-mark as read if from other (deterministic eventId per message)
          if (isDeliveryConversation && m.sender_id !== userId && userId) {
            supabase.from("delivery_messages").update({ is_read: true }).eq("id", m.id).then(() => {
              emitMessagesRead({ conversationId: conversationId!, decrement: 1, eventId: `${conversationId}:msg:${m.id}` });
            });
          } else if (m.sender_id !== profileId && profileId) {
            supabase.from("messages").update({ is_read: true }).eq("id", m.id).then(() => {
              emitMessagesRead({ conversationId: conversationId!, decrement: 1, eventId: `${conversationId}:msg:${m.id}` });
            });
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [conversationId, deliveryId, isDeliveryConversation, profileId, userId]);

  // Replay queued offline read intents when connection returns
  useEffect(() => {
    const sync = async (detail: { conversationId: string }) => {
      const cid = detail.conversationId;
      if (cid?.startsWith("delivery-") && userId) {
        await supabase
          .from("delivery_messages")
          .update({ is_read: true })
          .eq("delivery_id", cid.replace("delivery-", ""))
          .neq("sender_id", userId)
          .eq("is_read", false);
      } else if (profileId) {
        await supabase
          .from("messages")
          .update({ is_read: true })
          .eq("conversation_id", cid)
          .neq("sender_id", profileId)
          .eq("is_read", false);
      }
    };
    const onOnline = () => { replayOfflineReads(sync); };
    if (typeof navigator !== "undefined" && navigator.onLine) replayOfflineReads(sync);
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, [profileId, userId]);

  const sendMessage = useCallback(
    async (content: string, replyToId?: string) => {
      if (!conversationId || !content.trim()) return false;
      if (isDeliveryConversation && !userId) {
        toast.error("Connexion requise", { description: "Votre session n'est pas encore prête. Réessayez dans un instant." });
        return false;
      }
      if (!isDeliveryConversation && !profileId) {
        toast.error("Profil introuvable", { description: "Rechargez la page ou reconnectez-vous si le problème persiste." });
        return false;
      }

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
        toast.error(t("err.generic"), { description: translateBackendError(error, t) });
        return false;
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
      return true;
    },
    [conversationId, deliveryId, isDeliveryConversation, profileId, userId, t]
  );

  const deleteMessage = useCallback(
    async (messageId: string) => {
      if (!conversationId || !messageId || messageId.startsWith("temp-")) return false;
      const placeholder = t("chat.message.deleted") || "🚫 Message supprimé";
      const prev = messages;
      // Optimistic soft-delete: replace content with placeholder immediately.
      setMessages((cur) =>
        cur.map((m) =>
          m.id === messageId ? { ...m, content: placeholder, type: "text" as const, fileUrl: undefined } : m
        )
      );
      const table = isDeliveryConversation ? "delivery_messages" : "messages";
      const { error } = await supabase
        .from(table)
        .update({ content: placeholder } as any)
        .eq("id", messageId);
      if (error) {
        setMessages(prev);
        toast.error(t("err.generic"), { description: translateBackendError(error, t) });
        return false;
      }
      return true;
    },
    [conversationId, isDeliveryConversation, messages, t]
  );

  /**
   * Mark a single message as read when it becomes visible in the viewport.
   * Used by the ChatArea IntersectionObserver — replaces the coarser
   * "mark all as read on open" behaviour with per-message precision.
   */
  const markMessageRead = useCallback(
    async (messageId: string) => {
      if (!conversationId || !messageId || messageId.startsWith("temp-")) return;
      const msg = messages.find((m) => m.id === messageId);
      if (!msg || msg.senderId === "me" || msg.status === "read") return;
      // Optimistic
      setMessages((cur) =>
        cur.map((m) => (m.id === messageId ? { ...m, status: "read" as const } : m))
      );
      const table = isDeliveryConversation ? "delivery_messages" : "messages";
      const { error } = await supabase
        .from(table)
        .update({ is_read: true } as any)
        .eq("id", messageId)
        .eq("is_read", false);
      if (!error) {
        emitMessagesRead({
          conversationId,
          decrement: 1,
          eventId: `${conversationId}:visible:${messageId}`,
        });
      }
    },
    [conversationId, isDeliveryConversation, messages]
  );

  return { messages, setMessages, loading, sendMessage, deleteMessage, markMessageRead, lastEmailStatus };
}
