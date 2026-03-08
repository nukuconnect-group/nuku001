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

export function useMessages(conversationId: string | null, profileId: string | null) {
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchMessages = useCallback(async () => {
    if (!conversationId) { setMessages([]); return; }
    setLoading(true);

    const { data } = await supabase
      .from("messages")
      .select("id, content, sender_id, is_read, created_at, reply_to_id")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

    if (data) {
      setMessages(
        data.map((m: any) => ({
          id: m.id,
          senderId: m.sender_id === profileId ? "me" : "other",
          content: m.content,
          timestamp: new Date(m.created_at),
          status: m.is_read ? "read" as const : "delivered" as const,
          type: "text" as const,
          replyToId: m.reply_to_id || undefined,
        }))
      );

      // Mark unread messages as read
      if (profileId) {
        await supabase
          .from("messages")
          .update({ is_read: true })
          .eq("conversation_id", conversationId)
          .neq("sender_id", profileId)
          .eq("is_read", false);
      }
    }

    setLoading(false);
  }, [conversationId, profileId]);

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
        { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` },
        (payload) => {
          const m = payload.new as any;
          const newMsg: MessageItem = {
            id: m.id,
            senderId: m.sender_id === profileId ? "me" : "other",
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
          if (m.sender_id !== profileId && profileId) {
            supabase.from("messages").update({ is_read: true }).eq("id", m.id).then();
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [conversationId, profileId]);

  const sendMessage = useCallback(
    async (content: string, replyToId?: string) => {
      if (!conversationId || !profileId || !content.trim()) return;

      const tempId = `temp-${Date.now()}`;
      const optimistic: MessageItem = {
        id: tempId, senderId: "me", content, timestamp: new Date(),
        status: "sent", type: "text", replyToId,
      };
      setMessages((prev) => [...prev, optimistic]);

      const insertData: any = { conversation_id: conversationId, sender_id: profileId, content };
      if (replyToId && !replyToId.startsWith("temp-")) {
        insertData.reply_to_id = replyToId;
      }

      const { data, error } = await supabase
        .from("messages")
        .insert(insertData)
        .select("id")
        .single();

      if (error) {
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
        return;
      }

      setMessages((prev) =>
        prev.map((m) => (m.id === tempId ? { ...m, id: data.id, status: "delivered" as const } : m))
      );

      await supabase.from("conversations").update({ updated_at: new Date().toISOString() }).eq("id", conversationId);
    },
    [conversationId, profileId]
  );

  return { messages, setMessages, loading, sendMessage };
}
