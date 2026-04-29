import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ShieldCheck, Sprout, Truck, ArrowRight, BadgeCheck } from "lucide-react";

/**
 * Hero "Achat direct producteur" — visible uniquement sur tablette & ordinateur.
 * Met en avant la promesse : acheter directement chez les fournisseurs vérifiés,
 * sans intermédiaire, depuis le lieu de production.
 */
const DirectFromFarmHero = () => {
  return (
    <section className="hidden md:block py-8 lg:py-12 bg-gradient-to-br from-primary/5 via-background to-accent/5 border-y border-border/40">
      <div className="container mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
          {/* Text */}
          <div className="space-y-5">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20">
              <BadgeCheck className="w-4 h-4 text-primary" />
              <span className="text-xs font-semibold text-primary uppercase tracking-wider">
                Fournisseurs vérifiés
              </span>
            </div>

            <h2 className="font-heading text-3xl lg:text-4xl xl:text-5xl font-bold text-foreground leading-tight">
              Achetez directement chez{" "}
              <span className="text-gradient-primary">les producteurs</span>,
              sans intermédiaire
            </h2>

            <p className="text-base lg:text-lg text-muted-foreground leading-relaxed max-w-xl">
              Connectez-vous aux fournisseurs vérifiés et recevez vos produits
              agricoles directement depuis le lieu de production. Plus de
              fraîcheur, des prix justes, une traçabilité totale.
            </p>

            <div className="grid grid-cols-3 gap-3 pt-2">
              <div className="flex flex-col items-start gap-1.5 p-3 rounded-xl bg-card border border-border/50">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5 text-primary" />
                </div>
                <p className="text-xs font-semibold text-foreground">100% vérifiés</p>
                <p className="text-[10px] text-muted-foreground leading-tight">
                  Identité & exploitation contrôlées
                </p>
              </div>
              <div className="flex flex-col items-start gap-1.5 p-3 rounded-xl bg-card border border-border/50">
                <div className="w-9 h-9 rounded-lg bg-accent/15 flex items-center justify-center">
                  <Sprout className="w-5 h-5 text-accent" />
                </div>
                <p className="text-xs font-semibold text-foreground">Origine garantie</p>
                <p className="text-[10px] text-muted-foreground leading-tight">
                  Du champ à votre porte
                </p>
              </div>
              <div className="flex flex-col items-start gap-1.5 p-3 rounded-xl bg-card border border-border/50">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Truck className="w-5 h-5 text-primary" />
                </div>
                <p className="text-xs font-semibold text-foreground">Livraison Nuku</p>
                <p className="text-[10px] text-muted-foreground leading-tight">
                  Flotte interne suivie en direct
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 pt-2">
              <Link to="/marketplace">
                <Button variant="hero" size="lg" className="gap-2">
                  Acheter direct producteur
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
              <Link to="/producteurs">
                <Button variant="outline" size="lg">
                  Voir les fournisseurs
                </Button>
              </Link>
            </div>
          </div>

          {/* Visual */}
          <div className="relative h-[360px] lg:h-[440px] rounded-2xl overflow-hidden shadow-elevated">
            <img
              src="https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=1200&q=80"
              alt="Producteur agricole vérifié sur son champ"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-foreground/70 via-foreground/10 to-transparent" />

            {/* Floating verified card */}
            <div className="absolute top-4 left-4 flex items-center gap-2 px-3 py-2 rounded-xl bg-card/95 backdrop-blur-sm border border-border/50 shadow-soft">
              <div className="w-8 h-8 rounded-full bg-emerald-500/15 flex items-center justify-center">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
              </div>
              <div>
                <p className="text-[11px] font-bold text-foreground leading-tight">Fournisseur vérifié</p>
                <p className="text-[9px] text-muted-foreground">Nukuconnect Pro</p>
              </div>
            </div>

            {/* Bottom info */}
            <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between gap-3">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-white/80 font-semibold">Direct producteur</p>
                <p className="font-heading text-xl lg:text-2xl font-bold text-white leading-tight">
                  Du champ<br />à votre table
                </p>
              </div>
              <div className="px-3 py-1.5 rounded-full bg-primary text-primary-foreground text-xs font-bold shadow-lg">
                0 intermédiaire
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default DirectFromFarmHero;
