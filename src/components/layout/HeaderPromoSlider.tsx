import { useState, useEffect, useCallback } from "react";
import { Link, useLocation } from "react-router-dom";
import { ChevronLeft, ChevronRight, Leaf, Truck, GraduationCap, Network, Sparkles } from "lucide-react";
import heroOrganic from "@/assets/hero-organic-farm.jpg";
import heroFarmers from "@/assets/hero-farmers-connected.jpg";
import heroDrone from "@/assets/hero-drone-agriculture.png";
import heroAI from "@/assets/hero-ai-agriculture.jpg";
import heroNetwork from "@/assets/hero-network-agriculture.jpg";

const slides = [
  {
    eyebrow: "Marketplace agricole",
    title: "Du champ à votre panier",
    highlight: "100% frais & vérifié",
    subtitle: "Produits livrés directement des producteurs vérifiés",
    cta: "Explorer",
    href: "/marketplace",
    Icon: Leaf,
    image: heroOrganic,
  },
  {
    eyebrow: "Livraison Nukuconnect",
    title: "Flotte interne rapide",
    highlight: "Suivi GPS en temps réel",
    subtitle: "Paiement sécurisé, livraison partout au Togo",
    cta: "Commander",
    href: "/marketplace",
    Icon: Truck,
    image: heroFarmers,
  },
  {
    eyebrow: "Nukuconnect IA",
    title: "L'IA au service de l'agriculture",
    highlight: "Conseils & matching intelligent",
    subtitle: "Assistant pour producteurs, acheteurs et fournisseurs",
    cta: "Essayer",
    href: "/nuku-ai",
    Icon: Sparkles,
    image: heroAI,
  },
  {
    eyebrow: "Formations gratuites",
    title: "Apprenez les bonnes pratiques",
    highlight: "Agriculture & aquaculture",
    subtitle: "Modules certifiants, accessibles partout",
    cta: "Apprendre",
    href: "/formations",
    Icon: GraduationCap,
    image: heroDrone,
  },
  {
    eyebrow: "Réseau agricole",
    title: "Rejoignez la communauté",
    highlight: "Producteurs & fournisseurs vérifiés",
    subtitle: "Connectez-vous avec des milliers d'acteurs",
    cta: "Rejoindre",
    href: "/producteurs",
    Icon: Network,
    image: heroNetwork,
  },
];

const HeaderPromoSlider = () => {
  const [current, setCurrent] = useState(0);
  const location = useLocation();

  const next = useCallback(() => setCurrent(c => (c + 1) % slides.length), []);
  const prev = useCallback(() => setCurrent(c => (c - 1 + slides.length) % slides.length), []);

  useEffect(() => {
    const timer = setInterval(next, 5500);
    return () => clearInterval(timer);
  }, [next]);

  // Affiché uniquement sur la page d'accueil
  if (location.pathname !== "/") return null;

  return (
    <div className="bg-background pt-2 sm:pt-3 pb-3 sm:pb-4">
      <div className="mx-auto px-2 sm:px-4 max-w-6xl">
        <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl shadow-xl bg-primary ring-1 ring-primary/20">
          {/* Slides track */}
          <div
            className="flex transition-transform duration-700 ease-out"
            style={{ transform: `translateX(-${current * 100}%)` }}
          >
            {slides.map((slide, i) => {
              const { Icon } = slide;
              return (
                <div
                  key={i}
                  className="relative flex-shrink-0 w-full h-36 sm:h-48 md:h-56 lg:h-64"
                >
                  {/* Image on the right with curved clip */}
                  <div className="absolute inset-0">
                    <div
                      className="absolute right-0 top-0 bottom-0 w-[55%] sm:w-[58%] md:w-[55%]"
                      style={{
                        clipPath:
                          "polygon(18% 0, 100% 0, 100% 100%, 0 100%)",
                      }}
                    >
                      <img
                        src={slide.image}
                        alt={slide.title}
                        className="w-full h-full object-cover"
                        loading={i === 0 ? "eager" : "lazy"}
                      />
                      {/* Soft inner gradient for legibility on overlap */}
                      <div className="absolute inset-0 bg-gradient-to-r from-primary/60 via-transparent to-transparent" />
                    </div>
                  </div>

                  {/* Solid blue panel on the left with content */}
                  <div className="relative z-10 h-full flex items-center">
                    <div className="px-4 sm:px-6 md:px-8 w-[55%] sm:w-[52%] md:w-[50%]">
                      <p className="text-accent text-[9px] sm:text-[11px] md:text-xs font-bold uppercase tracking-[0.18em] leading-none">
                        {slide.eyebrow}
                      </p>
                      <h3 className="font-heading text-primary-foreground font-extrabold leading-[1.05] mt-1.5 sm:mt-2 text-[15px] sm:text-2xl md:text-3xl lg:text-[34px]">
                        {slide.title}
                      </h3>
                      <p className="text-accent font-bold text-[10px] sm:text-sm md:text-base mt-1 sm:mt-1.5">
                        {slide.highlight}
                      </p>
                      <p className="hidden sm:block text-primary-foreground/85 text-xs md:text-sm mt-1.5 md:mt-2 max-w-[28ch] leading-snug">
                        {slide.subtitle}
                      </p>
                      <Link
                        to={slide.href}
                        className="mt-2 sm:mt-3 md:mt-4 inline-flex items-center gap-1.5 bg-accent text-accent-foreground font-extrabold text-[10px] sm:text-xs md:text-sm uppercase tracking-wide px-3 sm:px-4 md:px-5 py-1.5 sm:py-2 md:py-2.5 rounded-full shadow-md hover:bg-accent/90 hover:shadow-lg transition-all"
                      >
                        <Icon className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4" />
                        {slide.cta}
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Arrows - hidden on small screens, visible from sm */}
          <button
            onClick={prev}
            aria-label="Précédent"
            className="hidden sm:flex absolute left-2 md:left-3 top-1/2 -translate-y-1/2 w-8 h-8 md:w-10 md:h-10 items-center justify-center rounded-full bg-background/90 text-foreground hover:bg-accent hover:text-accent-foreground transition-colors shadow-md z-20"
          >
            <ChevronLeft className="w-4 h-4 md:w-5 md:h-5" />
          </button>
          <button
            onClick={next}
            aria-label="Suivant"
            className="hidden sm:flex absolute right-2 md:right-3 top-1/2 -translate-y-1/2 w-8 h-8 md:w-10 md:h-10 items-center justify-center rounded-full bg-background/90 text-foreground hover:bg-accent hover:text-accent-foreground transition-colors shadow-md z-20"
          >
            <ChevronRight className="w-4 h-4 md:w-5 md:h-5" />
          </button>

          {/* Dots */}
          <div className="absolute bottom-2 sm:bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-20">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                aria-label={`Slide ${i + 1}`}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === current
                    ? "w-6 bg-accent"
                    : "w-1.5 bg-primary-foreground/50 hover:bg-primary-foreground/80"
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HeaderPromoSlider;
