import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Bot, Send, Sparkles, MessageCircle, Zap, Globe, Leaf } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
// Logo removed from this section per user request

const NukuAISection = () => {
  const [messages] = useState([
    { role: "assistant", content: "Bonjour ! Je suis NUKU AI, votre assistant agricole. Comment puis-je vous aider aujourd'hui ?" },
    { role: "user", content: "Comment améliorer le rendement de mes tomates ?" },
    { role: "assistant", content: "Pour améliorer vos tomates :\n\n🌱 Sol riche en compost\n💧 Arrosage régulier le matin\n☀️ 6-8h de soleil direct\n\nVoulez-vous plus de détails ?" },
  ]);

  const features = [
    { icon: MessageCircle, text: "Conseils personnalisés 24/7" },
    { icon: Leaf, text: "Diagnostic des maladies" },
    { icon: Zap, text: "Réponses instantanées" },
    { icon: Globe, text: "Français & langues locales" },
  ];

  return (
    <section className="py-12 sm:py-16 lg:py-24 bg-gradient-to-br from-primary via-secondary to-primary text-primary-foreground overflow-hidden relative">
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-10 left-10 w-32 h-32 rounded-full bg-primary-foreground blur-3xl" />
        <div className="absolute bottom-10 right-10 w-48 h-48 rounded-full bg-secondary blur-3xl" />
      </div>
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
          <div className="order-2 lg:order-1">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-foreground/20 backdrop-blur-sm mb-4 sm:mb-6">
              <Sparkles className="w-4 h-4 text-primary-foreground" />
              <span className="text-xs sm:text-sm font-medium">Par Nukuconnect Technologie</span>
            </div>
            
            <h2 className="font-heading text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-bold mb-4 sm:mb-6">
              Rencontrez <span className="text-secondary-foreground font-extrabold">Nukuconnect IA</span>
            </h2>
            
            <p className="text-sm sm:text-base lg:text-lg text-primary-foreground/90 mb-6 sm:mb-8 leading-relaxed">
              Votre assistant agricole intelligent disponible 24/7. Posez vos questions 
              sur les cultures, l'élevage, les maladies des plantes et recevez des 
              conseils personnalisés instantanément.
            </p>

            <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-6 sm:mb-8">
              {features.map((feature) => (
                <div key={feature.text} className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-xl bg-primary-foreground/10 backdrop-blur-sm">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-primary-foreground/20 flex items-center justify-center flex-shrink-0">
                    <feature.icon className="w-4 h-4 sm:w-5 sm:h-5 text-primary-foreground" />
                  </div>
                  <span className="text-xs sm:text-sm font-medium">{feature.text}</span>
                </div>
              ))}
            </div>

            <Link to="/nuku-ai">
              <Button size="lg" className="bg-secondary hover:bg-secondary/90 text-secondary-foreground font-semibold gap-2 text-sm sm:text-base">
                Essayer NUKU AI <Bot className="w-4 h-4 sm:w-5 sm:h-5" />
              </Button>
            </Link>
          </div>

          {/* Chat Preview */}
          <div className="relative order-1 lg:order-2">
            <div className="absolute -inset-4 bg-gradient-to-r from-secondary/30 to-primary-foreground/20 rounded-3xl blur-2xl" />
            <Card className="relative bg-card border-border/50 overflow-hidden shadow-elevated max-w-sm mx-auto lg:max-w-none">
              <div className="flex items-center gap-3 p-3 sm:p-4 border-b border-border bg-gradient-to-r from-primary to-primary/80">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-primary-foreground flex items-center justify-center">
                  <Bot className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-primary-foreground text-sm sm:text-base">Nukuconnect IA</p>
                  <div className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
                    <p className="text-xs text-primary-foreground/80">En ligne</p>
                  </div>
                </div>
              </div>
              <CardContent className="p-3 sm:p-4 space-y-3 sm:space-y-4 max-h-[280px] sm:max-h-[320px] overflow-y-auto bg-muted/30">
                {messages.map((message, index) => (
                  <div key={index} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[85%] rounded-2xl px-3 sm:px-4 py-2 sm:py-3 ${message.role === "user" ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-card text-foreground rounded-bl-sm shadow-sm"}`}>
                      <p className="text-xs sm:text-sm whitespace-pre-line">{message.content}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
              <div className="p-3 sm:p-4 border-t border-border bg-card">
                <div className="flex items-center gap-2 bg-muted rounded-xl px-3 sm:px-4 py-2 sm:py-3">
                  <input type="text" placeholder="Posez votre question..." className="flex-1 bg-transparent text-xs sm:text-sm text-foreground placeholder:text-muted-foreground focus:outline-none" disabled />
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
