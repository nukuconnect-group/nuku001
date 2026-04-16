import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  MessageCircle, Send, Loader2, X, Bot, User, ChevronLeft,
  ShoppingCart, Truck, CreditCard, HelpCircle, AlertTriangle,
  Settings, Maximize2, Minimize2, Headphones
} from "lucide-react";

const SUPPORT_CATEGORIES = [
  { id: "commande", label: "Commandes", icon: ShoppingCart, color: "text-blue-600" },
  { id: "livraison", label: "Livraison", icon: Truck, color: "text-orange-600" },
  { id: "paiement", label: "Paiement", icon: CreditCard, color: "text-emerald-600" },
  { id: "compte", label: "Mon compte", icon: Settings, color: "text-purple-600" },
  { id: "produit", label: "Produits", icon: AlertTriangle, color: "text-amber-600" },
  { id: "autre", label: "Autre", icon: HelpCircle, color: "text-muted-foreground" },
];

const autoReplies: Record<string, { reply: string; suggestions?: string[] }> = {
  bonjour: {
    reply: "Bonjour ! 👋 Je suis l'assistant virtuel NukuConnect. Comment puis-je vous aider aujourd'hui ?",
    suggestions: ["J'ai un problème de commande", "Suivi de livraison", "Question sur le paiement", "Mon abonnement"],
  },
  salut: {
    reply: "Salut ! 👋 Bienvenue sur le support NukuConnect. Décrivez votre besoin et je ferai de mon mieux pour vous aider.",
    suggestions: ["Commander un produit", "Devenir fournisseur", "Problème technique"],
  },
  aide: {
    reply: "Je suis là pour vous aider ! 🤝 Voici les sujets les plus fréquents. Si votre question est complexe, un agent humain prendra le relais automatiquement.",
    suggestions: ["Commandes", "Livraisons", "Paiements", "Mon compte"],
  },
  commande: {
    reply: "📦 Pour les commandes :\n• Consultez vos commandes dans **Tableau de bord > Commandes**\n• Chaque commande a un statut en temps réel\n• Pour annuler, contactez le fournisseur via la messagerie\n\nPrécisez votre problème et je vous guiderai.",
    suggestions: ["Annuler une commande", "Commande non reçue", "Modifier ma commande", "Contacter le vendeur"],
  },
  livraison: {
    reply: "🚚 Pour la livraison :\n• Suivez en temps réel dans **Suivi de livraison**\n• Nos livreurs sont notifiés automatiquement\n• Délai moyen : 30min-2h en zone urbaine\n\nQuel est votre souci exact ?",
    suggestions: ["Livraison en retard", "Changer l'adresse", "Contacter le livreur", "Livraison internationale"],
  },
  paiement: {
    reply: "💳 Pour les paiements :\n• Modes acceptés : Mobile Money (T-Money, Flooz), PayGate\n• Les paiements sont sécurisés et traçables\n• Remboursements traités sous 48h\n\nQuel est votre problème ?",
    suggestions: ["Remboursement", "Paiement échoué", "Retrait de gains", "Facture"],
  },
  abonnement: {
    reply: "👑 Pour votre abonnement :\n• **Gratuit** : 3 produits, durée 3 mois\n• **Premium** : crédits pour sponsoriser vos produits\n• Gérez votre pack dans **Mon abonnement**\n\nQue souhaitez-vous savoir ?",
    suggestions: ["Changer de pack", "Renouveler", "Avantages Premium"],
  },
  produit: {
    reply: "🛒 Pour les produits :\n• Publiez via **Tableau de bord > Publier un produit**\n• Ajoutez des photos de qualité pour plus de ventes\n• Les produits sont modérés par notre IA\n\nQuel est votre besoin ?",
    suggestions: ["Produit non conforme", "Signaler un vendeur", "Publier un produit"],
  },
  retrait: {
    reply: "💰 Retraits de gains :\n• Traités sous **24-48h ouvrables**\n• Via Mobile Money (T-Money ou Flooz)\n• Minimum de retrait : 1 000 FCFA\n• Vérifiez votre numéro dans Paramètres\n\nBesoin d'aide supplémentaire ?",
    suggestions: ["Retrait en attente", "Modifier mon numéro", "Historique des retraits"],
  },
  kyc: {
    reply: "🔒 Vérification KYC :\n• Nécessaire pour le badge **Fournisseur vérifié**\n• Soumettez votre pièce d'identité + selfie\n• Délai de validation : 24-72h\n• Disponible pour les comptes Pro/Business",
    suggestions: ["Soumettre mon KYC", "Statut de mon KYC", "Problème avec ma vérification"],
  },
  merci: {
    reply: "De rien ! 😊 N'hésitez pas si vous avez d'autres questions. L'équipe NukuConnect est là pour vous accompagner. Bonne journée ! 🌟",
  },
  default: {
    reply: "Merci pour votre message ! 🎧 Je vais analyser votre demande. Si nécessaire, un agent humain prendra le relais sous peu.\n\nEn attendant, vous pouvez consulter notre **Centre d'aide** pour des réponses rapides.",
    suggestions: ["Parler à un agent", "Centre d'aide", "WhatsApp : +228 91 20 14 68"],
  },
};

const getAutoReply = (msg: string) => {
  const lower = msg.toLowerCase();
  for (const [key, val] of Object.entries(autoReplies)) {
    if (key !== "default" && lower.includes(key)) return val;
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
  const [expanded, setExpanded] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [ticketId, setTicketId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showCategories, setShowCategories] = useState(true);
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
        setShowCategories(false);
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

  const startNewTicket = (categoryId: string) => {
    setSelectedCategory(categoryId);
    setShowCategories(false);
    setTicketId(null);
    setMessages([]);
    // Send initial auto-greeting
    const cat = SUPPORT_CATEGORIES.find(c => c.id === categoryId);
    const greeting = {
      id: `greeting-${Date.now()}`,
      sender_role: "bot",
      content: `Bienvenue dans le support ${cat?.label || ""}! 🎧 Décrivez votre problème et nous vous aiderons rapidement.`,
      created_at: new Date().toISOString(),
    };
    setMessages([greeting]);
  };

  const handleSuggestion = (text: string) => {
    setInput(text);
  };

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
      subject: messages.filter(m => !m.id?.startsWith("greeting")).length === 0
        ? `[${selectedCategory || "autre"}] ${input.trim().slice(0, 60)}`
        : null,
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
        content: autoReply.reply,
        user_name: "Assistant NukuConnect",
      };
      const { data: botData } = await supabase.from("support_messages").insert(botMsg).select().single();
      if (botData) {
        const enriched = { ...botData, _suggestions: autoReply.suggestions };
        setMessages(prev => [...prev, enriched]);
      }
    }, 1200);
  };

  const newTicket = () => {
    setShowCategories(true);
    setSelectedCategory(null);
    setTicketId(null);
    setMessages([]);
  };

  if (!userId) return null;

  const widgetSize = expanded
    ? "fixed inset-4 lg:inset-8 z-50"
    : "fixed bottom-20 lg:bottom-6 right-4 z-50 w-80 sm:w-96";

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
        <div className={`${widgetSize} bg-card border border-border rounded-2xl shadow-elevated flex flex-col ${expanded ? "max-h-full" : "max-h-[70vh]"}`}>
          {/* Header */}
          <div className="flex items-center justify-between p-3 border-b border-border bg-primary/5 rounded-t-2xl">
            <div className="flex items-center gap-2">
              {!showCategories && (
                <button onClick={newTicket} className="p-1 rounded-lg hover:bg-muted">
                  <ChevronLeft className="w-4 h-4 text-muted-foreground" />
                </button>
              )}
              <Headphones className="w-5 h-5 text-primary" />
              <div>
                <p className="text-xs font-bold text-foreground">Support NukuConnect</p>
                <p className="text-[9px] text-muted-foreground">
                  {ticketId ? `Ticket #${ticketId.slice(0, 8)}` : "Centre d'aide"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => setExpanded(!expanded)} className="p-1 rounded-lg hover:bg-muted">
                {expanded ? <Minimize2 className="w-4 h-4 text-muted-foreground" /> : <Maximize2 className="w-4 h-4 text-muted-foreground" />}
              </button>
              <button onClick={() => { setOpen(false); setExpanded(false); }} className="p-1 rounded-lg hover:bg-muted">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
          </div>

          {/* Category selection */}
          {showCategories ? (
            <div className="flex-1 p-4 space-y-4 overflow-y-auto">
              <div className="text-center">
                <Headphones className="w-10 h-10 text-primary/30 mx-auto mb-2" />
                <p className="text-sm font-semibold">Comment pouvons-nous vous aider ?</p>
                <p className="text-[10px] text-muted-foreground">Sélectionnez une catégorie</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {SUPPORT_CATEGORIES.map((cat) => {
                  const Icon = cat.icon;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => startNewTicket(cat.id)}
                      className="flex flex-col items-center gap-2 p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors text-center border border-border/50 hover:border-primary/30"
                    >
                      <Icon className={`w-6 h-6 ${cat.color}`} />
                      <span className="text-xs font-medium">{cat.label}</span>
                    </button>
                  );
                })}
              </div>
              {ticketId && (
                <Button variant="outline" size="sm" className="w-full text-xs" onClick={() => setShowCategories(false)}>
                  Reprendre la conversation en cours
                </Button>
              )}
            </div>
          ) : (
            <>
              {/* Messages area */}
              <ScrollArea className={`flex-1 p-3 ${expanded ? "min-h-[300px]" : "min-h-[200px] max-h-[50vh]"}`}>
                {messages.length === 0 && (
                  <div className="text-center py-8">
                    <Bot className="w-10 h-10 text-primary/30 mx-auto mb-2" />
                    <p className="text-xs text-muted-foreground">Décrivez votre problème ou besoin</p>
                  </div>
                )}
                {messages.map((msg, i) => (
                  <div key={msg.id || i}>
                    <div className={`flex mb-2 ${msg.sender_role === "user" ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[80%] rounded-xl px-3 py-2 text-xs ${
                        msg.sender_role === "user"
                          ? "bg-primary text-primary-foreground"
                          : msg.sender_role === "bot"
                          ? "bg-muted text-foreground"
                          : "bg-accent/20 text-foreground border border-accent/30"
                      }`}>
                        {msg.sender_role === "admin" && (
                          <p className="text-[9px] font-bold text-primary mb-0.5">🎧 Agent Support</p>
                        )}
                        {msg.content}
                      </div>
                    </div>
                    {/* Suggestions */}
                    {msg._suggestions && (
                      <div className="flex flex-wrap gap-1 mb-2 ml-1">
                        {msg._suggestions.map((s: string, si: number) => (
                          <button
                            key={si}
                            onClick={() => handleSuggestion(s)}
                            className="text-[10px] px-2.5 py-1 rounded-full border border-primary/30 text-primary hover:bg-primary/10 transition-colors"
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
                <div ref={endRef} />
              </ScrollArea>

              {/* Input */}
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
            </>
          )}
        </div>
      )}
    </>
  );
}
