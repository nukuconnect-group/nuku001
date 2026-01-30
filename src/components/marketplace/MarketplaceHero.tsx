import { useState, useEffect } from "react";
import { Search, TrendingUp, Users, Package, ArrowRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface MarketplaceHeroProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
}

const slides = [
  {
    image: "https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=1920&q=80",
    title: "Produits Frais",
    subtitle: "Directement des champs"
  },
  {
    image: "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=1920&q=80",
    title: "Agriculture Bio",
    subtitle: "Qualité certifiée"
  },
  {
    image: "https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=1920&q=80",
    title: "Récoltes Locales",
    subtitle: "Soutenir nos producteurs"
  },
  {
    image: "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=1920&q=80",
    title: "Marchés Connectés",
    subtitle: "L'avenir de l'agriculture"
  }
];

const stats = [
  { icon: Package, value: "2,500+", label: "Produits" },
  { icon: Users, value: "850+", label: "Producteurs" },
  { icon: TrendingUp, value: "15K+", label: "Transactions" }
];

const MarketplaceHero = ({ searchQuery, onSearchChange }: MarketplaceHeroProps) => {
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  return (
    <section className="relative pt-20 lg:pt-24 pb-8 lg:pb-12 overflow-hidden min-h-[400px] lg:min-h-[500px]">
      {/* Background Slides */}
      {slides.map((slide, index) => (
        <div
          key={index}
          className={`absolute inset-0 transition-opacity duration-1000 ${
            index === currentSlide ? "opacity-100" : "opacity-0"
          }`}
        >
          <img
            src={slide.image}
            alt={slide.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-background/90 via-background/70 to-background" />
        </div>
      ))}

      {/* Animated Connection Graphics */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Floating dots */}
        <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-primary/40 rounded-full animate-pulse" />
        <div className="absolute top-1/3 right-1/4 w-3 h-3 bg-accent/50 rounded-full animate-pulse delay-300" />
        <div className="absolute bottom-1/3 left-1/3 w-2 h-2 bg-primary/30 rounded-full animate-pulse delay-500" />
        <div className="absolute top-1/2 right-1/3 w-2 h-2 bg-accent/40 rounded-full animate-pulse delay-700" />
        
        {/* Connection lines */}
        <svg className="absolute inset-0 w-full h-full opacity-20">
          <defs>
            <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0" />
              <stop offset="50%" stopColor="hsl(var(--primary))" stopOpacity="0.5" />
              <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path
            d="M0,200 Q400,100 800,200 T1600,200"
            fill="none"
            stroke="url(#lineGradient)"
            strokeWidth="2"
            className="animate-pulse"
          />
          <path
            d="M0,300 Q300,400 600,300 T1200,300"
            fill="none"
            stroke="url(#lineGradient)"
            strokeWidth="1.5"
            className="animate-pulse delay-500"
          />
        </svg>

        {/* Grid pattern */}
        <div 
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, hsl(var(--primary)) 1px, transparent 0)`,
            backgroundSize: '40px 40px'
          }}
        />
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          {/* Slide Title */}
          <div className="mb-4 overflow-hidden h-8">
            {slides.map((slide, index) => (
              <div
                key={index}
                className={`transition-all duration-700 transform ${
                  index === currentSlide 
                    ? "translate-y-0 opacity-100" 
                    : "translate-y-full opacity-0 absolute"
                }`}
              >
                <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium border border-primary/20">
                  <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                  {slide.subtitle}
                </span>
              </div>
            ))}
          </div>

          <h1 className="font-heading text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold text-foreground mb-4">
            Marketplace{" "}
            <span className="text-gradient-primary">Agricole</span>
          </h1>
          
          <p className="text-base lg:text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            Découvrez des milliers de produits agricoles de qualité directement des producteurs locaux
          </p>

          {/* Search Bar */}
          <div className="flex flex-col sm:flex-row gap-3 max-w-2xl mx-auto mb-8">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Rechercher un produit, producteur..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-12 h-12 lg:h-14 text-base bg-card/80 backdrop-blur-sm border-border/50"
              />
            </div>
            <Button variant="hero" size="lg" className="h-12 lg:h-14 px-8">
              Rechercher
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>

          {/* Stats */}
          <div className="flex flex-wrap justify-center gap-6 lg:gap-12">
            {stats.map((stat, index) => (
              <div 
                key={index} 
                className="flex items-center gap-3 px-4 py-2 rounded-xl bg-card/60 backdrop-blur-sm border border-border/30"
              >
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <stat.icon className="w-5 h-5 text-primary" />
                </div>
                <div className="text-left">
                  <div className="font-heading font-bold text-lg text-foreground">{stat.value}</div>
                  <div className="text-xs text-muted-foreground">{stat.label}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Slide Indicators */}
          <div className="flex justify-center gap-2 mt-8">
            {slides.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentSlide(index)}
                className={`h-2 rounded-full transition-all duration-300 ${
                  index === currentSlide 
                    ? "w-8 bg-primary" 
                    : "w-2 bg-muted-foreground/30 hover:bg-muted-foreground/50"
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default MarketplaceHero;
