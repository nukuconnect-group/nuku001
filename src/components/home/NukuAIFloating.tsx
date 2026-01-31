import { useState } from "react";
import { Link } from "react-router-dom";
import { Bot, X, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

const NukuAIFloating = () => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="fixed bottom-20 right-4 lg:bottom-6 lg:right-6 z-40">
      {isExpanded && (
        <div className="absolute bottom-16 right-0 w-72 bg-card rounded-2xl shadow-elevated border border-border p-4 animate-scale-in">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-gradient-hero flex items-center justify-center">
                <Bot className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h4 className="font-heading font-semibold text-foreground">NUKU AI</h4>
                <p className="text-xs text-muted-foreground">Assistant Agricole</p>
              </div>
            </div>
            <button
              onClick={() => setIsExpanded(false)}
              className="p-1 hover:bg-muted rounded-lg transition-colors"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Posez vos questions sur l'agriculture, les cultures, l'élevage ou les maladies des plantes.
          </p>
          <Link to="/nuku-ai">
            <Button variant="hero" className="w-full gap-2">
              <Sparkles className="w-4 h-4" />
              Démarrer une conversation
            </Button>
          </Link>
        </div>
      )}

      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-14 h-14 rounded-full bg-gradient-hero shadow-elevated flex items-center justify-center hover:scale-110 transition-transform group"
      >
        {isExpanded ? (
          <X className="w-6 h-6 text-primary-foreground" />
        ) : (
          <Bot className="w-6 h-6 text-primary-foreground group-hover:animate-pulse-soft" />
        )}
      </button>
    </div>
  );
};

export default NukuAIFloating;
