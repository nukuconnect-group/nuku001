import { useState, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, ShoppingBag, Truck, ShieldCheck, ArrowRight } from "lucide-react";
import promoBanner from "@/assets/marketplace-promo-banner.jpg";

const STORAGE_KEY = "nukuconnect_marketplace_promo_seen";

const MarketplacePromoPopup = () => {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const seen = sessionStorage.getItem(STORAGE_KEY);
    if (!seen) {
      const timer = setTimeout(() => setIsOpen(true), 800);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleClose = () => {
    sessionStorage.setItem(STORAGE_KEY, "true");
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) handleClose(); }}>
      <DialogContent className="sm:max-w-[420px] p-0 overflow-hidden rounded-none sm:rounded-none border-0 shadow-2xl gap-0">
        <button
          onClick={handleClose}
          className="absolute right-3 top-3 z-20 w-8 h-8 border border-border bg-background/90 flex items-center justify-center text-foreground hover:bg-background transition-colors"
          aria-label="Fermer"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="relative h-44 sm:h-52 overflow-hidden">
          <img
            src={promoBanner}
            alt="Marketplace NukuConnect"
            className="w-full h-full object-cover"
            width={800}
            height={512}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-foreground/75 via-foreground/25 to-transparent" />
          <div className="absolute bottom-3 left-4 right-4">
            <Badge className="bg-primary text-primary-foreground text-[10px] mb-1.5">
              Marketplace NukuConnect
            </Badge>
            <h2 className="font-heading text-lg sm:text-xl font-bold text-primary-foreground leading-tight">
              Achetez et vendez plus vite,
              <br />
              avec une logistique simple.
            </h2>
          </div>
        </div>

        <div className="p-4 sm:p-5 space-y-4">
          <p className="text-xs sm:text-sm text-muted-foreground">
            Trouvez des produits fiables, suivez vos commandes et échangez directement avec les bons interlocuteurs.
          </p>

          <div className="grid grid-cols-3 gap-2">
            {[
              { icon: ShoppingBag, label: "Achat rapide", tone: "bg-primary/10 text-primary" },
              { icon: Truck, label: "Livraison suivie", tone: "bg-accent/10 text-accent" },
              { icon: ShieldCheck, label: "Offres vérifiées", tone: "bg-secondary text-foreground" },
            ].map((feature) => (
              <div key={feature.label} className="flex flex-col items-center gap-1.5 p-2.5 border border-border bg-muted/40 text-center">
                <div className={`w-8 h-8 flex items-center justify-center ${feature.tone}`}>
                  <feature.icon className="w-4 h-4" />
                </div>
                <span className="text-[9px] sm:text-[10px] font-medium leading-tight">{feature.label}</span>
              </div>
            ))}
          </div>

          <Button
            variant="hero"
            className="w-full gap-2 h-11 text-sm font-semibold rounded-none"
            onClick={handleClose}
          >
            Explorer la marketplace
            <ArrowRight className="w-4 h-4" />
          </Button>

          <p className="text-center text-[10px] text-muted-foreground">
            Plus de visibilité, plus de contacts, plus d'opportunités.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MarketplacePromoPopup;
