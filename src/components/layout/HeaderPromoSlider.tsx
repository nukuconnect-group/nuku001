import { useState, useEffect, useCallback } from "react";
import { Link, useLocation } from "react-router-dom";
import { ChevronLeft, ChevronRight, Leaf, Truck, Sparkles, Users, ShieldCheck, ShoppingBasket, Bot } from "lucide-react";
import agriWomanSmartphone from "@/assets/header-agri-woman-smartphone.jpg";
import agriFarmersPhones from "@/assets/header-agri-farmers-phones.jpg";
import agriTransactionDelivery from "@/assets/header-agri-transaction-delivery.jpg";
import driverLogistics from "@/assets/header-slide-driver-logistics.jpg";
import aiAssistant from "@/assets/header-slide-ai-assistant.jpg";

const slides = [
  {
    eyebrow: "Marketplace agricole",
    title: "Achetez frais, directement auprès des producteurs",
    subtitle: "Produits locaux vérifiés, commandes rapides et paiement sécurisé.",
    Icon: Leaf,
    image: agriWomanSmartphone,
  },
  {
    eyebrow: "Réseau NukuConnect",
    title: "Producteurs, fournisseurs et acheteurs réunis",
    subtitle: "Connectez votre production au marché avec une expérience simple et fiable.",
    Icon: Users,
    image: agriFarmersPhones,
  },
  {
    eyebrow: "Livraison NukuConnect",
    title: "Vos commandes livrées par notre flotte interne",
    subtitle: "Livreurs vérifiés, suivi GPS en temps réel et tarifs transparents.",
    Icon: Truck,
    image: driverLogistics,
  },
  {
    eyebrow: "Assistant IA agricole",
    title: "NukuConnect IA accompagne agriculteurs et acheteurs",
    subtitle: "Conseils techniques, recommandations et support intelligent à tout moment.",
    Icon: Bot,
    image: aiAssistant,
  },
  {
    eyebrow: "Commerce sécurisé",
    title: "Vendez, payez et livrez en toute confiance",
    subtitle: "Des échanges agricoles transparents, de la boutique jusqu’à la livraison.",
    Icon: ShieldCheck,
    image: agriTransactionDelivery,
  },
];

const stats = [
  { value: "10K+", label: "Producteurs", Icon: Users },
  { value: "25K+", label: "Acheteurs", Icon: ShoppingBasket },
  { value: "100%", label: "Traçabilité", Icon: ShieldCheck },
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
    <div className="bg-background pt-2 sm:pt-3 pb-3 sm:pb-5 space-y-3 sm:space-y-4">
      <div className="mx-auto px-3 sm:px-0">
        <div className="relative overflow-hidden rounded-none shadow-xl bg-primary ring-1 ring-primary/20">
          <div className="absolute inset-y-0 right-0 w-[55%] sm:w-[58%] md:w-[56%] overflow-hidden">
            {slides.map((slide, i) => (
              <img
                key={slide.title}
                src={slide.image}
                alt={slide.title}
                width={1280}
                height={720}
                className={`absolute inset-0 h-full w-full object-cover object-center transition-all duration-700 ease-out ${
                  i === current ? "opacity-100 scale-100" : "opacity-0 scale-105"
                }`}
                loading={i === 0 ? "eager" : "lazy"}
              />
            ))}
            <div className="absolute inset-0 bg-gradient-to-r from-primary via-primary/55 to-primary/10" />
            <div className="absolute inset-0 bg-gradient-to-t from-primary/45 via-transparent to-transparent" />
          </div>

          <div className="relative z-10 min-h-[220px] sm:min-h-[260px] md:min-h-[300px] lg:min-h-[320px] flex flex-col justify-center">
            <div className="px-4 sm:px-7 md:px-10 py-6 sm:py-8 md:py-10 w-[64%] sm:w-[57%] md:w-[52%]">
              {slides.map((slide, i) => (
                <div
                  key={slide.title}
                  className={`transition-all duration-700 ease-out ${
                    i === current ? "opacity-100 translate-y-0" : "pointer-events-none absolute opacity-0 translate-y-3"
                  }`}
                >
                  <p className="inline-flex items-center gap-1.5 bg-primary-foreground/15 px-2.5 py-1 text-primary-foreground text-[9px] sm:text-[11px] md:text-xs font-extrabold uppercase tracking-[0.14em] leading-none">
                    <Sparkles className="w-3 h-3" />
                    {slide.eyebrow}
                  </p>
                  <h3 className="font-heading text-primary-foreground font-black leading-[1.05] mt-2 sm:mt-3 text-[19px] sm:text-3xl md:text-4xl lg:text-[42px] drop-shadow-sm">
                    {slide.title}
                  </h3>
                  <p className="text-primary-foreground/95 text-[11px] sm:text-sm md:text-base mt-2 max-w-[34ch] leading-snug drop-shadow-sm">
                    {slide.subtitle}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Arrows - hidden on small screens, visible from sm */}
          <button
            onClick={prev}
            aria-label="Précédent"
            className="hidden sm:flex absolute left-2 md:left-3 top-1/2 -translate-y-1/2 w-8 h-8 md:w-10 md:h-10 items-center justify-center rounded-none bg-background/90 text-foreground hover:bg-accent hover:text-accent-foreground transition-colors shadow-md z-20"
          >
            <ChevronLeft className="w-4 h-4 md:w-5 md:h-5" />
          </button>
          <button
            onClick={next}
            aria-label="Suivant"
            className="hidden sm:flex absolute right-2 md:right-3 top-1/2 -translate-y-1/2 w-8 h-8 md:w-10 md:h-10 items-center justify-center rounded-none bg-background/90 text-foreground hover:bg-accent hover:text-accent-foreground transition-colors shadow-md z-20"
          >
            <ChevronRight className="w-4 h-4 md:w-5 md:h-5" />
          </button>

          {/* Dots */}
          <div className="absolute top-2.5 sm:top-3 right-3 sm:right-4 flex gap-1.5 z-20">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                aria-label={`Slide ${i + 1}`}
                className={`h-1.5 rounded-none transition-all duration-300 ${
                  i === current
                    ? "w-6 bg-accent"
                    : "w-1.5 bg-primary-foreground/50 hover:bg-primary-foreground/80"
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Stats bar — mobile uniquement */}
      <div className="md:hidden mx-auto px-3 max-w-6xl">
        <div className="grid grid-cols-3 bg-card border border-border rounded-none shadow-sm overflow-hidden">
          {stats.map(({ value, label, Icon }) => (
            <div key={label} className="flex items-center justify-center gap-1.5 px-1.5 py-3 border-r border-border last:border-r-0 min-w-0">
              <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center bg-primary/10 text-primary rounded-none">
                <Icon className="h-3.5 w-3.5" />
              </span>
              <span className="min-w-0 leading-none">
                <span className="block font-heading text-foreground font-black text-sm">{value}</span>
                <span className="block text-[9px] text-muted-foreground truncate mt-1">{label}</span>
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default HeaderPromoSlider;
