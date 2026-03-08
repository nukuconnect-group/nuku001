import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { Users, Leaf, TrendingUp, ChevronLeft, ChevronRight } from "lucide-react";
import { useProducts } from "@/hooks/useProducts";
import { useLanguage } from "@/contexts/LanguageContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { products as mockProducts } from "@/data/marketplace";
import ProductCard from "@/components/marketplace/ProductCard";
import awardImage from "@/assets/award-togo-top-impact.jpg";
import heroFarmers from "@/assets/hero-farmers-connected.jpg";
import heroNetwork from "@/assets/hero-network-agriculture.jpg";
import heroOrganic from "@/assets/hero-organic-farm.jpg";
import heroAI from "@/assets/hero-ai-agriculture.jpg";
import promoBanner1 from "@/assets/promo-banner-1.jpg";

const banners = [
  {
    image: awardImage,
    title: "🏆 Meilleure Innovation 2025",
    subtitle: "NukuConnect sacrée par Togo Top Impact",
    cta: "Découvrir",
    link: "/a-propos",
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
  const { data: products } = useProducts();
  const { formatPrice } = useLanguage();

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % banners.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const recentProducts = useMemo(() => {
    const db = products || [];
    return db.length > 0 ? db.slice(0, 8) : mockProducts.slice(0, 8);
  }, [products]);

  const uniqueProducers = useMemo(() => {
    return Array.from(new Map(recentProducts.map(p => [p.producer.id, p.producer])).values()).slice(0, 8);
  }, [recentProducts]);

  return (
    <div>
      {/* Banner Slider - mobile only */}
      <div className="md:hidden px-3 pt-2 pb-1">
        <div className="relative overflow-hidden rounded-2xl shadow-lg">
          <div
            className="flex transition-transform duration-500 ease-out"
            style={{ transform: `translateX(-${current * 100}%)` }}
          >
            {banners.map((banner, i) => (
              <Link key={i} to={banner.link} className="w-full flex-shrink-0 block">
                <div className="relative h-48 sm:h-56">
                  <img src={banner.image} alt={banner.title} className="absolute inset-0 w-full h-full object-cover" />
                  <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/60 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-5">
                    <h3 className="text-white font-heading font-extrabold text-lg sm:text-xl leading-tight drop-shadow-lg">{banner.title}</h3>
                    <p className="text-white/90 text-xs sm:text-sm mt-0.5 drop-shadow-md">{banner.subtitle}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="inline-block bg-white text-foreground font-bold text-[11px] sm:text-xs px-4 py-1.5 rounded-full shadow-sm">{banner.cta}</span>
                      {banner.code && (
                        <span className="inline-block bg-white/20 backdrop-blur-sm text-white font-bold text-[11px] px-3 py-1.5 rounded-full border border-white/30 tracking-wider">{banner.code}</span>
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

      {/* Quick Stats */}
      <div className="px-3 sm:px-0 py-2 sm:py-4">
        <div className="sm:container sm:mx-auto sm:px-4">
          <div className="grid grid-cols-3 gap-2 sm:gap-3 max-w-xl mx-auto md:max-w-none">
            <div className="flex items-center gap-2 p-2.5 sm:p-3 rounded-xl bg-primary/5 border border-primary/10">
              <Users className="w-4 h-4 text-primary flex-shrink-0" />
              <div>
                <p className="text-xs sm:text-sm font-bold text-foreground">10K+</p>
                <p className="text-[9px] sm:text-xs text-muted-foreground">Producteurs</p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-2.5 sm:p-3 rounded-xl bg-primary/5 border border-primary/10">
              <Leaf className="w-4 h-4 text-primary flex-shrink-0" />
              <div>
                <p className="text-xs sm:text-sm font-bold text-foreground">2K+</p>
                <p className="text-[9px] sm:text-xs text-muted-foreground">Bio certifié</p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-2.5 sm:p-3 rounded-xl bg-primary/5 border border-primary/10">
              <TrendingUp className="w-4 h-4 text-primary flex-shrink-0" />
              <div>
                <p className="text-xs sm:text-sm font-bold text-foreground">50K+</p>
                <p className="text-[9px] sm:text-xs text-muted-foreground">Ventes</p>
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
            {/* Mobile: horizontal scroll */}
            <div className="flex gap-2.5 overflow-x-auto pb-2 -mx-3 px-3 scrollbar-hide md:hidden">
              {recentProducts.map((product) => (
                <div key={product.id} className="flex-shrink-0 w-[140px]">
                  <ProductCard product={product} viewMode="grid" hideProducer />
                </div>
              ))}
            </div>
            {/* Desktop: grid */}
            <div className="hidden md:grid md:grid-cols-4 lg:grid-cols-5 gap-3">
              {recentProducts.slice(0, 5).map((product) => (
                <ProductCard key={product.id} product={product} viewMode="grid" hideProducer />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Active Farmers - all devices */}
      {uniqueProducers.length > 0 && (
        <div className="px-3 sm:px-0 py-2 sm:py-4">
          <div className="sm:container sm:mx-auto sm:px-4">
            <div className="flex items-center justify-between mb-2 sm:mb-4">
              <h3 className="font-heading text-sm sm:text-base lg:text-lg font-bold text-foreground flex items-center gap-1.5">
                <Users className="w-4 h-4 text-primary" />Agriculteurs actifs
              </h3>
              <Link to="/producteurs" className="text-[10px] sm:text-xs text-primary font-medium">Voir tous →</Link>
            </div>
            <div className="flex gap-3 sm:gap-4 overflow-x-auto pb-2 -mx-3 px-3 sm:mx-0 sm:px-0 scrollbar-hide">
              {uniqueProducers.map((producer) => (
                <Link key={producer.id} to={`/producteurs/${producer.name}`}
                  className="flex-shrink-0 flex flex-col items-center gap-1 w-16 sm:w-20 group">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full overflow-hidden border-2 border-primary/20 group-hover:border-primary transition-colors">
                    <img src={producer.avatar} alt={producer.name} className="w-full h-full object-cover" />
                  </div>
                  <p className="text-[9px] sm:text-[11px] font-medium text-foreground text-center line-clamp-1 w-full">{producer.name.split(' ')[0]}</p>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PromoBannerSlider;
