import { Link } from "react-router-dom";
import { Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import aiAssistant from "@/assets/header-slide-ai-assistant.jpg";

const HelpAICard = () => {
  return (
    <section className="bg-background py-3 sm:py-4">
      <div className="mx-auto px-3 sm:px-4 max-w-6xl">
        <div className="relative overflow-hidden bg-card border border-border shadow-sm flex items-center gap-3 sm:gap-4 p-4 sm:p-5">
          <div className="flex-1 min-w-0">
            <h3 className="font-heading text-foreground font-bold text-base sm:text-lg leading-tight">
              Besoin d'aide ?
            </h3>
            <p className="text-muted-foreground text-xs sm:text-sm mt-1 leading-snug">
              Discutez avec notre Assistant IA pour trouver ce qu'il vous faut.
            </p>
            <Link to="/nuku-ai" className="inline-block mt-3">
              <Button variant="hero" size="sm" className="gap-1.5 rounded-md">
                <Play className="w-3.5 h-3.5 fill-current" />
                Discuter maintenant
              </Button>
            </Link>
          </div>
          <div className="flex-shrink-0 w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-muted/50 flex items-center justify-center overflow-hidden">
            <img
              src={aiAssistant}
              alt="Assistant IA NukuConnect"
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </div>
        </div>
      </div>
    </section>
  );
};

export default HelpAICard;
