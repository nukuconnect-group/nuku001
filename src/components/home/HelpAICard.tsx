import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Play, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import aiAssistant from "@/assets/header-slide-ai-assistant.jpg";

const HelpAICard = () => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const submit = (e?: React.FormEvent) => {
    e?.preventDefault();
    const q = query.trim();
    if (!q) return;
    setOpen(false);
    setQuery("");
    navigate(`/nuku-ai?q=${encodeURIComponent(q)}`);
  };

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
            <Button
              variant="hero"
              size="sm"
              className="gap-1.5 rounded-md mt-3"
              onClick={() => setOpen(true)}
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              Discuter maintenant
            </Button>
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

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Que recherchez-vous ?</DialogTitle>
            <DialogDescription>
              Décrivez votre question ou ce que vous recherchez. Notre IA NukuConnect vous répondra immédiatement.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={submit} className="flex flex-col gap-3 mt-2">
            <Input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ex: Quel engrais pour le maïs ?"
              className="h-11"
            />
            <Button type="submit" variant="hero" disabled={!query.trim()} className="gap-2">
              <Send className="w-4 h-4" />
              Envoyer à l'IA
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
};

export default HelpAICard;
