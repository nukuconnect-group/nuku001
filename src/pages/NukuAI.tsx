import { useState, useRef, useEffect } from "react";
import Header from "@/components/layout/Header";
import MobileBottomNav from "@/components/layout/MobileBottomNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Bot, 
  Send, 
  Sparkles, 
  Leaf, 
  Bug, 
  CloudRain, 
  TrendingUp,
  Lightbulb,
  User,
  Loader2
} from "lucide-react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

const suggestedQuestions = [
  { icon: Leaf, text: "Comment améliorer le rendement du maïs?" },
  { icon: Bug, text: "Quelles sont les maladies courantes du manioc?" },
  { icon: CloudRain, text: "Quand planter pendant la saison des pluies?" },
  { icon: TrendingUp, text: "Prix du marché des céréales actuellement" },
];

const NukuAI = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "Bonjour ! 👋 Je suis **NUKU AI**, votre assistant agricole intelligent. Je peux vous aider avec:\n\n- 🌾 Conseils de culture et d'élevage\n- 🐛 Identification des maladies des plantes\n- 📊 Informations sur les prix du marché\n- 🌧️ Recommandations saisonnières\n\nComment puis-je vous aider aujourd'hui?",
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

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    // Simulate AI response (would connect to real AI in production)
    setTimeout(() => {
      const responses = [
        "C'est une excellente question ! Pour le maïs, je recommande d'utiliser des variétés adaptées à votre zone climatique et d'assurer un bon espacement entre les plants (75-80 cm entre les rangs).",
        "Les maladies les plus courantes sont la mosaïque du manioc et la pourriture des racines. Utilisez des boutures saines et pratiquez la rotation des cultures pour les prévenir.",
        "La période idéale de semis dépend de votre région. En général, plantez 2-3 semaines après les premières pluies régulières pour éviter les stress hydriques.",
        "Les prix actuels varient selon les marchés. Le maïs se négocie entre 150-180 FCFA/kg, le riz local autour de 400 FCFA/kg. Consultez régulièrement les marchés locaux.",
      ];

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: responses[Math.floor(Math.random() * responses.length)],
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, aiMessage]);
      setIsLoading(false);
    }, 1500);
  };

  const handleSuggestionClick = (text: string) => {
    setInput(text);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col pb-20 lg:pb-0">
      <Header />

      <main className="flex-1 pt-20 lg:pt-24 flex flex-col">
        {/* Header */}
        <div className="border-b border-border bg-card/50">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-hero flex items-center justify-center">
                <Bot className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="font-heading font-bold text-foreground flex items-center gap-2">
                  NUKU AI
                  <Badge variant="secondary" className="text-xs">
                    <Sparkles className="w-3 h-3 mr-1" />
                    Beta
                  </Badge>
                </h1>
                <p className="text-sm text-muted-foreground">Assistant agricole intelligent 24/7</p>
              </div>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto">
          <div className="container mx-auto px-4 py-6 space-y-6">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 ${message.role === "user" ? "flex-row-reverse" : ""}`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    message.role === "assistant"
                      ? "bg-gradient-hero"
                      : "bg-secondary"
                  }`}
                >
                  {message.role === "assistant" ? (
                    <Bot className="w-4 h-4 text-primary-foreground" />
                  ) : (
                    <User className="w-4 h-4 text-secondary-foreground" />
                  )}
                </div>
                <Card
                  className={`max-w-[80%] p-4 ${
                    message.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-card"
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">
                    {message.content}
                  </p>
                  <span className="text-[10px] opacity-70 mt-2 block">
                    {message.timestamp.toLocaleTimeString("fr-FR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </Card>
              </div>
            ))}

            {isLoading && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-hero flex items-center justify-center">
                  <Bot className="w-4 h-4 text-primary-foreground" />
                </div>
                <Card className="p-4">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm">NUKU AI réfléchit...</span>
                  </div>
                </Card>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Suggestions */}
        {messages.length === 1 && (
          <div className="border-t border-border bg-card/50">
            <div className="container mx-auto px-4 py-4">
              <div className="flex items-center gap-2 mb-3">
                <Lightbulb className="w-4 h-4 text-accent" />
                <span className="text-sm font-medium text-foreground">Questions suggérées</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {suggestedQuestions.map((q, i) => (
                  <Button
                    key={i}
                    variant="outline"
                    size="sm"
                    className="gap-2 text-xs"
                    onClick={() => handleSuggestionClick(q.text)}
                  >
                    <q.icon className="w-3 h-3 text-primary" />
                    {q.text}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Input */}
        <div className="border-t border-border bg-card">
          <div className="container mx-auto px-4 py-4">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="flex gap-3"
            >
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Posez votre question agricole..."
                className="flex-1"
                disabled={isLoading}
              />
              <Button
                type="submit"
                variant="hero"
                size="icon"
                disabled={!input.trim() || isLoading}
              >
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
