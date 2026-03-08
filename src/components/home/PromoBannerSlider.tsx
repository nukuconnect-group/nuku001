import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { Users, Leaf, TrendingUp } from "lucide-react";
import { useProducts } from "@/hooks/useProducts";
import { useLanguage } from "@/contexts/LanguageContext";
import { Badge } from "@/components/ui/badge";
import { products as mockProducts } from "@/data/marketplace";
import { Badge } from "@/components/ui/badge";
import promoBanner1 from "@/assets/promo-banner-1.jpg";
import promoBanner2 from "@/assets/promo-banner-2.jpg";
import promoBanner3 from "@/assets/promo-banner-3.jpg";

const banners = [
  {
    image: promoBanner1,
    title: "Livraison gratuite",
    subtitle: "Sur votre première commande",
    code: "NUKU2026",
    cta: "Commander",
    link: "/marketplace",
  },
  {
    image: promoBanner2,
    title: "Produits de saison",
    subtitle: "Jusqu'à -40%",
    cta: "Voir les offres",
    link: "/marketplace?category=agriculture",
  },
  {
    image: promoBanner3,
    title: "Devenez vendeur",
    subtitle: "Rejoignez la communauté",
    cta: "S'inscrire",
    link: "/auth",
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

  // Use DB products, fallback to mock products so sections always show
  const recentProducts = useMemo(() => {
    const db = products || [];
    return db.length > 0 ? db.slice(0, 8) : mockProducts.slice(0, 8);
  }, [products]);

  return (
    <div className="md:hidden">
      {/* Banner Slider */}
      <div className="px-3 pt-2 pb-1">
        <div className="relative overflow-hidden rounded-2xl shadow-lg">
          <div
            className="flex transition-transform duration-500 ease-out"
            style={{ transform: `translateX(-${current * 100}%)` }}
          >
             {banners.map((banner, i) => (
              <Link key={i} to={banner.link} className="w-full flex-shrink-0 block">
                <div className="relative h-48 sm:h-56">
                  <img
                    src={banner.image}
                    alt={banner.title}
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                  {/* Light gradient only at bottom for text */}
                  <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/60 to-transparent" />
                  {/* Text pinned to bottom */}
                  <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-5">
                    <h3 className="text-white font-heading font-extrabold text-lg sm:text-xl leading-tight drop-shadow-lg">
                      {banner.title}
                    </h3>
                    <p className="text-white/90 text-xs sm:text-sm mt-0.5 drop-shadow-md">
                      {banner.subtitle}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="inline-block bg-white text-foreground font-bold text-[11px] sm:text-xs px-4 py-1.5 rounded-full shadow-sm">
                        {banner.cta}
                      </span>
                      {banner.code && (
                        <span className="inline-block bg-white/20 backdrop-blur-sm text-white font-bold text-[11px] px-3 py-1.5 rounded-full border border-white/30 tracking-wider">
                          {banner.code}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
          {/* Dots only - no arrows */}
          <div className="absolute bottom-2 right-4 flex gap-1.5">
            {banners.map((_, i) => (
              <button key={i} onClick={(e) => { e.preventDefault(); setCurrent(i); }}
                className={`rounded-full transition-all ${i === current ? "w-5 h-1.5 bg-white" : "w-1.5 h-1.5 bg-white/50"}`} />
            ))}
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="px-3 py-2">
        <div className="grid grid-cols-3 gap-2">
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-primary/5 border border-primary/10">
            <Users className="w-4 h-4 text-primary flex-shrink-0" />
            <div>
              <p className="text-xs font-bold text-foreground">10K+</p>
              <p className="text-[9px] text-muted-foreground">Producteurs</p>
            </div>
          </div>
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-primary/5 border border-primary/10">
            <Leaf className="w-4 h-4 text-primary flex-shrink-0" />
            <div>
              <p className="text-xs font-bold text-foreground">Bio</p>
              <p className="text-[9px] text-muted-foreground">Certifié</p>
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

      {/* Recent Products */}
      {recentProducts.length > 0 && (
        <div className="px-3 py-2">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-heading text-sm font-bold text-foreground">Publications récentes</h3>
            <Link to="/marketplace" className="text-[10px] text-primary font-medium">Tout voir →</Link>
          </div>
          <div className="flex gap-2.5 overflow-x-auto pb-2 -mx-3 px-3 scrollbar-hide">
            {recentProducts.map((product) => (
              <Link key={product.id} to={`/produit/${product.id}`} className="flex-shrink-0 w-32 group">
                <div className="relative h-28 rounded-xl overflow-hidden bg-muted mb-1.5">
                  <img src={product.image} alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  {product.isOrganic && (
                    <Badge className="absolute top-1.5 left-1.5 bg-primary text-primary-foreground text-[8px] px-1.5 py-0.5 h-auto">
                      <Leaf className="w-2.5 h-2.5 mr-0.5" />BIO
                    </Badge>
                  )}
                </div>
                <p className="text-[11px] font-medium text-foreground line-clamp-1">{product.name}</p>
                <p className="text-[10px] font-bold text-primary">{formatPrice(product.price)}/{product.unit}</p>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Active Farmers */}
      {recentProducts.length > 0 && (
        <div className="px-3 py-2">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-heading text-sm font-bold text-foreground flex items-center gap-1.5">
              <Users className="w-4 h-4 text-primary" />Agriculteurs actifs
            </h3>
            <Link to="/producteurs" className="text-[10px] text-primary font-medium">Voir tous →</Link>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-3 px-3 scrollbar-hide">
            {Array.from(new Map(recentProducts.map(p => [p.producer.id, p.producer])).values()).slice(0, 6).map((producer) => (
              <Link key={producer.id} to={`/producteurs/${producer.name}`}
                className="flex-shrink-0 flex flex-col items-center gap-1 w-16 group">
                <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-primary/20 group-hover:border-primary transition-colors">
                  <img src={producer.avatar} alt={producer.name} className="w-full h-full object-cover" />
                </div>
                <p className="text-[9px] font-medium text-foreground text-center line-clamp-1 w-full">{producer.name.split(' ')[0]}</p>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default PromoBannerSlider;
