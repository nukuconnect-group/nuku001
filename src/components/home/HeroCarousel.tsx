import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";

const slides = [
  {
    image: "https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=1920&q=80",
    title: "Connectez votre production agricole au monde entier",
    subtitle: "Produits Frais",
    description: "NUKUCONNECT révolutionne le commerce agricole en Afrique. Vendez vos produits, trouvez des acheteurs fiables."
  },
  {
    image: "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=1920&q=80",
    title: "Agriculture biologique et durable",
    subtitle: "Qualité Certifiée",
    description: "Des produits 100% naturels et certifiés bio, directement des champs à votre table."
  },
  {
    image: "https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=1920&q=80",
    title: "Soutenez les producteurs locaux",
    subtitle: "Commerce Équitable",
    description: "Achetez directement auprès des agriculteurs et contribuez au développement rural."
  },
  {
    image: "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=1920&q=80",
    title: "L'IA au service de l'agriculture",
    subtitle: "Innovation Agricole",
    description: "Bénéficiez de conseils personnalisés grâce à notre assistant intelligent NUKU AI."
  }
];

const stats = [
  { value: "10K+", label: "Producteurs" },
  { value: "5K+", label: "Acheteurs" },
  { value: "50K+", label: "Transactions" },
];

const HeroCarousel = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  useEffect(() => {
    if (!isAutoPlaying) return;
    
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 6000);
    
    return () => clearInterval(timer);
  }, [isAutoPlaying]);

  const goToSlide = (index: number) => {
    setCurrentSlide(index);
    setIsAutoPlaying(false);
    setTimeout(() => setIsAutoPlaying(true), 10000);
  };

  return (
    <section className="relative min-h-[85vh] sm:min-h-screen flex items-center pt-0 overflow-hidden">
      {/* Background Slides */}
      {slides.map((slide, index) => (
        <div
          key={index}
          className={`absolute inset-0 transition-all duration-1000 ease-in-out ${
            index === currentSlide ? "opacity-100 scale-100" : "opacity-0 scale-105"
          }`}
        >
          <img
            src={slide.image}
            alt={slide.subtitle}
            className="w-full h-full object-cover"
          />
          {/* Overlays */}
          <div className="absolute inset-0 bg-gradient-to-r from-foreground/95 via-foreground/75 to-foreground/40" />
          <div className="absolute inset-0 bg-gradient-to-t from-foreground/80 via-transparent to-transparent" />
        </div>
      ))}

      {/* Animated Connection Graphics */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Floating particles */}
        <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-primary/50 rounded-full animate-float" />
        <div className="absolute top-1/3 right-1/4 w-3 h-3 bg-accent/60 rounded-full animate-float" style={{ animationDelay: "1s" }} />
        <div className="absolute bottom-1/3 left-1/3 w-2 h-2 bg-primary/40 rounded-full animate-float" style={{ animationDelay: "2s" }} />
        <div className="absolute top-1/2 right-1/3 w-2 h-2 bg-accent/50 rounded-full animate-float" style={{ animationDelay: "1.5s" }} />
        <div className="absolute bottom-1/4 right-1/4 w-3 h-3 bg-primary/30 rounded-full animate-float" style={{ animationDelay: "0.5s" }} />
        
        {/* Connection lines */}
        <svg className="absolute inset-0 w-full h-full opacity-20">
          <defs>
            <linearGradient id="heroLineGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0" />
              <stop offset="50%" stopColor="hsl(var(--primary))" stopOpacity="0.6" />
              <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path
            d="M0,300 Q400,200 800,300 T1600,300"
            fill="none"
            stroke="url(#heroLineGradient)"
            strokeWidth="2"
            className="animate-pulse"
          />
          <path
            d="M0,500 Q300,600 600,500 T1200,500"
            fill="none"
            stroke="url(#heroLineGradient)"
            strokeWidth="1.5"
            className="animate-pulse"
            style={{ animationDelay: "0.5s" }}
          />
        </svg>

        {/* Grid pattern */}
        <div 
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, hsl(var(--primary)) 1px, transparent 0)`,
            backgroundSize: '50px 50px'
          }}
        />
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-3xl">
          {/* Dynamic Badge */}
          <div className="overflow-hidden h-8 sm:h-10 mb-4 sm:mb-6">
            {slides.map((slide, index) => (
              <div
                key={index}
                className={`transition-all duration-700 transform ${
                  index === currentSlide 
                    ? "translate-y-0 opacity-100" 
                    : "translate-y-full opacity-0 absolute"
                }`}
              >
                <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-primary/20 backdrop-blur-sm border border-primary/30">
                  <Sparkles className="w-3 h-3 sm:w-4 sm:h-4 text-accent" />
                  <span className="text-xs sm:text-sm font-medium text-primary-foreground">
                    {slide.subtitle}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Dynamic Title */}
          <div className="overflow-hidden mb-4 sm:mb-6">
            {slides.map((slide, index) => (
              <h1
                key={index}
                className={`font-heading text-2xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold text-primary-foreground leading-tight transition-all duration-700 ${
                  index === currentSlide 
                    ? "translate-y-0 opacity-100" 
                    : "translate-y-full opacity-0 absolute"
                }`}
              >
                {slide.title.split(" ").map((word, i) => (
                  <span key={i}>
                    {word === "agricole" || word === "biologique" || word === "locaux" || word === "l'agriculture" ? (
                      <span className="text-primary">{word}</span>
                    ) : (
                      word
                    )}
                    {" "}
                  </span>
                ))}
              </h1>
            ))}
          </div>

          {/* Dynamic Description */}
          <div className="overflow-hidden mb-6 sm:mb-8 h-12 sm:h-16">
            {slides.map((slide, index) => (
              <p
                key={index}
                className={`text-sm sm:text-lg md:text-xl text-primary-foreground/80 max-w-2xl transition-all duration-700 ${
                  index === currentSlide 
                    ? "translate-y-0 opacity-100" 
                    : "translate-y-full opacity-0 absolute"
                }`}
              >
                {slide.description}
              </p>
            ))}
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-8 sm:mb-12">
            <Link to="/marketplace">
              <Button variant="hero" size="lg" className="text-sm sm:text-base w-full sm:w-auto">
                Commencer maintenant
                <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
              </Button>
            </Link>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 sm:gap-8 pt-6 sm:pt-8 border-t border-primary-foreground/20">
            {stats.map((stat) => (
              <div key={stat.label}>
                <p className="font-heading text-xl sm:text-3xl md:text-4xl font-bold text-accent">{stat.value}</p>
                <p className="text-[10px] sm:text-sm text-primary-foreground/70">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Slide Indicators */}
      <div className="absolute bottom-6 sm:bottom-8 left-1/2 -translate-x-1/2 z-20 flex gap-2 sm:gap-3">
        {slides.map((_, index) => (
          <button
            key={index}
            onClick={() => goToSlide(index)}
            className={`h-1.5 sm:h-2 rounded-full transition-all duration-500 ${
              index === currentSlide 
                ? "w-8 sm:w-10 bg-primary" 
                : "w-1.5 sm:w-2 bg-primary-foreground/40 hover:bg-primary-foreground/60"
            }`}
          />
        ))}
      </div>

      {/* Progress Bar */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-primary-foreground/10">
        <div 
          className="h-full bg-primary transition-all duration-300 ease-linear"
          style={{ 
            width: `${((currentSlide + 1) / slides.length) * 100}%`,
          }}
        />
      </div>
    </section>
  );
};

export default HeroCarousel;
