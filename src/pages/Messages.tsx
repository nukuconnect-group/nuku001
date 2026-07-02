import SEO from "@/components/SEO";
import { useState, useEffect, useRef } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import Header from "@/components/layout/Header";
import MobileBottomNav from "@/components/layout/MobileBottomNav";
import { Loader2, MessageCircle, Bot, Sparkles, LogIn } from "lucide-react";
import { useConversations, type ConversationItem } from "@/hooks/useConversations";
import { useMessages } from "@/hooks/useMessages";
import { useProfile } from "@/contexts/ProfileContext";
import { useIsMobile } from "@/hooks/use-mobile";
import ConversationList from "@/components/messages/ConversationList";
import ChatArea from "@/components/messages/ChatArea";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import ReactMarkdown from "react-markdown";

const WELCOME_KEY = "nuku-welcome-shown";

const welcomeContent = `## 👋 Bienvenue sur NukuConnect !

Nous sommes ravis de vous accueillir sur la première plateforme agricole intelligente d'Afrique de l'Ouest.

### Voici ce que vous pouvez faire :

🛒 **Marketplace** — Achetez et vendez des produits agricoles directement entre fournisseurs et acheteurs.

🚚 **Livraison** — Choisissez un livreur NukuConnect pour recevoir vos commandes.

💬 **Messagerie** — Discutez avec les fournisseurs et livreurs en temps réel.

🤖 **NUKUCONNECT IA** — Posez vos questions agricoles à notre assistant IA intelligent.

📚 **Formations** — Accédez à des cours pour améliorer vos compétences agricoles.

📊 **Traçabilité** — Suivez vos produits de la production à la livraison.

---
*Si vous avez besoin d'aide, contactez le support depuis la section Aide. Bonne exploration ! 🌱*`;

const Messages = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const autoSelectedRef = useRef(false);
  const navigate = useNavigate();
  const { user, isReady } = useProfile();
  const [selectedConversation, setSelectedConversation] = useState<ConversationItem | null>(null);
  const [showWelcome, setShowWelcome] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const isMobile = useIsMobile();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  // On mobile, opening a conversation auto-fullscreens
  const effectiveFullscreen = isFullscreen || (isMobile && !!selectedConversation);
  const { conversations, loading, profileId, userId, refetch } = useConversations();
  const { messages, setMessages, sendMessage, deleteMessage } = useMessages(
    selectedConversation?.id || null,
    profileId,
    userId
  );

  // When opening a conversation, optimistically zero its unread counter and refetch
  useEffect(() => {
    if (!selectedConversation) return;
    if (selectedConversation.unread > 0) {
      setSelectedConversation({ ...selectedConversation, unread: 0 });
    }
    const t = setTimeout(() => refetch(), 600);
    return () => clearTimeout(t);
  }, [selectedConversation?.id]);

  // Show welcome message for new users
  useEffect(() => {
    if (loading) return;
    const alreadyShown = localStorage.getItem(WELCOME_KEY);
    if (!alreadyShown && profileId) {
      setShowWelcome(true);
      localStorage.setItem(WELCOME_KEY, "true");
    }
  }, [loading, profileId]);

  // Auto-select conversation from URL params (incl. contact + prefill from Réseaux)
  // ⚠️ Ne s'exécute qu'une seule fois pour éviter d'écraser la sélection manuelle
  // de l'utilisateur lors du rafraîchissement de la liste des conversations.
  useEffect(() => {
    if (!conversations.length || autoSelectedRef.current) return;
    const convId = searchParams.get("conversation");
    const productId = searchParams.get("product");
    const sellerName = searchParams.get("seller");
    const contactId = searchParams.get("contact");
    const prefill = searchParams.get("prefill");
    const deliveryId = searchParams.get("delivery");

    let match: ConversationItem | undefined;
    if (convId) {
      match = conversations.find(c => c.id === convId);
    } else if (deliveryId) {
      match = conversations.find(c => c.deliveryId === deliveryId);
    } else if (contactId) {
      match = conversations.find(c => c.participant.id === contactId);
      if (prefill) {
        try { sessionStorage.setItem(`msg-prefill-${contactId}`, decodeURIComponent(prefill)); } catch {}
      }
    } else if (productId || sellerName) {
      match = conversations.find(
        (c) =>
          c.productId === productId ||
          c.participant.name.toLowerCase() === sellerName?.toLowerCase()
      );
    }

    if (match) {
      setSelectedConversation(match);
      autoSelectedRef.current = true;
      // Nettoie l'URL pour éviter toute ré-sélection involontaire
      const params = new URLSearchParams(searchParams);
      ["conversation", "product", "seller", "contact", "prefill", "delivery"].forEach(k => params.delete(k));
      setSearchParams(params, { replace: true });
    } else if (!convId && !productId && !sellerName && !contactId && !deliveryId) {
      autoSelectedRef.current = true;
    }
  }, [conversations, searchParams, setSearchParams]);


  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleLocalMessage = (msg: any) => {
    setMessages((prev) => [...prev, msg]);
  };

  // Redirect if not authenticated
  if (isReady && !user) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
      <SEO url="/messages" title="Messagerie" description="Communiquez directement avec les producteurs et acheteurs sur NUKUCONNECT." noIndex />
        <Header />
        <div className="flex-1 flex flex-col items-center justify-center gap-4 p-6">
          <MessageCircle className="w-12 h-12 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground text-center">Connectez-vous pour accéder à vos messages</p>
          <Link to="/auth?returnTo=/messages">
            <Button variant="hero" className="gap-2">
              <LogIn className="w-4 h-4" />Se connecter
            </Button>
          </Link>
        </div>
        <MobileBottomNav />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <main className="flex-1 flex overflow-hidden min-h-0">
          <div className="w-full lg:w-96 border-r border-border flex flex-col bg-card">
            <div className="p-3 sm:p-4 border-b border-border space-y-3">
              <div className="flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-primary" />
                <div className="h-5 w-24 bg-muted animate-pulse rounded" />
              </div>
              <div className="h-9 bg-muted animate-pulse rounded" />
              <div className="flex gap-1.5">
                {[1,2,3,4].map(i => (
                  <div key={i} className="h-6 w-16 bg-muted animate-pulse rounded-full" />
                ))}
              </div>
            </div>
            <div className="flex-1 overflow-hidden">
              {[1,2,3,4,5,6].map(i => (
                <div key={i} className="p-3 flex items-start gap-3 border-b border-border">
                  <div className="w-11 h-11 rounded-full bg-muted animate-pulse flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-32 bg-muted animate-pulse rounded" />
                    <div className="h-3 w-48 bg-muted animate-pulse rounded" />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="flex-1 hidden lg:flex items-center justify-center">
            <div className="text-center space-y-3">
              <MessageCircle className="w-12 h-12 text-muted-foreground/20 mx-auto" />
              <div className="h-3 w-40 bg-muted animate-pulse rounded mx-auto" />
            </div>
          </div>
        </main>
        <MobileBottomNav />
      </div>
    );
  }

  return (
    <div className={`bg-background flex flex-col ${effectiveFullscreen ? "fixed inset-0 z-50 h-[100dvh]" : "min-h-screen pb-14 lg:pb-0"}`}>
      {!effectiveFullscreen && <Header />}
      <main className="flex-1 flex overflow-hidden min-h-0">
        <div className={`w-full flex min-h-0 ${effectiveFullscreen ? "h-full" : "h-[calc(100vh-7.5rem)] lg:h-[calc(100vh-4rem)]"}`}>
          <ConversationList
            conversations={conversations}
            selectedId={selectedConversation?.id || null}
            onSelect={(conv) => { setShowWelcome(false); setSelectedConversation(conv); }}
            hidden={effectiveFullscreen || (!!selectedConversation || showWelcome)}
          />
          <div className={`flex-1 flex flex-col min-w-0 min-h-0 ${(selectedConversation || showWelcome) ? "flex" : "hidden lg:flex"}`}>
            {showWelcome && !selectedConversation ? (
              <div className="flex-1 flex flex-col min-h-0">
                <div className="border-b border-border p-3 flex items-center gap-3 bg-card flex-shrink-0">
                  <div className="w-9 h-9 rounded-full bg-gradient-hero flex items-center justify-center">
                    <Bot className="w-5 h-5 text-primary-foreground" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm flex items-center gap-1.5">
                      NukuConnect
                      <Sparkles className="w-3 h-3 text-accent" />
                    </h3>
                    <p className="text-[10px] text-muted-foreground">Message de bienvenue</p>
                  </div>
                  <button
                    className="ml-auto text-xs text-primary hover:underline"
                    onClick={() => setShowWelcome(false)}
                  >
                    Fermer
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto p-4 min-h-0">
                  <div className="flex gap-2 max-w-lg">
                    <div className="w-7 h-7 rounded-full bg-gradient-hero flex items-center justify-center flex-shrink-0">
                      <Bot className="w-3.5 h-3.5 text-primary-foreground" />
                    </div>
                    <Card className="p-4 bg-card">
                      <div className="prose prose-sm max-w-none text-xs sm:text-sm leading-relaxed">
                        <ReactMarkdown>{welcomeContent}</ReactMarkdown>
                      </div>
                      <span className="text-[8px] opacity-50 mt-2 block">
                        {new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </Card>
                  </div>
                </div>
              </div>
            ) : (
              <ChatArea
                conversation={selectedConversation}
                messages={messages}
                onBack={() => { if (isFullscreen) setIsFullscreen(false); setSelectedConversation(null); }}
                onSend={sendMessage}
                onLocalMessage={handleLocalMessage}
                messagesEndRef={messagesEndRef}
                isFullscreen={effectiveFullscreen}
                onToggleFullscreen={() => setIsFullscreen(f => !f)}
              />
            )}
          </div>
        </div>
      </main>
      {!effectiveFullscreen && <MobileBottomNav />}
    </div>
  );
};

export default Messages;
