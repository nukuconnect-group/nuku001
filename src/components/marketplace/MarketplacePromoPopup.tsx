import { useState, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, ShoppingBag, Truck, ShieldCheck, Sparkles, ArrowRight } from "lucide-react";
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
      <DialogContent className="sm:max-w-[420px] p-0 overflow-hidden rounded-2xl border-0 shadow-2xl gap-0">
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute right-3 top-3 z-20 w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/60 transition-colors"
          aria-label="Fermer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Hero image */}
        <div className="relative h-44 sm:h-52 overflow-hidden">
          <img
            src={promoBanner}
            alt="Marketplace NUKUCONNECT"
            className="w-full h-full object-cover"
            width={800}
            height={512}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
          <div className="absolute bottom-3 left-4 right-4">
            <Badge className="bg-primary text-primary-foreground text-[10px] mb-1.5">
              <Sparkles className="w-3 h-3 mr-1" />
              Marketplace IA
            </Badge>
            <h2 className="font-heading text-lg sm:text-xl font-bold text-white leading-tight">
              Achetez directement
              <br />
              <span className="text-primary">aux producteurs.</span>
            </h2>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-5 space-y-4">
          <p className="text-xs sm:text-sm text-muted-foreground">
            Des produits frais, vérifiés et livrés depuis les champs africains jusqu'à votre porte.
          </p>

          {/* Features grid */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { icon: ShoppingBag, label: "Commande\nrapide", color: "text-primary bg-primary/10" },
              { icon: Truck, label: "Livraison\nsuivie", color: "text-green-600 bg-green-500/10" },
              { icon: ShieldCheck, label: "Produits\nvérifiés", color: "text-blue-600 bg-blue-500/10" },
            ].map((feat) => (
              <div key={feat.label} className="flex flex-col items-center gap-1.5 p-2.5 rounded-xl bg-muted/50 text-center">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${feat.color}`}>
                  <feat.icon className="w-4 h-4" />
                </div>
                <span className="text-[9px] sm:text-[10px] font-medium leading-tight whitespace-pre-line">{feat.label}</span>
              </div>
            ))}
          </div>

          {/* CTA */}
          <Button
            variant="hero"
            className="w-full gap-2 h-11 text-sm font-semibold"
            onClick={handleClose}
          >
            Explorer le marché
            <ArrowRight className="w-4 h-4" />
          </Button>

          <p className="text-center text-[10px] text-muted-foreground">
            🌍 +10 000 producteurs • 8 pays africains
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MarketplacePromoPopup;