import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { Leaf, Truck, GraduationCap, Network } from "lucide-react";
import networkImg from "@/assets/promo-network-connected.jpg";

const slides = [
  {
    title: "PRODUITS FRAIS",
    subtitle: "Direct producteurs",
    cta: "EXPLORER",
    href: "/marketplace",
    Icon: Leaf,
    image: null as string | null,
  },
  {
    title: "LIVRAISON EXPRESS",
    subtitle: "Partout en Afrique",
    cta: "COMMANDER",
    href: "/marketplace",
    Icon: Truck,
    image: null,
  },
  {
    title: "FORMATIONS GRATUITES",
    subtitle: "Agricoles & aquacoles",
    cta: "APPRENDRE",
    href: "/formations",
    Icon: GraduationCap,
    image: null,
  },
  {
    title: "RÉSEAU AGRICOLE CONNECTÉ",
    subtitle: "Producteurs & acheteurs",
    cta: "REJOINDRE",
    href: "/producteurs",
    Icon: Network,
    image: networkImg,
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
    <div className="relative overflow-hidden h-8 sm:h-9 bg-gradient-to-r from-[hsl(var(--secondary))] via-[hsl(var(--secondary)/0.9)] to-[hsl(var(--primary)/0.85)]">
      <div
        className="flex transition-transform duration-500 ease-in-out h-full"
        style={{ transform: `translateX(-${current * 100}%)` }}
      >
        {slides.map((slide, i) => {
          const { Icon } = slide;
          return (
            <Link
              key={i}
              to={slide.href}
              className="flex-shrink-0 w-full h-full flex items-center justify-center gap-2 sm:gap-3 px-4"
            >
              <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-primary-foreground/15 flex items-center justify-center flex-shrink-0">
                <Icon className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-primary-foreground" />
              </div>
              <span className="text-[10px] sm:text-[11px] font-black uppercase text-primary-foreground tracking-[0.18em] leading-none">
                {slide.title}
              </span>
              <span className="text-[8px] sm:text-[9px] text-primary-foreground/60 hidden font-medium tracking-wide">
                — {slide.subtitle}
              </span>
              <span className="text-[8px] sm:text-[9px] font-extrabold text-primary-foreground uppercase tracking-[0.15em] ml-1 border border-primary-foreground/40 rounded-sm px-1.5 py-0.5 leading-none">
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
            className={`w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full transition-all duration-300 ${i === current ? "bg-primary-foreground w-2.5 sm:w-3" : "bg-primary-foreground/25"}`}
          />
        ))}
      </div>
    </div>
  );
};

export default HeaderPromoSlider;
