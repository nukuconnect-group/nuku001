import { useState, useEffect, useCallback } from "react";
import { Link, useLocation } from "react-router-dom";
import { ChevronLeft, ChevronRight, Leaf, Truck, Sparkles, Users, ShieldCheck, ShoppingBasket } from "lucide-react";
import agriWomanSmartphone from "@/assets/header-agri-woman-smartphone.jpg";
import agriFarmersPhones from "@/assets/header-agri-farmers-phones.jpg";
import agriTransactionDelivery from "@/assets/header-agri-transaction-delivery.jpg";

const slides = [
  {
    eyebrow: "Marketplace agricole",
    title: "Achetez frais, directement aux producteurs",
    highlight: "Femmes et hommes agricoles connectés",
    subtitle: "Produits locaux vérifiés, commandes rapides et paiement sécurisé.",
    cta: "Explorer",
    href: "/marketplace",
    Icon: Leaf,
    image: agriWomanSmartphone,
  },
  {
    eyebrow: "Réseau NukuConnect",
    title: "Producteurs, fournisseurs et acheteurs en réseau",
    highlight: "Transactions agricoles intelligentes",
    subtitle: "Connectez votre production au marché avec une expérience simple et fiable.",
    cta: "Rejoindre",
    href: "/marketplace",
    Icon: Users,
    image: agriFarmersPhones,
  },
  {
    eyebrow: "Commerce sécurisé",
    title: "Vendez, payez et livrez en toute confiance",
    highlight: "Traçabilité + livraison NukuConnect",
    subtitle: "Des transactions agricoles claires, de la boutique jusqu’à la livraison.",
    cta: "Commander",
    href: "/marketplace",
    Icon: Truck,
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
    <div className="bg-background pt-2 sm:pt-3 pb-3 sm:pb-5">
      <div className="mx-auto px-3 sm:px-4 max-w-6xl">
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

          <div className="relative z-10 min-h-[248px] sm:min-h-[288px] md:min-h-[320px] lg:min-h-[340px] flex flex-col justify-between">
            <div className="px-4 sm:px-7 md:px-10 pt-5 sm:pt-8 md:pt-10 pb-4 w-[64%] sm:w-[57%] md:w-[52%]">
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
                  <p className="text-primary-foreground font-extrabold text-[11px] sm:text-sm md:text-base mt-2 drop-shadow-sm">
                    {slide.highlight}
                  </p>
                  <p className="text-primary-foreground/95 text-[11px] sm:text-sm md:text-base mt-2 max-w-[34ch] leading-snug drop-shadow-sm">
                    {slide.subtitle}
                  </p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-3 border-t border-primary-foreground/15 bg-primary-foreground/10 backdrop-blur-sm">
              {stats.map(({ value, label, Icon }) => (
                <div key={label} className="flex items-center justify-center gap-1.5 sm:gap-2 px-1.5 py-2.5 sm:py-3 border-r border-primary-foreground/10 last:border-r-0 min-w-0">
                  <span className="flex h-7 w-7 sm:h-9 sm:w-9 flex-shrink-0 items-center justify-center bg-accent text-accent-foreground rounded-none">
                    <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  </span>
                  <span className="min-w-0 leading-none">
                    <span className="block font-heading text-primary-foreground font-black text-sm sm:text-xl">{value}</span>
                    <span className="block text-[8px] sm:text-[10px] text-primary-foreground/85 truncate mt-1">{label}</span>
                  </span>
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
    </div>
  );
};

export default HeaderPromoSlider;
