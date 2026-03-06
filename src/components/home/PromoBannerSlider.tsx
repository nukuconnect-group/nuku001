import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight, ShoppingCart, Users, Leaf, TrendingUp } from "lucide-react";
import { useProducts } from "@/hooks/useProducts";
import { useLanguage } from "@/contexts/LanguageContext";
import { Badge } from "@/components/ui/badge";
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
  const { data: products } = useProducts();
  const { formatPrice } = useLanguage();

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % banners.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const recentProducts = products?.slice(0, 8) || [];

  return (
    <div className="md:hidden">
      {/* Promo Banner Slider */}
      <div className="px-3 py-2">
        <div className="relative overflow-hidden rounded-xl">
          <div
            className="flex transition-transform duration-500 ease-out"
            style={{ transform: `translateX(-${current * 100}%)` }}
          >
            {banners.map((banner, i) => (
              <Link key={i} to={banner.link} className="w-full flex-shrink-0 relative">
                <div className={`relative h-36 sm:h-44 rounded-xl overflow-hidden bg-gradient-to-r ${banner.gradient}`}>
                  <img src={banner.image} alt={banner.title}
                    className="absolute inset-0 w-full h-full object-cover mix-blend-overlay opacity-60" />
                  <div className="relative z-10 h-full flex flex-col justify-center px-4 sm:px-6">
                    <h3 className="text-white font-heading font-bold text-base sm:text-lg leading-tight">{banner.title}</h3>
                    <p className="text-white/90 text-[11px] sm:text-xs mt-0.5">{banner.subtitle}</p>
                    {banner.code && (
                      <div className="mt-2 inline-flex items-center gap-1.5 bg-white/20 backdrop-blur-sm rounded-lg px-2.5 py-1 w-fit">
                        <span className="text-white font-bold text-xs sm:text-sm tracking-wider">{banner.code}</span>
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
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
            {banners.map((_, i) => (
              <button key={i} onClick={() => setCurrent(i)}
                className={`h-1.5 rounded-full transition-all ${i === current ? "w-4 bg-white" : "w-1.5 bg-white/50"}`} />
            ))}
          </div>
          <button onClick={() => setCurrent((prev) => (prev - 1 + banners.length) % banners.length)}
            className="absolute left-1 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-black/20 backdrop-blur-sm flex items-center justify-center text-white">
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => setCurrent((prev) => (prev + 1) % banners.length)}
            className="absolute right-1 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-black/20 backdrop-blur-sm flex items-center justify-center text-white">
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
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
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-accent/5 border border-accent/10">
            <Leaf className="w-4 h-4 text-green-600 flex-shrink-0" />
            <div>
              <p className="text-xs font-bold text-foreground">Bio</p>
              <p className="text-[9px] text-muted-foreground">Certifié</p>
            </div>
          </div>
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-blue-50 dark:bg-blue-500/5 border border-blue-200 dark:border-blue-500/10">
            <TrendingUp className="w-4 h-4 text-blue-600 flex-shrink-0" />
            <div>
              <p className="text-xs font-bold text-foreground">50K+</p>
              <p className="text-[9px] text-muted-foreground">Ventes</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Products Horizontal Scroll */}
      {recentProducts.length > 0 && (
        <div className="px-3 py-2">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-heading text-sm font-bold text-foreground">Publications récentes</h3>
            <Link to="/marketplace" className="text-[10px] text-primary font-medium">Tout voir →</Link>
          </div>
          <div className="flex gap-2.5 overflow-x-auto pb-2 -mx-3 px-3 scrollbar-hide">
            {recentProducts.map((product) => (
              <Link key={product.id} to={`/produit/${product.id}`}
                className="flex-shrink-0 w-32 group">
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
                <p className="text-[9px] text-muted-foreground line-clamp-1">{product.producer.name}</p>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Farmers Interconnection */}
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
                  <img src={producer.avatar} alt={producer.name}
                    className="w-full h-full object-cover" />
                </div>
                <p className="text-[9px] font-medium text-foreground text-center line-clamp-1 w-full">{producer.name.split(' ')[0]}</p>
                {producer.verified && (
                  <Badge variant="secondary" className="text-[7px] px-1 py-0 h-3">Vérifié</Badge>
                )}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default PromoBannerSlider;
