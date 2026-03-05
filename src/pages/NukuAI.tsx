import { useState, useRef, useEffect } from "react";
import Header from "@/components/layout/Header";
import MobileBottomNav from "@/components/layout/MobileBottomNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useLanguage } from "@/contexts/LanguageContext";
import { 
  Bot, Send, Sparkles, Leaf, Bug, CloudRain, TrendingUp,
  Lightbulb, User, Loader2, Wheat, Fish, Droplets, Factory,
  Heart, BookOpen, Sprout, Tractor
} from "lucide-react";
import ReactMarkdown from "react-markdown";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

const NukuAI = () => {
  const { t } = useLanguage();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const aiCategories = [
    { id: "crops", icon: Wheat, label: t("ai.cropAdvice"), color: "text-green-600", bg: "bg-green-50 dark:bg-green-950/30",
      questions: [
        "Comment améliorer le rendement du maïs?",
        "Quels sont les meilleurs engrais pour le riz?",
        "Calendrier de culture du soja au Togo",
        "Techniques de rotation des cultures",
      ]},
    { id: "diseases", icon: Bug, label: t("ai.diseaseId"), color: "text-red-600", bg: "bg-red-50 dark:bg-red-950/30",
      questions: [
        "Quelles sont les maladies courantes du manioc?",
        "Comment traiter la rouille du maïs?",
        "Identifier les parasites du cacao",
        "Prévention des maladies du tomate",
      ]},
    { id: "market", icon: TrendingUp, label: t("ai.marketPrices"), color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-950/30",
      questions: [
        "Prix du marché des céréales actuellement",
        "Tendances des prix du cacao en 2025",
        "Meilleurs marchés pour vendre mes produits",
        "Comment fixer le prix de mes récoltes?",
      ]},
    { id: "seasonal", icon: CloudRain, label: t("ai.seasonal"), color: "text-cyan-600", bg: "bg-cyan-50 dark:bg-cyan-950/30",
      questions: [
        "Quand planter pendant la saison des pluies?",
        "Cultures adaptées à la saison sèche",
        "Comment protéger les cultures de l'harmattan?",
        "Calendrier agricole au Togo",
      ]},
    { id: "livestock", icon: Heart, label: t("ai.livestock"), color: "text-pink-600", bg: "bg-pink-50 dark:bg-pink-950/30",
      questions: [
        "Comment bien nourrir les poulets fermiers?",
        "Vaccination du bétail - calendrier",
        "Élevage de porcs en milieu tropical",
        "Soins vétérinaires de base",
      ]},
    { id: "organic", icon: Leaf, label: t("ai.organic"), color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-950/30",
      questions: [
        "Comment obtenir la certification bio?",
        "Pesticides naturels efficaces",
        "Compostage et fumure organique",
        "Agriculture biologique rentable",
      ]},
    { id: "business", icon: Factory, label: t("ai.business"), color: "text-purple-600", bg: "bg-purple-50 dark:bg-purple-950/30",
      questions: [
        "Comment créer une coopérative agricole?",
        "Financement et subventions agricoles",
        "Plan d'affaires pour l'agribusiness",
        "Exportation de produits agricoles",
      ]},
    { id: "irrigation", icon: Droplets, label: t("ai.irrigation"), color: "text-sky-600", bg: "bg-sky-50 dark:bg-sky-950/30",
      questions: [
        "Systèmes d'irrigation goutte à goutte",
        "Gestion de l'eau en agriculture",
        "Forage de puits agricoles",
        "Irrigation solaire - avantages",
      ]},
  ];

  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "Bonjour ! 👋 Je suis **NUKU AI**, votre assistant agricole intelligent. Choisissez une catégorie ci-dessous ou posez directement votre question !",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const streamChat = async (userMessages: { role: string; content: string }[]) => {
    const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/nuku-ai-chat`;
    const resp = await fetch(CHAT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({ messages: userMessages }),
    });
    if (!resp.ok || !resp.body) {
      const error = await resp.json().catch(() => ({ error: "Erreur inconnue" }));
      throw new Error(error.error || "Erreur de connexion au service IA");
    }
    return resp.body;
  };

  const handleSend = async (text?: string) => {
    const messageText = text || input.trim();
    if (!messageText || isLoading) return;
    const userMessage: Message = { id: Date.now().toString(), role: "user", content: messageText, timestamp: new Date() };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput("");
    setSelectedCategory(null);
    setIsLoading(true);

    try {
      const chatMessages = newMessages.filter(m => m.id !== "welcome").map(m => ({ role: m.role, content: m.content }));
      const body = await streamChat(chatMessages);
      const reader = body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";
      let assistantContent = "";
      const assistantId = (Date.now() + 1).toString();
      setMessages(prev => [...prev, { id: assistantId, role: "assistant", content: "", timestamp: new Date() }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });
        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              assistantContent += content;
              setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content: assistantContent } : m));
            }
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }
    } catch (error: any) {
      console.error("NUKU AI error:", error);
      setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: "assistant", content: `Désolé, une erreur s'est produite: ${error.message}. Veuillez réessayer.`, timestamp: new Date() }]);
    } finally {
      setIsLoading(false);
    }
  };

  const activeCat = aiCategories.find(c => c.id === selectedCategory);

  return (
    <div className="min-h-screen bg-background flex flex-col pb-14 lg:pb-0">
      <Header />
      <main className="flex-1 flex flex-col max-h-[calc(100vh-120px)] lg:max-h-[calc(100vh-180px)]">
        {/* Header bar */}
        <div className="border-b border-border bg-card/50 flex-shrink-0">
          <div className="container mx-auto px-3 sm:px-4 py-2.5 sm:py-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gradient-hero flex items-center justify-center flex-shrink-0">
                <Bot className="w-4 h-4 sm:w-5 sm:h-5 text-primary-foreground" />
              </div>
              <div className="min-w-0">
                <h1 className="font-heading font-bold text-sm sm:text-base text-foreground flex items-center gap-2">
                  {t("ai.title")}
                  <Badge variant="secondary" className="text-[9px] sm:text-[10px]">
                    <Sparkles className="w-2.5 h-2.5 mr-0.5" />{t("ai.poweredBy")}
                  </Badge>
                </h1>
                <p className="text-[10px] sm:text-xs text-muted-foreground">{t("ai.subtitle")}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto">
          <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4 space-y-3 sm:space-y-4">
            {messages.map((message) => (
              <div key={message.id} className={`flex gap-2 ${message.role === "user" ? "flex-row-reverse" : ""}`}>
                <div className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center flex-shrink-0 ${message.role === "assistant" ? "bg-gradient-hero" : "bg-secondary"}`}>
                  {message.role === "assistant" ? <Bot className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-primary-foreground" /> : <User className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-secondary-foreground" />}
                </div>
                <Card className={`max-w-[88%] sm:max-w-[80%] p-2.5 sm:p-3 ${message.role === "user" ? "bg-primary text-primary-foreground" : "bg-card"}`}>
                  <div className={`text-xs sm:text-sm leading-relaxed prose prose-sm max-w-none ${message.role === "user" ? "prose-invert" : ""}`}>
                    <ReactMarkdown>{message.content}</ReactMarkdown>
                  </div>
                  <span className="text-[8px] sm:text-[9px] opacity-70 mt-1.5 block">
                    {message.timestamp.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </Card>
              </div>
            ))}
            {isLoading && messages[messages.length - 1]?.content === "" && (
              <div className="flex gap-2">
                <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-gradient-hero flex items-center justify-center">
                  <Bot className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-primary-foreground" />
                </div>
                <Card className="p-2.5 sm:p-3">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span className="text-xs">{t("ai.thinking")}</span>
                  </div>
                </Card>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Categories grid - shown when no conversation yet */}
        {messages.length <= 1 && (
          <div className="border-t border-border bg-card/50 flex-shrink-0">
            <div className="container mx-auto px-3 sm:px-4 py-3">
              <div className="flex items-center gap-2 mb-2">
                <Lightbulb className="w-3.5 h-3.5 text-accent" />
                <span className="text-xs font-medium text-foreground">{t("ai.categories")}</span>
              </div>
              <div className="grid grid-cols-4 sm:grid-cols-4 md:grid-cols-8 gap-1.5 sm:gap-2">
                {aiCategories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(selectedCategory === cat.id ? null : cat.id)}
                    className={`flex flex-col items-center gap-1 p-2 sm:p-2.5 rounded-xl transition-all text-center ${
                      selectedCategory === cat.id
                        ? `${cat.bg} ring-2 ring-primary/30`
                        : "hover:bg-muted"
                    }`}
                  >
                    <cat.icon className={`w-4 h-4 sm:w-5 sm:h-5 ${cat.color}`} />
                    <span className="text-[9px] sm:text-[10px] font-medium leading-tight line-clamp-2">{cat.label}</span>
                  </button>
                ))}
              </div>

              {/* Category questions */}
              {activeCat && (
                <div className="mt-2.5 space-y-1">
                  {activeCat.questions.map((q, i) => (
                    <button key={i} onClick={() => handleSend(q)}
                      className="w-full text-left p-2 rounded-lg hover:bg-muted text-xs text-foreground flex items-center gap-2 transition-colors">
                      <activeCat.icon className={`w-3 h-3 ${activeCat.color} flex-shrink-0`} />
                      <span>{q}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Input */}
        <div className="border-t border-border bg-card flex-shrink-0">
          <div className="container mx-auto px-3 sm:px-4 py-2.5 sm:py-3">
            <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="flex gap-2">
              <Input value={input} onChange={(e) => setInput(e.target.value)}
                placeholder={t("ai.placeholder")} className="flex-1 text-xs sm:text-sm h-9 sm:h-10" disabled={isLoading} />
              <Button type="submit" variant="hero" size="icon" disabled={!input.trim() || isLoading} className="h-9 w-9 sm:h-10 sm:w-10 flex-shrink-0">
                <Send className="w-4 h-4" />
              </Button>
            </form>
          </div>
        </div>
      </main>
      <MobileBottomNav />
    </div>
  );
};

export default NukuAI;
