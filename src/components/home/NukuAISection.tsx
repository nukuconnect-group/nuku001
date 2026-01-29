import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Bot, Send, Sparkles } from "lucide-react";
import { useState } from "react";

const NukuAISection = () => {
  const [messages] = useState([
    { role: "assistant", content: "Bonjour ! Je suis NUKU AI, votre assistant agricole. Comment puis-je vous aider aujourd'hui ?" },
    { role: "user", content: "Comment puis-je améliorer le rendement de ma culture de tomates ?" },
    { role: "assistant", content: "Pour améliorer le rendement de vos tomates, voici mes recommandations :\n\n🌱 **Sol et Fertilisation**\n• Utilisez un sol riche en matière organique\n• Apportez du compost avant la plantation\n\n💧 **Arrosage**\n• Arrosez régulièrement le matin\n• Évitez de mouiller les feuilles\n\n☀️ **Exposition**\n• 6-8 heures de soleil direct\n• Protégez des vents forts\n\nVoulez-vous plus de détails sur un point précis ?" },
  ]);

  return (
    <section className="py-20 lg:py-32 bg-foreground text-primary-foreground overflow-hidden">
      <div className="container mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Content */}
          <div>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/20 text-primary mb-6">
              <Sparkles className="w-4 h-4" />
              <span className="text-sm font-medium">Intelligence Artificielle</span>
            </div>
            
            <h2 className="font-heading text-3xl md:text-4xl lg:text-5xl font-bold mb-6">
              Rencontrez{" "}
              <span className="text-primary">NUKU AI</span>
            </h2>
            
            <p className="text-lg text-primary-foreground/80 mb-8 leading-relaxed">
              Votre assistant agricole intelligent disponible 24/7. Posez vos questions 
              sur les cultures, l'élevage, les maladies des plantes, et recevez des 
              conseils personnalisés instantanément.
            </p>

            <ul className="space-y-4 mb-8">
              {[
                "Conseils personnalisés pour vos cultures",
                "Diagnostic des maladies des plantes",
                "Aide à la mise en ligne de vos produits",
                "Recommandations saisonnières",
                "Disponible en français et langues locales",
              ].map((item) => (
                <li key={item} className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                    <span className="text-primary-foreground text-xs">✓</span>
                  </div>
                  <span className="text-primary-foreground/90">{item}</span>
                </li>
              ))}
            </ul>

            <Button variant="hero" size="lg">
              Essayer NUKU AI
              <Bot className="w-5 h-5" />
            </Button>
          </div>

          {/* Chat Preview */}
          <div className="relative">
            <div className="absolute -inset-4 bg-gradient-to-r from-primary/20 to-accent/20 rounded-3xl blur-2xl" />
            <Card className="relative bg-card border-border/50 overflow-hidden">
              {/* Chat Header */}
              <div className="flex items-center gap-3 p-4 border-b border-border bg-muted/50">
                <div className="w-10 h-10 rounded-xl bg-gradient-hero flex items-center justify-center">
                  <Bot className="w-5 h-5 text-primary-foreground" />
                </div>
                <div>
                  <p className="font-semibold text-foreground text-sm">NUKU AI</p>
                  <p className="text-xs text-primary">En ligne</p>
                </div>
              </div>

              {/* Messages */}
              <CardContent className="p-4 space-y-4 max-h-[400px] overflow-y-auto">
                {messages.map((message, index) => (
                  <div
                    key={index}
                    className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                        message.role === "user"
                          ? "bg-primary text-primary-foreground rounded-br-sm"
                          : "bg-muted text-foreground rounded-bl-sm"
                      }`}
                    >
                      <p className="text-sm whitespace-pre-line">{message.content}</p>
                    </div>
                  </div>
                ))}
              </CardContent>

              {/* Input */}
              <div className="p-4 border-t border-border">
                <div className="flex items-center gap-2 bg-muted rounded-xl px-4 py-3">
                  <input
                    type="text"
                    placeholder="Posez votre question..."
                    className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                    disabled
                  />
                  <button className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center hover:bg-primary/90 transition-colors">
                    <Send className="w-4 h-4 text-primary-foreground" />
                  </button>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
};

export default NukuAISection;
