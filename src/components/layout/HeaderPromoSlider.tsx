import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { Leaf, Truck, GraduationCap, Network } from "lucide-react";
import mixxMarket from "@/assets/header-promo-mixx-market.png";
import mixxCloud from "@/assets/header-promo-mixx-cloud.png";
import mixxLogo from "@/assets/header-promo-mixx-logo.png";
import networkImg from "@/assets/promo-network-connected.jpg";
import heroFarmers from "@/assets/hero-farmers-connected.jpg";
import heroShopping from "@/assets/hero-online-shopping-woman.jpg";
import heroOrganic from "@/assets/hero-organic-farm.jpg";

const slides = [
  {
    title: "Momom nyuité",
    subtitle: "Marché agricole sur mobile",
    cta: "EXPLORER",
    href: "/marketplace",
    Icon: Leaf,
    image: mixxMarket,
  },
  {
    title: "Paiement rapide",
    subtitle: "Commandes sécurisées",
    cta: "COMMANDER",
    href: "/marketplace",
    Icon: Truck,
    image: mixxCloud,
  },
  {
    title: "NukuConnect",
    subtitle: "Vendez, partagez, encaissez",
    cta: "DÉMARRER",
    href: "/dashboard",
    Icon: Network,
    image: mixxLogo,
  },
  {
    title: "FORMATIONS GRATUITES",
    subtitle: "Agricoles & aquacoles",
    cta: "APPRENDRE",
    href: "/formations",
    Icon: GraduationCap,
    image: heroFarmers,
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
    const timer = setInterval(next, 4500);
    return () => clearInterval(timer);
  }, [next]);

  return (
    <>
      {/* MOBILE — bannière promo inspirée Mixx avec les visuels fournis */}
      <div className="sm:hidden bg-primary px-2.5 pb-2">
        <div className="relative overflow-hidden rounded-lg shadow-lg border border-primary-foreground/10">
          <div
            className="flex transition-transform duration-500 ease-out"
            style={{ transform: `translateX(-${current * 100}%)` }}
          >
            {slides.map((slide, i) => {
              const { Icon } = slide;
              return (
                <Link
                  key={i}
                  to={slide.href}
                  className="relative flex-shrink-0 w-full h-28 flex items-stretch bg-primary"
                >
                  {slide.image && (
                    <div
                      className="absolute inset-y-0 right-0 w-[58%] bg-primary-foreground"
                      style={{ clipPath: "polygon(18% 0, 100% 0, 100% 100%, 0 100%)" }}
                    >
                      <img
                        src={slide.image}
                        alt={slide.title}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    </div>
                  )}

                  <div className="absolute inset-0 bg-gradient-to-r from-primary via-primary/95 to-primary/20" />
                  <div className="relative z-10 flex flex-col justify-center pl-3.5 pr-2 py-3 max-w-[54%]">
                    <h3 className="font-heading text-accent font-black italic text-xl leading-[0.95] tracking-normal drop-shadow-sm">
                      {slide.title}
                    </h3>
                    <p className="text-primary-foreground text-[10px] font-semibold italic mt-1 leading-snug">
                      {slide.subtitle}
                    </p>
                    <div className="mt-2 inline-flex items-center gap-1 self-start bg-accent text-accent-foreground font-extrabold text-[9px] uppercase px-2.5 py-1 rounded-sm">
                      <Icon className="w-2.5 h-2.5" />
                      {slide.cta}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>

          {/* Dots centrés sous la bannière */}
          <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 flex gap-1.5">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={(e) => { e.preventDefault(); setCurrent(i); }}
                aria-label={`Slide ${i + 1}`}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === current
                    ? "w-5 bg-[hsl(var(--accent))]"
                    : "w-1.5 bg-primary-foreground/50"
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Pas de bannière promo tablette/desktop : correction demandée mobile seulement. */}
    </>
  );
};

export default HeaderPromoSlider;
