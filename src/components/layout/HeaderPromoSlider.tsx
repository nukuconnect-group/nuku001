import { useState, useEffect, useCallback } from "react";
import { Link, useLocation } from "react-router-dom";
import { Leaf, Truck, GraduationCap, Network, Sparkles } from "lucide-react";
import heroOrganic from "@/assets/hero-organic-farm.jpg";
import heroFarmers from "@/assets/hero-farmers-connected.jpg";
import heroDrone from "@/assets/hero-drone-agriculture.png";
import heroAI from "@/assets/hero-ai-agriculture.jpg";
import heroNetwork from "@/assets/hero-network-agriculture.jpg";

const slides = [
  {
    eyebrow: "Marketplace agricole",
    title: "DU CHAMP À VOTRE PANIER",
    subtitle: "Produits frais directement des producteurs vérifiés",
    cta: "EXPLORER",
    href: "/marketplace",
    Icon: Leaf,
    image: heroOrganic,
  },
  {
    eyebrow: "Livraison Nukuconnect",
    title: "FLOTTE INTERNE RAPIDE",
    subtitle: "Suivi GPS temps réel, paiement à la livraison",
    cta: "COMMANDER",
    href: "/marketplace",
    Icon: Truck,
    image: heroFarmers,
  },
  {
    eyebrow: "Nukuconnect IA",
    title: "L'IA AU SERVICE DES AGRICULTEURS",
    subtitle: "Conseils, recommandations & matching intelligent",
    cta: "ESSAYER",
    href: "/nuku-ai",
    Icon: Sparkles,
    image: heroAI,
  },
  {
    eyebrow: "Formations gratuites",
    title: "APPRENEZ LES MEILLEURES PRATIQUES",
    subtitle: "Agriculture & aquaculture, certifiantes",
    cta: "APPRENDRE",
    href: "/formations",
    Icon: GraduationCap,
    image: heroDrone,
  },
  {
    eyebrow: "Réseau agricole",
    title: "REJOIGNEZ LA COMMUNAUTÉ",
    subtitle: "Producteurs, acheteurs, fournisseurs connectés",
    cta: "REJOINDRE",
    href: "/producteurs",
    Icon: Network,
    image: heroNetwork,
  },
];

const HeaderPromoSlider = () => {
  const [current, setCurrent] = useState(0);
  const location = useLocation();

  const next = useCallback(() => setCurrent(c => (c + 1) % slides.length), []);

  useEffect(() => {
    const timer = setInterval(next, 4500);
    return () => clearInterval(timer);
  }, [next]);

  // Affiché uniquement sur la page d'accueil, mobile seulement.
  if (location.pathname !== "/") return null;

  return (
    <div className="sm:hidden bg-primary px-2 pb-2">
      <div className="relative overflow-hidden shadow-md border border-primary-foreground/10">
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
                className="relative flex-shrink-0 w-full h-28 flex items-stretch"
              >
                <img
                  src={slide.image}
                  alt={slide.title}
                  className="absolute inset-0 w-full h-full object-cover"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-primary/95 via-primary/75 to-primary/20" />

                <div className="relative z-10 flex flex-col justify-center px-4 py-2.5 w-full">
                  <p className="text-accent text-[9px] font-bold uppercase tracking-widest leading-none">
                    {slide.eyebrow}
                  </p>
                  <h3 className="font-heading text-primary-foreground font-extrabold text-[15px] leading-tight mt-1 max-w-[78%]">
                    {slide.title}
                  </h3>
                  <p className="text-primary-foreground/85 text-[10px] mt-1 max-w-[72%] leading-snug">
                    {slide.subtitle}
                  </p>
                  <div className="mt-1.5 inline-flex items-center gap-1 self-start bg-accent text-accent-foreground font-extrabold text-[9px] uppercase tracking-wide px-2.5 py-1">
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
              className={`h-1 transition-all duration-300 ${
                i === current
                  ? "w-5 bg-accent"
                  : "w-1.5 bg-primary-foreground/50"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default HeaderPromoSlider;
