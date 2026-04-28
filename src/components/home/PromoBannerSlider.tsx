import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { Users, TrendingUp, ChevronLeft, ChevronRight, User } from "lucide-react";
import { useProducts } from "@/hooks/useProducts";
import { useLanguage } from "@/contexts/LanguageContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import ProductCard from "@/components/marketplace/ProductCard";
import avatarMale1 from "@/assets/avatars/avatar-male-1.png";
import avatarFemale1 from "@/assets/avatars/avatar-female-1.png";
import avatarMale2 from "@/assets/avatars/avatar-male-2.png";
import avatarFemale2 from "@/assets/avatars/avatar-female-2.png";
import avatarMale3 from "@/assets/avatars/avatar-male-3.png";
import avatarMale4 from "@/assets/avatars/avatar-male-4.png";
import defaultAvatar from "@/assets/default-producer-avatar.png";
import awardImage from "@/assets/award-togo-top-impact.jpg";
import heroFarmers from "@/assets/hero-farmers-connected.jpg";
import heroNetwork from "@/assets/hero-network-agriculture.jpg";
import heroOrganic from "@/assets/hero-organic-farm.jpg";
import heroAI from "@/assets/hero-ai-agriculture.jpg";
import promoBanner1 from "@/assets/step-4-delivery.jpg";
import heroShopping from "@/assets/hero-online-shopping-woman.jpg";

const banners = [
  {
    image: awardImage,
    title: "🏆 Meilleure Innovation 2025",
    subtitle: "NukuConnect sacrée par Togo Top Impact",
    cta: "Découvrir",
    link: "/a-propos",
  },
  {
    image: heroShopping,
    brandBg: true,
    title: "Achat en ligne simplifié",
    subtitle: "Commandez vos produits frais depuis chez vous",
    cta: "Commander",
    link: "/marketplace",
  },
  {
    image: heroFarmers,
    title: "Agriculteurs connectés",
    subtitle: "La technologie au service des champs",
    cta: "Explorer",
    link: "/marketplace",
  },
  {
    image: heroNetwork,
    title: "Réseau agricole digital",
    subtitle: "Connectez-vous aux producteurs locaux",
    cta: "Rejoindre",
    link: "/auth",
  },
  {
    image: heroOrganic,
    title: "Agriculture moderne & durable",
    subtitle: "Des produits frais et certifiés bio",
    cta: "Voir les produits",
    link: "/marketplace?category=agriculture",
  },
  {
    image: heroAI,
    title: "L'IA au service de l'agriculture",
    subtitle: "Optimisez vos rendements avec NukuAI",
    cta: "Essayer NukuAI",
    link: "/nuku-ai",
  },
  {
    image: promoBanner1,
    title: "Livraison gratuite",
    subtitle: "Sur votre première commande",
    code: "NUKU2026",
    cta: "Commander",
    link: "/marketplace",
  },
];

const PromoBannerSlider = () => {
  const [current, setCurrent] = useState(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchDelta, setTouchDelta] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const { data: products } = useProducts();
  const { formatPrice } = useLanguage();

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % banners.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.touches[0].clientX);
    setIsSwiping(true);
    setTouchDelta(0);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStart === null) return;
    setTouchDelta(e.touches[0].clientX - touchStart);
  };

  const handleTouchEnd = () => {
    if (touchStart === null) return;
    const threshold = 50;
    if (touchDelta < -threshold) {
      setCurrent((prev) => (prev + 1) % banners.length);
    } else if (touchDelta > threshold) {
      setCurrent((prev) => (prev - 1 + banners.length) % banners.length);
    }
    setTouchStart(null);
    setTouchDelta(0);
    setIsSwiping(false);
  };

  const recentProducts = useMemo(() => {
    const db = products || [];
    return db.slice(0, 8);
  }, [products]);

  // Featured producers with professional avatars
  const featuredProducers = [
    { id: "eyabane", name: "Eyabanè Bitassa", avatar: avatarMale1 },
    { id: "fiogbo", name: "Souléïmane FIOGBO", avatar: avatarMale2 },
    { id: "hounsou", name: "Alban Hounsou", avatar: avatarMale3 },
    { id: "ahouede", name: "Dela AHOUEDE", avatar: avatarFemale1 },
    { id: "bissang", name: "Koffi E. BISSANG", avatar: avatarMale4 },
    { id: "kabassima", name: "Alexandre KABASSIMA", avatar: avatarMale3 },
    { id: "freehol", name: "Hol Freehol", avatar: avatarMale1 },
    { id: "horizon", name: "Horizon Agri", avatar: avatarMale2 },
    { id: "afandonougbo", name: "Komi S. Afandonougbo", avatar: avatarMale4 },
    { id: "ouro-akpo", name: "Mourdjanatou OURO-AKPO", avatar: avatarFemale2 },
    { id: "lerampo", name: "TCHABLI LERAMPO", avatar: avatarMale3 },
    { id: "ziafo", name: "Yannick ZIAFO", avatar: avatarMale1 },
  ];

  // Show real DB producers first (verified on top), fill remaining with featured
  const displayProducers = useMemo(() => {
    const seen = new Set<string>();
    const realProducers = (products || [])
      .map((product) => product.producer)
      .filter((producer) => {
        const producerId = producer?.id;
        if (!producerId || seen.has(producerId)) return false;
        seen.add(producerId);
        return true;
      })
      .map((producer) => ({
        id: producer.id || crypto.randomUUID(),
        name: producer.name || "Fournisseur",
        avatar: producer.avatar || defaultAvatar,
        verified: Boolean(producer.verified),
      }))
      .sort((a, b) => Number(b.verified) - Number(a.verified));
    
    // If not enough real producers, add featured ones
    const remaining = 12 - realProducers.length;
    if (remaining > 0) {
      const filler = featuredProducers.slice(0, remaining).map(fp => ({
        id: fp.id,
        name: fp.name,
        avatar: fp.avatar,
        verified: false,
      }));
      return [...realProducers, ...filler];
    }
    return realProducers.slice(0, 12);
  }, [products]);

  return (
    <div>
      {/* Banner Slider - mobile only */}
      <div className="md:hidden px-3 pt-2 pb-1">
        <div className="relative overflow-hidden rounded-none shadow-lg"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div
            className={`flex ${isSwiping ? '' : 'transition-transform duration-500 ease-out'}`}
            style={{ transform: `translateX(calc(-${current * 100}% + ${isSwiping ? touchDelta : 0}px))` }}
          >
            {banners.map((banner, i) => (
              <Link key={i} to={banner.link} className="w-full flex-shrink-0 block">
                <div className="relative h-48 sm:h-56 bg-muted">
                  {(banner as any).brandBg ? (
                    <>
                      {/* Brand-only background — no red, full logo palette */}
                      <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary to-secondary" />
                      <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_30%_20%,hsl(var(--accent))_0%,transparent_55%)]" />
                    </>
                  ) : (
                    <>
                      <img src={banner.image} alt={banner.title} className="absolute inset-0 w-full h-full object-cover saturate-[0.35] brightness-105" />
                      {/* Subtle brand tint to neutralize stray colors */}
                      <div className="absolute inset-0 bg-primary/10" />
                    </>
                  )}
                  {/* Strong bottom shade for crisp text legibility */}
                  <div className="absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-foreground/85 via-foreground/45 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-5">
                    <h3 className="text-primary-foreground font-heading font-extrabold text-lg sm:text-xl leading-tight uppercase tracking-tight drop-shadow-lg">{banner.title}</h3>
                    <p className="text-primary-foreground/85 text-xs sm:text-sm mt-0.5 italic drop-shadow-md">{banner.subtitle}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="inline-block bg-accent text-accent-foreground font-bold text-[11px] sm:text-xs px-4 py-1.5 rounded-none uppercase tracking-wider shadow-sm">{banner.cta}</span>
                      {banner.code && (
                        <span className="inline-block bg-primary-foreground/15 backdrop-blur-sm text-primary-foreground font-bold text-[11px] px-3 py-1.5 rounded-none border border-primary-foreground/40 tracking-wider">{banner.code}</span>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
          <div className="absolute bottom-2 right-4 flex gap-1.5">
            {banners.map((_, i) => (
              <button key={i} onClick={(e) => { e.preventDefault(); setCurrent(i); }}
                className={`rounded-full transition-all ${i === current ? "w-5 h-1.5 bg-white" : "w-1.5 h-1.5 bg-white/50"}`} />
            ))}
          </div>
        </div>
      </div>

      {/* Quick Stats - mobile only */}
      <div className="md:hidden px-3 py-2">
        <div>
          <div className="grid grid-cols-3 gap-2 max-w-xl mx-auto">
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-primary/5 border border-primary/10">
              <Users className="w-4 h-4 text-primary flex-shrink-0" />
              <div>
                <p className="text-xs font-bold text-foreground">10K+</p>
                <p className="text-[9px] text-muted-foreground">Producteurs</p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-primary/5 border border-primary/10">
              <User className="w-4 h-4 text-primary flex-shrink-0" />
              <div>
                <p className="text-xs font-bold text-foreground">25K+</p>
                <p className="text-[9px] text-muted-foreground">Acheteurs</p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-primary/5 border border-primary/10">
              <TrendingUp className="w-4 h-4 text-primary flex-shrink-0" />
              <div>
                <p className="text-xs font-bold text-foreground">50K+</p>
                <p className="text-[9px] text-muted-foreground">Ventes</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Products - all devices */}
      {recentProducts.length > 0 && (
        <div className="px-3 sm:px-0 py-2 sm:py-4">
          <div className="sm:container sm:mx-auto sm:px-4">
            <div className="flex items-center justify-between mb-2 sm:mb-4">
              <h3 className="font-heading text-sm sm:text-base lg:text-lg font-bold text-foreground">Publications récentes</h3>
              <Link to="/marketplace" className="text-[10px] sm:text-xs text-primary font-medium">Tout voir →</Link>
            </div>
            {/* Mobile: horizontal scroll - uniform card size */}
            <div className="flex gap-2 overflow-x-auto pb-2 -mx-3 px-3 scrollbar-hide md:hidden">
              {recentProducts.map((product) => (
                <div key={product.id} className="flex-shrink-0 w-[140px] h-[260px]">
                  <ProductCard product={product} viewMode="grid" hideProducer />
                </div>
              ))}
            </div>
            {/* Desktop: grid - uniform card size */}
            <div className="hidden md:grid md:grid-cols-4 lg:grid-cols-5 gap-3">
              {recentProducts.slice(0, 5).map((product) => (
                <div key={product.id} className="h-[300px]">
                  <ProductCard product={product} viewMode="grid" hideProducer />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PromoBannerSlider;
