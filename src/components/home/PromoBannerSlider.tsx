import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import promoBanner1 from "@/assets/promo-banner-1.jpg";
import promoBanner2 from "@/assets/promo-banner-2.jpg";
import promoBanner3 from "@/assets/promo-banner-3.jpg";

const banners = [
  {
    image: promoBanner1,
    title: "Livraison gratuite",
    subtitle: "sur votre première commande",
    code: "NUKU2026",
    codeLabel: "Utilisez ce code promo",
    cta: "Commander",
    link: "/marketplace",
    gradient: "from-primary to-primary/80",
  },
  {
    image: promoBanner2,
    title: "Produits de saison",
    subtitle: "Jusqu'à -40% sur les fruits & légumes",
    cta: "Voir les offres",
    link: "/marketplace?category=agriculture",
    gradient: "from-orange-500 to-orange-400",
  },
  {
    image: promoBanner3,
    title: "Devenez vendeur",
    subtitle: "Vendez vos produits à des milliers d'acheteurs",
    cta: "S'inscrire",
    link: "/auth",
    gradient: "from-emerald-600 to-emerald-500",
  },
];

const PromoBannerSlider = () => {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % banners.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="lg:hidden">
      <div className="container mx-auto px-3 py-2">
        <div className="relative overflow-hidden rounded-xl">
          <div
            className="flex transition-transform duration-500 ease-out"
            style={{ transform: `translateX(-${current * 100}%)` }}
          >
            {banners.map((banner, i) => (
              <Link
                key={i}
                to={banner.link}
                className="w-full flex-shrink-0 relative"
              >
                <div className={`relative h-36 sm:h-44 rounded-xl overflow-hidden bg-gradient-to-r ${banner.gradient}`}>
                  <img
                    src={banner.image}
                    alt={banner.title}
                    className="absolute inset-0 w-full h-full object-cover mix-blend-overlay opacity-60"
                  />
                  <div className="relative z-10 h-full flex flex-col justify-center px-4 sm:px-6">
                    <h3 className="text-white font-heading font-bold text-base sm:text-lg leading-tight">
                      {banner.title}
                    </h3>
                    <p className="text-white/90 text-[11px] sm:text-xs mt-0.5">
                      {banner.subtitle}
                    </p>
                    {banner.code && (
                      <div className="mt-2 inline-flex items-center gap-1.5 bg-white/20 backdrop-blur-sm rounded-lg px-2.5 py-1 w-fit">
                        <span className="text-white font-bold text-xs sm:text-sm tracking-wider">
                          {banner.code}
                        </span>
                        <span className="text-white/70 text-[9px]">{banner.codeLabel}</span>
                      </div>
                    )}
                    <div className="mt-2">
                      <span className="inline-block bg-white text-foreground font-semibold text-[10px] sm:text-xs px-3 py-1.5 rounded-full shadow-sm">
                        {banner.cta}
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {/* Dots */}
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
            {banners.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className={`h-1.5 rounded-full transition-all ${
                  i === current ? "w-4 bg-white" : "w-1.5 bg-white/50"
                }`}
              />
            ))}
          </div>

          {/* Arrows */}
          <button
            onClick={() => setCurrent((prev) => (prev - 1 + banners.length) % banners.length)}
            className="absolute left-1 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-black/20 backdrop-blur-sm flex items-center justify-center text-white"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setCurrent((prev) => (prev + 1) % banners.length)}
            className="absolute right-1 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-black/20 backdrop-blur-sm flex items-center justify-center text-white"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default PromoBannerSlider;
