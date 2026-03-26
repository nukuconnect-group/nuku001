import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { MessageCircle, Send, Loader2, Truck, User, Check, CheckCheck } from "lucide-react";

interface DeliveryChatProps {
  deliveryId: string;
  currentUserRole: "buyer" | "driver";
  otherPartyName?: string;
  trigger?: React.ReactNode;
}

interface Message {
  id: string;
  delivery_id: string;
  sender_id: string;
  sender_role: string;
  content: string;
  is_read: boolean;
  created_at: string;
}

const DeliveryChat = ({ deliveryId, currentUserRole, otherPartyName, trigger }: DeliveryChatProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Get current user
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserId(session?.user?.id || null);
    });
  }, []);

  // Fetch messages
  const fetchMessages = useCallback(async () => {
    const { data } = await supabase
      .from("delivery_messages" as any)
      .select("*")
      .eq("delivery_id", deliveryId)
      .order("created_at", { ascending: true });
    
    setMessages((data as Message[]) || []);
    
    // Count unread for badge
    if (userId) {
      const unread = ((data as Message[]) || []).filter(
        m => m.sender_id !== userId && !m.is_read
      ).length;
      setUnreadCount(unread);
    }
  }, [deliveryId, userId]);

  useEffect(() => {
    if (!deliveryId) return;
    fetchMessages();
  }, [deliveryId, fetchMessages]);

  // Realtime subscription
  useEffect(() => {
    if (!deliveryId) return;
    const channel = supabase
      .channel(`delivery-chat-${deliveryId}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "delivery_messages",
        filter: `delivery_id=eq.${deliveryId}`,
      }, (payload) => {
        const newMsg = payload.new as Message;
        setMessages(prev => [...prev, newMsg]);
        if (newMsg.sender_id !== userId) {
          setUnreadCount(prev => prev + 1);
          // Play notification sound
          try {
            const ctx = new AudioContext();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.frequency.value = 800;
            gain.gain.value = 0.1;
            osc.start();
            osc.stop(ctx.currentTime + 0.15);
          } catch {}
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [deliveryId, userId]);

  // Mark as read when opening
  useEffect(() => {
    if (!isOpen || !userId || !deliveryId) return;
    const markRead = async () => {
      await supabase
        .from("delivery_messages" as any)
        .update({ is_read: true })
        .eq("delivery_id", deliveryId)
        .neq("sender_id", userId)
        .eq("is_read", false);
      setUnreadCount(0);
    };
    markRead();
  }, [isOpen, userId, deliveryId, messages.length]);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async () => {
    if (!newMessage.trim() || !userId || sending) return;
    setSending(true);
    try {
      await supabase.from("delivery_messages" as any).insert({
        delivery_id: deliveryId,
        sender_id: userId,
        sender_role: currentUserRole,
        content: newMessage.trim(),
      });
      setNewMessage("");
      inputRef.current?.focus();
    } catch (err) {
      console.error("Send message error:", err);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  };

  const roleLabel = currentUserRole === "buyer" ? "Livreur" : "Client";
  const RoleIcon = currentUserRole === "buyer" ? Truck : User;

  const quickMessages = currentUserRole === "buyer"
    ? ["Je suis disponible", "Quelle est votre position ?", "Merci !"]
    : ["J'arrive dans 5 min", "Je suis en route", "Livraison effectuée"];

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="gap-1.5 relative">
            <MessageCircle className="w-4 h-4" />
            <span className="text-xs">Chat</span>
            {unreadCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-destructive text-white rounded-full text-[9px] flex items-center justify-center font-bold">
                {unreadCount}
              </span>
            )}
          </Button>
        )}
      </SheetTrigger>
      <SheetContent side="bottom" className="h-[85vh] sm:h-[70vh] p-0 rounded-t-2xl">
        <SheetHeader className="p-3 border-b border-border">
          <SheetTitle className="flex items-center gap-2 text-sm">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <RoleIcon className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="font-semibold text-sm">{otherPartyName || roleLabel}</p>
              <p className="text-[10px] text-muted-foreground font-normal">
                Chat livraison #{deliveryId.slice(0, 8)}
              </p>
            </div>
            <Badge variant="secondary" className="ml-auto text-[9px]">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 mr-1" />
              En ligne
            </Badge>
          </SheetTitle>
        </SheetHeader>

        {/* Messages area */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-2" style={{ height: "calc(85vh - 140px)" }}>
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <MessageCircle className="w-10 h-10 text-muted-foreground/30 mb-2" />
              <p className="text-sm text-muted-foreground">Aucun message</p>
              <p className="text-xs text-muted-foreground">Envoyez un message pour commencer la conversation</p>
            </div>
          ) : (
            messages.map((msg) => {
              const isMine = msg.sender_id === userId;
              return (
                <div key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[80%] rounded-2xl px-3 py-2 ${
                    isMine
                      ? "bg-primary text-primary-foreground rounded-br-md"
                      : "bg-muted text-foreground rounded-bl-md"
                  }`}>
                    {!isMine && (
                      <p className="text-[9px] font-semibold mb-0.5 opacity-70">
                        {msg.sender_role === "driver" ? "🚚 Livreur" : "👤 Client"}
                      </p>
                    )}
                    <p className="text-sm leading-relaxed">{msg.content}</p>
                    <div className={`flex items-center gap-1 mt-0.5 ${isMine ? "justify-end" : "justify-start"}`}>
                      <span className="text-[9px] opacity-60">{formatTime(msg.created_at)}</span>
                      {isMine && (
                        msg.is_read 
                          ? <CheckCheck className="w-3 h-3 opacity-60" />
                          : <Check className="w-3 h-3 opacity-40" />
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Quick messages */}
        <div className="px-3 py-1.5 flex gap-1.5 overflow-x-auto scrollbar-hide border-t border-border">
          {quickMessages.map((qm) => (
            <button
              key={qm}
              className="flex-shrink-0 text-[10px] px-2.5 py-1 rounded-full bg-muted hover:bg-muted/80 text-foreground transition-colors"
              onClick={() => { setNewMessage(qm); inputRef.current?.focus(); }}
            >
              {qm}
            </button>
          ))}
        </div>

        {/* Input area */}
        <div className="p-3 border-t border-border flex gap-2">
          <Input
            ref={inputRef}
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Tapez votre message..."
            className="flex-1 h-10 text-sm"
            disabled={sending}
          />
          <Button
            variant="hero"
            size="icon"
            className="h-10 w-10 flex-shrink-0"
            onClick={sendMessage}
            disabled={!newMessage.trim() || sending}
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default DeliveryChat;
