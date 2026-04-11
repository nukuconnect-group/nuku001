import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { Leaf, Truck, GraduationCap, ShoppingBag, Sparkles } from "lucide-react";

const slides = [
  {
    title: "PRODUITS FRAIS",
    subtitle: "Direct producteurs",
    cta: "Explorer",
    href: "/marketplace",
    icon: Leaf,
    accent: "text-green-500",
  },
  {
    title: "LIVRAISON RAPIDE",
    subtitle: "Partout en Afrique",
    cta: "Commander",
    href: "/marketplace",
    icon: Truck,
    accent: "text-blue-500",
  },
  {
    title: "FORMATIONS",
    subtitle: "Agricoles gratuites",
    cta: "Apprendre",
    href: "/formations",
    icon: GraduationCap,
    accent: "text-amber-500",
  },
  {
    title: "MARKETPLACE",
    subtitle: "Achetez & Vendez",
    cta: "Découvrir",
    href: "/marketplace",
    icon: ShoppingBag,
    accent: "text-emerald-500",
  },
];

const HeaderPromoSlider = () => {
  const [current, setCurrent] = useState(0);

  const next = useCallback(() => setCurrent(c => (c + 1) % slides.length), []);

  useEffect(() => {
    const timer = setInterval(next, 4000);
    return () => clearInterval(timer);
  }, [next]);

  return (
    <div className="relative overflow-hidden h-9 bg-gradient-to-r from-primary/95 to-primary/80">
      <div
        className="flex transition-transform duration-500 ease-in-out h-full"
        style={{ transform: `translateX(-${current * 100}%)` }}
      >
        {slides.map((slide, i) => {
          const Icon = slide.icon;
          return (
            <Link
              key={i}
              to={slide.href}
              className="flex-shrink-0 w-full h-full flex items-center justify-center gap-2 px-4"
            >
              <Icon className={`w-3.5 h-3.5 text-primary-foreground/90`} />
              <span className="text-[10px] sm:text-xs font-extrabold uppercase text-primary-foreground tracking-[0.12em]">
                {slide.title}
              </span>
              <span className="text-[9px] sm:text-[10px] text-primary-foreground/70 hidden sm:inline font-medium">
                — {slide.subtitle}
              </span>
              <span className="text-[9px] sm:text-[10px] font-bold text-accent uppercase tracking-wide ml-1 flex items-center gap-0.5">
                <Sparkles className="w-2.5 h-2.5" />
                {slide.cta}
              </span>
            </Link>
          );
        })}
      </div>
      {/* Dots */}
      <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2 flex gap-1">
        {slides.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${i === current ? "bg-primary-foreground w-3" : "bg-primary-foreground/30"}`}
          />
        ))}
      </div>
    </div>
  );
};

export default HeaderPromoSlider;
