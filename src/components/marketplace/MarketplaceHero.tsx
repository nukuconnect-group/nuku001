import { useState, useEffect } from "react";
import { Search, TrendingUp, Users, Package, ArrowRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { marketplaceCategories } from "@/components/marketplace/CategorySidebar";
import { Link } from "react-router-dom";

interface MarketplaceHeroProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
}

const slides = [
  { image: "https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=1920&q=80", title: "Produits Frais", subtitle: "Directement des champs" },
  { image: "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=1920&q=80", title: "Agriculture Bio", subtitle: "Qualité certifiée" },
  { image: "https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=1920&q=80", title: "Récoltes Locales", subtitle: "Soutenir nos producteurs" },
];

const stats = [
  { icon: Package, value: "2,500+", label: "Produits" },
  { icon: Users, value: "850+", label: "Producteurs" },
  { icon: TrendingUp, value: "15K+", label: "Transactions" }
];

const MarketplaceHero = ({ searchQuery, onSearchChange }: MarketplaceHeroProps) => {
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setCurrentSlide((prev) => (prev + 1) % slides.length), 5000);
    return () => clearInterval(timer);
  }, []);

  // Only show main sector categories (not sub-categories like cereales, fruits etc)
  const mainCategories = marketplaceCategories.filter(c => 
    ["agriculture", "elevage", "pisciculture", "aquaculture", "agribusiness", "foresterie"].includes(c.id)
  );

  return (
    <section className="relative py-6 sm:py-8 lg:py-12 overflow-hidden text-white" style={{ background: "linear-gradient(135deg, #1c98ed 0%, #006b00 100%)" }}>
      {/* Background */}
      {slides.map((slide, index) => (
        <div key={index} className={`absolute inset-0 transition-opacity duration-1000 ${index === currentSlide ? "opacity-20" : "opacity-0"}`}>
          <img src={slide.image} alt={slide.title} className="w-full h-full object-cover" />
        </div>
      ))}
      <div className="absolute inset-0 bg-black/20" />

      <div className="container mx-auto px-3 sm:px-4 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="font-heading text-xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-3 sm:mb-4">
            Marketplace <span className="text-yellow-300">Agricole</span>
          </h1>
          
          <p className="text-xs sm:text-base text-white/80 mb-4 sm:mb-6 max-w-2xl mx-auto">
            Découvrez des milliers de produits agricoles de qualité
          </p>

          {/* Search Bar */}
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 max-w-2xl mx-auto mb-5 sm:mb-8">
            <div className="relative flex-1">
              <Search className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground" />
              <Input type="text" placeholder="Rechercher un produit, producteur..."
                value={searchQuery} onChange={(e) => onSearchChange(e.target.value)}
                className="pl-9 sm:pl-12 h-10 sm:h-12 lg:h-14 text-xs sm:text-base bg-white/90 backdrop-blur-sm border-white/30 text-foreground" />
            </div>
            <Button variant="hero" size="lg" className="h-10 sm:h-12 lg:h-14 px-6 sm:px-8 text-xs sm:text-sm bg-white text-primary hover:bg-white/90">
              Rechercher <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 ml-1.5" />
            </Button>
          </div>

          {/* Category Icons - 3 per row on mobile */}
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 sm:gap-3 mb-5 sm:mb-8">
            {mainCategories.map((cat) => (
              <Link key={cat.id} to={`/marketplace?category=${cat.id}`}
                className="flex flex-col items-center gap-1.5 p-2 sm:p-3 rounded-xl bg-card/60 backdrop-blur-sm border border-border/30 hover:bg-card hover:shadow-soft transition-all group">
                <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                  <cat.icon className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                </div>
                <span className="text-[10px] sm:text-xs font-medium text-foreground text-center leading-tight">{cat.name}</span>
              </Link>
            ))}
          </div>

          {/* Stats */}
          <div className="flex flex-wrap justify-center gap-3 sm:gap-6">
            {stats.map((stat, index) => (
              <div key={index} className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl bg-card/60 backdrop-blur-sm border border-border/30">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <stat.icon className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                </div>
                <div className="text-left">
                  <div className="font-heading font-bold text-sm sm:text-lg text-foreground">{stat.value}</div>
                  <div className="text-[9px] sm:text-xs text-muted-foreground">{stat.label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default MarketplaceHero;
