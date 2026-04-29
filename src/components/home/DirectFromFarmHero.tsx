import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ShieldCheck, Sprout, Truck, ArrowRight, BadgeCheck } from "lucide-react";

/**
 * Hero "Achat direct producteur" — visible uniquement sur tablette & ordinateur.
 * Image plein arrière-plan (producteurs à l'échelle industrielle) + texte aligné à gauche.
 */
const DirectFromFarmHero = () => {
  return (
    <section className="hidden md:block relative overflow-hidden border-y border-border/40">
      {/* Background image — producteurs à l'échelle industrielle */}
      <div className="absolute inset-0">
        <img
          src="https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=1920&q=80"
          alt="Producteurs agricoles vérifiés à l'échelle industrielle"
          className="w-full h-full object-cover"
          loading="lazy"
        />
        {/* Overlay : sombre à gauche, transparent à droite — pour lisibilité du texte */}
        <div className="absolute inset-0 bg-gradient-to-r from-foreground/90 via-foreground/70 to-foreground/30" />
        <div className="absolute inset-0 bg-gradient-to-t from-foreground/60 via-transparent to-transparent" />
      </div>

      {/* Content */}
      <div className="relative container mx-auto px-4 py-16 lg:py-24 xl:py-28">
        <div className="max-w-2xl space-y-6 text-white">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/15 backdrop-blur-sm border border-white/25">
            <BadgeCheck className="w-4 h-4 text-accent" />
            <span className="text-xs font-semibold uppercase tracking-wider">
              Fournisseurs vérifiés
            </span>
          </div>

          <h2 className="font-heading text-3xl lg:text-5xl xl:text-6xl font-bold leading-[1.1]">
            Achetez directement chez{" "}
            <span className="text-accent">les producteurs</span>,
            <br className="hidden lg:block" />
            sans intermédiaire
          </h2>

          <p className="text-base lg:text-lg text-white/90 leading-relaxed max-w-xl">
            Connectez-vous aux fournisseurs vérifiés et recevez vos produits agricoles
            directement depuis le lieu de production. Plus de fraîcheur, des prix justes,
            une traçabilité totale.
          </p>

          {/* Feature pills */}
          <div className="grid grid-cols-3 gap-3 max-w-xl pt-2">
            <div className="flex flex-col items-start gap-1.5 p-3 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20">
              <div className="w-9 h-9 rounded-lg bg-primary/30 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5 text-white" />
              </div>
              <p className="text-xs font-semibold">100% vérifiés</p>
              <p className="text-[10px] text-white/75 leading-tight">
                Identité & exploitation contrôlées
              </p>
            </div>
            <div className="flex flex-col items-start gap-1.5 p-3 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20">
              <div className="w-9 h-9 rounded-lg bg-accent/30 flex items-center justify-center">
                <Sprout className="w-5 h-5 text-white" />
              </div>
              <p className="text-xs font-semibold">Origine garantie</p>
              <p className="text-[10px] text-white/75 leading-tight">
                Du champ à votre porte
              </p>
            </div>
            <div className="flex flex-col items-start gap-1.5 p-3 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20">
              <div className="w-9 h-9 rounded-lg bg-primary/30 flex items-center justify-center">
                <Truck className="w-5 h-5 text-white" />
              </div>
              <p className="text-xs font-semibold">Livraison Nuku</p>
              <p className="text-[10px] text-white/75 leading-tight">
                Flotte interne suivie en direct
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 pt-3">
            <Link to="/marketplace">
              <Button variant="hero" size="lg" className="gap-2">
                Acheter direct producteur
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <Link to="/producteurs">
              <Button
                size="lg"
                variant="outline"
                className="bg-white/10 backdrop-blur-sm border-white/40 text-white hover:bg-white/20 hover:text-white"
              >
                Voir les fournisseurs
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

export default DirectFromFarmHero;
