import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageCircle, Send, Loader2, User, Bot, Clock, Search } from "lucide-react";

interface Ticket {
  ticket_id: string;
  user_name: string | null;
  user_email: string | null;
  user_id: string;
  subject: string | null;
  last_message: string;
  last_time: string;
  unread_count: number;
}

interface SupportMessage {
  id: string;
  ticket_id: string;
  user_id: string;
  sender_role: string;
  content: string;
  created_at: string;
  is_read: boolean;
  user_name: string | null;
}

interface Props {
  adminProfileId: string;
}

export default function SupportChat({ adminProfileId }: Props) {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<string | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Load all tickets (grouped by ticket_id)
  const loadTickets = async () => {
    const { data } = await supabase
      .from("support_messages")
      .select("*")
      .order("created_at", { ascending: false });

    if (!data) { setIsLoading(false); return; }

    // Group by ticket_id
    const ticketMap = new Map<string, Ticket>();
    (data as any[]).forEach((msg: any) => {
      const existing = ticketMap.get(msg.ticket_id);
      if (!existing) {
        ticketMap.set(msg.ticket_id, {
          ticket_id: msg.ticket_id,
          user_name: msg.user_name,
          user_email: msg.user_email,
          user_id: msg.user_id,
          subject: msg.subject,
          last_message: msg.content,
          last_time: msg.created_at,
          unread_count: msg.sender_role === "user" && !msg.is_read ? 1 : 0,
        });
      } else {
        if (new Date(msg.created_at) > new Date(existing.last_time)) {
          existing.last_message = msg.content;
          existing.last_time = msg.created_at;
        }
        if (!msg.subject && existing.subject) {
          // keep existing subject
        } else if (msg.subject) {
          existing.subject = msg.subject;
        }
        if (msg.user_name) existing.user_name = msg.user_name;
        if (msg.user_email) existing.user_email = msg.user_email;
        if (msg.sender_role === "user" && !msg.is_read) existing.unread_count++;
      }
    });

    setTickets(Array.from(ticketMap.values()).sort((a, b) =>
      new Date(b.last_time).getTime() - new Date(a.last_time).getTime()
    ));
    setIsLoading(false);
  };

  useEffect(() => {
    loadTickets();

    // Realtime for all new support messages
    const channel = supabase
      .channel("admin-support-all")
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "support_messages",
      }, () => {
        loadTickets();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  // Load messages for selected ticket
  useEffect(() => {
    if (!selectedTicket) return;

    const loadMessages = async () => {
      const { data } = await supabase
        .from("support_messages")
        .select("*")
        .eq("ticket_id", selectedTicket)
        .order("created_at", { ascending: true });

      setMessages((data as SupportMessage[]) || []);

      // Mark user messages as read
      await supabase
        .from("support_messages")
        .update({ is_read: true } as any)
        .eq("ticket_id", selectedTicket)
        .eq("sender_role", "user")
        .eq("is_read", false);

      // Refresh ticket counts
      loadTickets();
    };
    loadMessages();

    const channel = supabase
      .channel(`admin-support-${selectedTicket}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "support_messages",
        filter: `ticket_id=eq.${selectedTicket}`,
      }, (payload) => {
        const msg = payload.new as SupportMessage;
        setMessages(prev => {
          if (prev.some(m => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [selectedTicket]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendReply = async () => {
    if (!newMessage.trim() || !selectedTicket || isSending) return;
    setIsSending(true);

    const ticket = tickets.find(t => t.ticket_id === selectedTicket);
    
    // Get current admin user id
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setIsSending(false); return; }

    await supabase.from("support_messages").insert({
      ticket_id: selectedTicket,
      user_id: ticket?.user_id || session.user.id,
      sender_role: "admin",
      content: newMessage.trim(),
      user_name: "Support NUKUCONNECT",
    } as any);

    setNewMessage("");
    setIsSending(false);
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
    if (diffDays === 1) return "Hier";
    return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
  };

  const totalUnread = tickets.reduce((sum, t) => sum + t.unread_count, 0);

  const filteredTickets = tickets.filter(t => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      t.user_name?.toLowerCase().includes(q) ||
      t.user_email?.toLowerCase().includes(q) ||
      t.subject?.toLowerCase().includes(q) ||
      t.last_message.toLowerCase().includes(q)
    );
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-[600px]">
      {/* Ticket List */}
      <Card className="lg:col-span-1">
        <CardHeader className="p-3 border-b border-border">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <MessageCircle className="w-4 h-4 text-primary" />
              Tickets Support
              {totalUnread > 0 && (
                <Badge variant="destructive" className="text-[9px] px-1.5 py-0 h-4">{totalUnread}</Badge>
              )}
            </CardTitle>
          </div>
          <div className="relative mt-2">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              placeholder="Rechercher..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-8 text-xs"
            />
          </div>
        </CardHeader>
        <ScrollArea className="h-[calc(600px-90px)]">
          {filteredTickets.length === 0 ? (
            <div className="p-6 text-center">
              <MessageCircle className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">Aucun ticket support</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filteredTickets.map((ticket) => (
                <button
                  key={ticket.ticket_id}
                  onClick={() => setSelectedTicket(ticket.ticket_id)}
                  className={`w-full p-3 text-left hover:bg-muted/50 transition-colors ${
                    selectedTicket === ticket.ticket_id ? "bg-primary/5 border-l-2 border-primary" : ""
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <User className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold text-foreground truncate">
                          {ticket.user_name || "Utilisateur"}
                        </p>
                        <span className="text-[9px] text-muted-foreground flex-shrink-0">{formatTime(ticket.last_time)}</span>
                      </div>
                      {ticket.subject && (
                        <p className="text-[10px] text-primary font-medium truncate">{ticket.subject}</p>
                      )}
                      <p className="text-[10px] text-muted-foreground truncate mt-0.5">{ticket.last_message}</p>
                    </div>
                    {ticket.unread_count > 0 && (
                      <Badge variant="destructive" className="text-[8px] px-1 py-0 h-3.5 flex-shrink-0">
                        {ticket.unread_count}
                      </Badge>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </Card>

      {/* Chat Area */}
      <Card className="lg:col-span-2 flex flex-col">
        {selectedTicket ? (
          <>
            {/* Header */}
            <div className="p-3 border-b border-border flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {tickets.find(t => t.ticket_id === selectedTicket)?.user_name || "Utilisateur"}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {tickets.find(t => t.ticket_id === selectedTicket)?.user_email || ""}
                </p>
              </div>
              {tickets.find(t => t.ticket_id === selectedTicket)?.subject && (
                <Badge variant="secondary" className="ml-auto text-[10px]">
                  {tickets.find(t => t.ticket_id === selectedTicket)?.subject}
                </Badge>
              )}
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1">
              <div className="p-3 space-y-3">
                {messages.map((msg) => {
                  const isAdmin = msg.sender_role === "admin";
                  return (
                    <div key={msg.id} className={`flex gap-2 ${isAdmin ? "flex-row-reverse" : ""}`}>
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                        isAdmin ? "bg-primary" : "bg-muted"
                      }`}>
                        {isAdmin ? (
                          <Bot className="w-3.5 h-3.5 text-primary-foreground" />
                        ) : (
                          <User className="w-3.5 h-3.5 text-muted-foreground" />
                        )}
                      </div>
                      <div className={`rounded-xl p-3 max-w-[75%] ${
                        isAdmin
                          ? "bg-primary text-primary-foreground rounded-tr-sm"
                          : "bg-muted text-foreground rounded-tl-sm"
                      }`}>
                        <p className="text-xs whitespace-pre-wrap">{msg.content}</p>
                        <p className={`text-[9px] mt-1 ${isAdmin ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                          {formatTime(msg.created_at)}
                        </p>
                      </div>
                    </div>
                  );
                })}
                <div ref={chatEndRef} />
              </div>
            </ScrollArea>

            {/* Input */}
            <div className="border-t border-border p-3">
              <form onSubmit={(e) => { e.preventDefault(); sendReply(); }} className="flex gap-2">
                <Input
                  placeholder="Répondre au client..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  className="flex-1 h-9 text-xs"
                  disabled={isSending}
                />
                <Button type="submit" size="sm" className="h-9 gap-1.5" disabled={!newMessage.trim() || isSending}>
                  {isSending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  Envoyer
                </Button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <MessageCircle className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm font-medium text-foreground">Sélectionnez un ticket</p>
              <p className="text-xs text-muted-foreground mt-1">Choisissez une conversation pour répondre</p>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
