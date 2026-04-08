import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageCircle, Send, Loader2, X, Bot, User } from "lucide-react";

const autoReplies: Record<string, string> = {
  bonjour: "Bonjour ! 👋 Comment puis-je vous aider aujourd'hui ?",
  aide: "Je suis là pour vous aider ! Décrivez votre problème et notre équipe reviendra vers vous rapidement.",
  commande: "Pour toute question sur une commande, merci de préciser le numéro ou la date de votre commande. Un agent va prendre en charge votre demande.",
  livraison: "Pour le suivi de livraison, rendez-vous dans votre tableau de bord > Suivi. Si le problème persiste, un agent vous contactera.",
  paiement: "Pour les questions de paiement, vérifiez votre historique dans Paramètres > Transactions. Un agent va examiner votre demande.",
  produit: "Pour signaler un problème avec un produit, précisez le nom du produit et le souci rencontré. Notre équipe qualité va intervenir.",
  default: "Merci pour votre message ! Un agent de notre équipe va prendre en charge votre demande sous peu. En attendant, n'hésitez pas à détailler votre besoin.",
};

const getAutoReply = (msg: string): string => {
  const lower = msg.toLowerCase();
  for (const [key, reply] of Object.entries(autoReplies)) {
    if (key !== "default" && lower.includes(key)) return reply;
  }
  return autoReplies.default;
};

interface Props {
  userId?: string;
  userName?: string;
  userEmail?: string;
}

export default function SupportWidget({ userId, userName, userEmail }: Props) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [ticketId, setTicketId] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || !userId) return;
    const loadExisting = async () => {
      const { data } = await supabase
        .from("support_messages")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: true })
        .limit(50);
      if (data && data.length > 0) {
        setMessages(data);
        setTicketId(data[0].ticket_id);
      }
    };
    loadExisting();
  }, [open, userId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Realtime
  useEffect(() => {
    if (!ticketId) return;
    const channel = supabase
      .channel(`support-${ticketId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "support_messages", filter: `ticket_id=eq.${ticketId}` },
        (payload) => setMessages(prev => {
          if (prev.some(m => m.id === payload.new.id)) return prev;
          return [...prev, payload.new];
        })
      ).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [ticketId]);

  const sendMessage = async () => {
    if (!input.trim() || !userId) return;
    setSending(true);
    const tid = ticketId || crypto.randomUUID();
    if (!ticketId) setTicketId(tid);

    const userMsg = {
      ticket_id: tid,
      user_id: userId,
      sender_role: "user",
      content: input.trim(),
      subject: messages.length === 0 ? input.trim().slice(0, 60) : null,
      user_name: userName || null,
      user_email: userEmail || null,
    };

    const { data } = await supabase.from("support_messages").insert(userMsg).select().single();
    if (data) setMessages(prev => [...prev, data]);

    // Auto-reply
    const autoReply = getAutoReply(input);
    setInput("");
    setSending(false);

    setTimeout(async () => {
      const botMsg = {
        ticket_id: tid,
        user_id: userId,
        sender_role: "bot",
        content: autoReply,
        user_name: "Assistant NukuConnect",
      };
      const { data: botData } = await supabase.from("support_messages").insert(botMsg).select().single();
      if (botData) setMessages(prev => [...prev, botData]);
    }, 1200);
  };

  if (!userId) return null;

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-20 lg:bottom-6 right-4 z-50 w-12 h-12 rounded-full bg-primary text-primary-foreground shadow-elevated flex items-center justify-center hover:scale-105 transition-transform"
        >
          <MessageCircle className="w-5 h-5" />
        </button>
      )}

      {open && (
        <div className="fixed bottom-20 lg:bottom-6 right-4 z-50 w-80 sm:w-96 bg-card border border-border rounded-2xl shadow-elevated flex flex-col max-h-[70vh]">
          <div className="flex items-center justify-between p-3 border-b border-border bg-primary/5 rounded-t-2xl">
            <div className="flex items-center gap-2">
              <Bot className="w-5 h-5 text-primary" />
              <div>
                <p className="text-xs font-bold text-foreground">Support NukuConnect</p>
                <p className="text-[9px] text-muted-foreground">Nous sommes là pour vous aider</p>
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="p-1 rounded-lg hover:bg-muted">
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>

          <ScrollArea className="flex-1 p-3 min-h-[200px] max-h-[50vh]">
            {messages.length === 0 && (
              <div className="text-center py-8">
                <Bot className="w-10 h-10 text-primary/30 mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">Décrivez votre problème ou besoin</p>
              </div>
            )}
            {messages.map((msg, i) => (
              <div key={msg.id || i} className={`flex mb-2 ${msg.sender_role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[80%] rounded-xl px-3 py-2 text-xs ${
                  msg.sender_role === "user"
                    ? "bg-primary text-primary-foreground"
                    : msg.sender_role === "bot"
                    ? "bg-muted text-foreground"
                    : "bg-accent/20 text-foreground border border-accent/30"
                }`}>
                  {msg.sender_role === "admin" && (
                    <p className="text-[9px] font-bold text-primary mb-0.5">Agent Support</p>
                  )}
                  {msg.content}
                </div>
              </div>
            ))}
            <div ref={endRef} />
          </ScrollArea>

          <div className="p-2 border-t border-border flex gap-1.5">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              placeholder="Écrivez votre message..."
              className="text-xs h-9"
            />
            <Button size="sm" onClick={sendMessage} disabled={sending || !input.trim()} className="h-9 w-9 p-0 flex-shrink-0">
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
