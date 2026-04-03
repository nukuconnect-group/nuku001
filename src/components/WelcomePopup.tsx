import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Leaf, ArrowRight, Users, Store, Sparkles } from "lucide-react";

const WelcomePopup = () => {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const hasSeenWelcome = localStorage.getItem("nukuconnect_welcome_seen");
    if (!hasSeenWelcome) {
      const timer = setTimeout(() => setIsOpen(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleClose = () => {
    localStorage.setItem("nukuconnect_welcome_seen", "true");
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-lg p-0 overflow-hidden">
        {/* Hero Image */}
        <div className="relative h-48 bg-gradient-hero overflow-hidden">
          <img
            src="https://images.unsplash.com/photo-1605000797499-95a51c5269ae?w=800&q=80"
            alt="Agriculteurs connectés"
            className="w-full h-full object-cover opacity-60"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-card via-transparent to-transparent" />
          <div className="absolute bottom-4 left-4 right-4">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-card/90 backdrop-blur-sm flex items-center justify-center shadow-elevated">
                <Leaf className="w-8 h-8 text-primary" />
              </div>
              <div>
                <h2 className="font-heading text-xl font-bold text-primary-foreground">
                  NUKUCONNECT
                </h2>
                <p className="text-sm text-primary-foreground/80">La marketplace agricole #1</p>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6">
          <DialogHeader className="text-left mb-6">
            <DialogTitle className="font-heading text-2xl">
              Bienvenue sur NUKUCONNECT ! 👋
            </DialogTitle>
            <DialogDescription className="text-base">
              La plateforme qui connecte producteurs agricoles et acheteurs à travers l'Afrique.
            </DialogDescription>
          </DialogHeader>

          {/* Features */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="text-center p-3 rounded-xl bg-muted/50">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-2">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <p className="text-xs font-medium">10K+ Producteurs</p>
            </div>
            <div className="text-center p-3 rounded-xl bg-muted/50">
              <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center mx-auto mb-2">
                <Store className="w-5 h-5 text-accent-foreground" />
              </div>
              <p className="text-xs font-medium">5K+ Acheteurs</p>
            </div>
            <div className="text-center p-3 rounded-xl bg-muted/50">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-2">
                <Sparkles className="w-5 h-5 text-primary" />
              </div>
              <p className="text-xs font-medium">NUKUCONNECT IA</p>
            </div>
          </div>

          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={handleClose}>
              Plus tard
            </Button>
            <Button variant="hero" className="flex-1 gap-2" onClick={handleClose}>
              Découvrir
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default WelcomePopup;
