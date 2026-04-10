import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";

const slides = [
  {
    title: "PRODUITS FRAIS",
    subtitle: "Direct producteurs",
    cta: "Explorer",
    href: "/marketplace",
    bg: "from-primary to-primary/80",
  },
  {
    title: "LIVRAISON RAPIDE",
    subtitle: "Partout au Togo",
    cta: "Commander",
    href: "/marketplace",
    bg: "from-accent to-accent/80",
  },
  {
    title: "FORMATIONS",
    subtitle: "Agricoles gratuites",
    cta: "Apprendre",
    href: "/formations",
    bg: "from-green-600 to-green-500",
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
    <div className="relative overflow-hidden h-10 bg-gradient-to-r from-accent/10 to-primary/10">
      <div
        className="flex transition-transform duration-500 ease-in-out h-full"
        style={{ transform: `translateX(-${current * 100}%)` }}
      >
        {slides.map((slide, i) => (
          <Link
            key={i}
            to={slide.href}
            className="flex-shrink-0 w-full h-full flex items-center justify-center gap-2 px-4"
          >
            <span className="text-[10px] sm:text-xs font-extrabold uppercase text-primary tracking-wider">
              {slide.title}
            </span>
            <span className="text-[9px] sm:text-[10px] text-muted-foreground hidden sm:inline">
              — {slide.subtitle}
            </span>
            <span className="text-[9px] sm:text-[10px] font-semibold text-accent underline underline-offset-2 ml-1">
              {slide.cta} →
            </span>
          </Link>
        ))}
      </div>
      {/* Dots */}
      <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2 flex gap-1">
        {slides.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            className={`w-1.5 h-1.5 rounded-full transition-colors ${i === current ? "bg-primary" : "bg-muted-foreground/30"}`}
          />
        ))}
      </div>
    </div>
  );
};

export default HeaderPromoSlider;
