import { useState, useEffect, useRef, useCallback } from "react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import MobileBottomNav from "@/components/layout/MobileBottomNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { useProfile } from "@/contexts/ProfileContext";
import { supabase } from "@/integrations/supabase/client";
import { Mail, Phone, MapPin, Send, MessageCircle, Clock, Loader2, Bot, User, X, Minimize2, Maximize2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface SupportMessage {
  id: string;
  ticket_id: string;
  user_id: string;
  sender_role: string;
  content: string;
  created_at: string;
  is_read: boolean;
}

const Contact = () => {
  const { toast } = useToast();
  const { user, profile } = useProfile();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });

  // Chat state
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMinimized, setChatMinimized] = useState(false);
  const [chatMessages, setChatMessages] = useState<SupportMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [ticketId, setTicketId] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [isLoadingChat, setIsLoadingChat] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Load existing ticket for user
  const loadExistingTicket = useCallback(async () => {
    if (!user) return;
    setIsLoadingChat(true);
    const { data } = await supabase
      .from("support_messages")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true })
      .limit(100);

    if (data && data.length > 0) {
      const latestTicket = (data as any[])[data.length - 1].ticket_id;
      setTicketId(latestTicket);
      setChatMessages(
        (data as any[]).filter((m: any) => m.ticket_id === latestTicket)
      );
    }
    setIsLoadingChat(false);
  }, [user]);

  useEffect(() => {
    if (chatOpen && user) {
      loadExistingTicket();
    }
  }, [chatOpen, user, loadExistingTicket]);

  // Realtime subscription
  useEffect(() => {
    if (!user || !ticketId) return;
    const channel = supabase
      .channel(`support-${ticketId}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "support_messages",
        filter: `ticket_id=eq.${ticketId}`,
      }, (payload) => {
        const msg = payload.new as SupportMessage;
        setChatMessages(prev => {
          if (prev.some(m => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, ticketId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const sendChatMessage = async () => {
    if (!chatInput.trim() || !user || isSending) return;
    setIsSending(true);

    const currentTicketId = ticketId || crypto.randomUUID();
    if (!ticketId) setTicketId(currentTicketId);

    const { error } = await supabase.from("support_messages").insert({
      ticket_id: currentTicketId,
      user_id: user.id,
      sender_role: "user",
      user_name: profile?.full_name || user.email?.split("@")[0],
      user_email: user.email,
      content: chatInput.trim(),
      subject: chatMessages.length === 0 ? "Nouveau ticket support" : undefined,
    } as any);

    if (error) {
      toast({ title: "Erreur", description: "Impossible d'envoyer le message.", variant: "destructive" });
    } else {
      setChatInput("");
    }
    setIsSending(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.subject || !form.message) {
      toast({ title: "Erreur", description: "Veuillez remplir tous les champs.", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);

    if (user) {
      const newTicketId = crypto.randomUUID();
      await supabase.from("support_messages").insert({
        ticket_id: newTicketId,
        user_id: user.id,
        sender_role: "user",
        user_name: form.name,
        user_email: form.email,
        subject: form.subject,
        content: form.message,
      } as any);
    }

    toast({ title: "Message envoyé !", description: "Nous vous répondrons dans les plus brefs délais." });
    setForm({ name: "", email: "", subject: "", message: "" });
    setIsSubmitting(false);
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="min-h-screen bg-background pb-14 lg:pb-0">
      <Header />
      <main>
        <div className="bg-primary/5 border-b border-border py-8 sm:py-12">
          <div className="container mx-auto px-4 text-center">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <MessageCircle className="w-7 h-7 text-primary" />
            </div>
            <h1 className="font-heading text-2xl sm:text-3xl font-bold text-foreground mb-2">
              Contactez-nous
            </h1>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Une question, une suggestion ou un partenariat ? Notre équipe est à votre écoute.
            </p>
          </div>
        </div>

        <div className="container mx-auto px-4 py-8 sm:py-12 max-w-5xl">
          <div className="grid lg:grid-cols-3 gap-6 sm:gap-8">
            {/* Contact Info */}
            <div className="space-y-4">
              <Card>
                <CardContent className="p-5 flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Mail className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-heading font-semibold text-sm text-foreground">Email</h3>
                    <a href="mailto:contact@nukuconnect.com" className="text-sm text-primary hover:underline">contact@nukuconnect.com</a>
                    <p className="text-xs text-muted-foreground mt-0.5">Réponse sous 24h</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-5 flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Phone className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-heading font-semibold text-sm text-foreground">Téléphone</h3>
                    <a href="tel:+22891971076" className="text-sm text-primary hover:underline">+228 91 97 10 76</a>
                    <a href="tel:+22891201468" className="text-sm text-primary hover:underline block">+228 91 20 14 68</a>
                    <p className="text-xs text-muted-foreground mt-0.5">Lun - Ven, 8h - 18h</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-5 flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-heading font-semibold text-sm text-foreground">Adresse</h3>
                    <p className="text-sm text-foreground">Lomé, Togo</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Afrique de l'Ouest</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-5 flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Clock className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-heading font-semibold text-sm text-foreground">Horaires</h3>
                    <p className="text-sm text-foreground">Lundi - Vendredi</p>
                    <p className="text-xs text-muted-foreground mt-0.5">8h00 - 18h00 (GMT)</p>
                  </div>
                </CardContent>
              </Card>

              {/* Live Chat CTA */}
              {user && (
                <Card className="border-primary/30 bg-primary/5">
                  <CardContent className="p-5">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
                        <MessageCircle className="w-5 h-5 text-primary-foreground" />
                      </div>
                      <div>
                        <h3 className="font-heading font-semibold text-sm text-foreground">Chat en direct</h3>
                        <p className="text-xs text-muted-foreground">Discutez avec notre équipe</p>
                      </div>
                    </div>
                    <Button variant="hero" className="w-full gap-2" onClick={() => setChatOpen(true)}>
                      <MessageCircle className="w-4 h-4" />
                      Démarrer le chat
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Contact Form */}
            <div className="lg:col-span-2">
              <Card>
                <CardContent className="p-5 sm:p-8">
                  <h2 className="font-heading text-lg font-bold text-foreground mb-1">Envoyez-nous un message</h2>
                  <p className="text-xs text-muted-foreground mb-6">Remplissez le formulaire ci-dessous et nous vous répondrons rapidement.</p>

                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Nom complet</Label>
                        <Input id="name" placeholder="Votre nom" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input id="email" type="email" placeholder="votre@email.com" value={form.email} onChange={e => setForm({...form, email: e.target.value})} required />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="subject">Sujet</Label>
                      <Input id="subject" placeholder="Sujet de votre message" value={form.subject} onChange={e => setForm({...form, subject: e.target.value})} required />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="message">Message</Label>
                      <Textarea id="message" placeholder="Décrivez votre demande en détail..." rows={6} value={form.message} onChange={e => setForm({...form, message: e.target.value})} required />
                    </div>

                    <Button type="submit" variant="hero" className="w-full gap-2" disabled={isSubmitting}>
                      {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      {isSubmitting ? "Envoi en cours..." : "Envoyer le message"}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>

      {/* Floating Chat Widget */}
      <AnimatePresence>
        {chatOpen && user && (
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.9 }}
            className="fixed bottom-20 right-4 sm:bottom-6 sm:right-6 z-50 w-[calc(100vw-2rem)] sm:w-96"
          >
            <Card className="shadow-xl border-primary/20 overflow-hidden">
              {/* Chat Header */}
              <div className="bg-primary text-primary-foreground p-3 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-primary-foreground/20 flex items-center justify-center">
                    <Bot className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">Support NUKUCONNECT</p>
                    <div className="flex items-center gap-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
                      <span className="text-[10px] opacity-80">En ligne</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => setChatMinimized(!chatMinimized)} className="p-1.5 rounded-full hover:bg-primary-foreground/10">
                    {chatMinimized ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
                  </button>
                  <button onClick={() => setChatOpen(false)} className="p-1.5 rounded-full hover:bg-primary-foreground/10">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {!chatMinimized && (
                <>
                  {/* Chat Body */}
                  <ScrollArea className="h-72 sm:h-80">
                    <div className="p-3 space-y-3">
                      {/* Welcome message */}
                      <div className="flex gap-2">
                        <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Bot className="w-3.5 h-3.5 text-primary" />
                        </div>
                        <div className="bg-muted rounded-xl rounded-tl-sm p-3 max-w-[80%]">
                          <p className="text-xs text-foreground">
                            👋 Bonjour{profile?.full_name ? ` ${profile.full_name}` : ""} ! Comment pouvons-nous vous aider aujourd'hui ?
                          </p>
                          <p className="text-[9px] text-muted-foreground mt-1">Équipe Support</p>
                        </div>
                      </div>

                      {isLoadingChat && (
                        <div className="flex justify-center py-4">
                          <Loader2 className="w-5 h-5 animate-spin text-primary" />
                        </div>
                      )}

                      {chatMessages.map((msg) => {
                        const isUser = msg.sender_role === "user";
                        return (
                          <div key={msg.id} className={`flex gap-2 ${isUser ? "flex-row-reverse" : ""}`}>
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                              isUser ? "bg-primary" : "bg-primary/10"
                            }`}>
                              {isUser ? (
                                <User className="w-3.5 h-3.5 text-primary-foreground" />
                              ) : (
                                <Bot className="w-3.5 h-3.5 text-primary" />
                              )}
                            </div>
                            <div className={`rounded-xl p-3 max-w-[80%] ${
                              isUser
                                ? "bg-primary text-primary-foreground rounded-tr-sm"
                                : "bg-muted text-foreground rounded-tl-sm"
                            }`}>
                              <p className="text-xs whitespace-pre-wrap">{msg.content}</p>
                              <p className={`text-[9px] mt-1 ${isUser ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                                {formatTime(msg.created_at)}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                      <div ref={chatEndRef} />
                    </div>
                  </ScrollArea>

                  {/* Chat Input */}
                  <div className="border-t border-border p-3">
                    <form onSubmit={(e) => { e.preventDefault(); sendChatMessage(); }} className="flex gap-2">
                      <Input
                        placeholder="Écrivez votre message..."
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        className="flex-1 h-9 text-xs"
                        disabled={isSending}
                      />
                      <Button type="submit" size="icon" className="h-9 w-9" disabled={!chatInput.trim() || isSending}>
                        {isSending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                      </Button>
                    </form>
                  </div>
                </>
              )}
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating chat button (when chat is closed and user is logged in) */}
      {user && !chatOpen && (
        <motion.button
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          onClick={() => setChatOpen(true)}
          className="fixed bottom-20 right-4 sm:bottom-6 sm:right-6 z-50 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 flex items-center justify-center transition-colors"
        >
          <MessageCircle className="w-6 h-6" />
        </motion.button>
      )}

      <Footer />
      <MobileBottomNav />
    </div>
  );
};

export default Contact;
