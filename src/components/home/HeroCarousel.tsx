import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles, Award } from "lucide-react";
import { Link } from "react-router-dom";
import awardImage from "@/assets/award-togo-top-impact.jpg";
import heroFarmers from "@/assets/hero-farmers-connected.jpg";
import heroNetwork from "@/assets/hero-network-agriculture.jpg";
import heroOrganic from "@/assets/hero-organic-farm.jpg";
import heroAI from "@/assets/hero-ai-agriculture.jpg";

const slides = [
  {
    image: awardImage,
    title: "NukuConnect sacrée Meilleure Innovation de l'Année 2025",
    subtitle: "🏆 Prix Togo Top Impact",
    description: "NukuConnect a été récompensée comme la meilleure innovation technologique de l'année 2025 lors de la cérémonie Togo Top Impact.",
    isAward: true,
  },
  {
    image: heroFarmers,
    title: "Connectez votre production agricole au monde entier",
    subtitle: "Agriculture Moderne",
    description: "NUKUCONNECT révolutionne le commerce agricole en Afrique avec des technologies de pointe.",
  },
  {
    image: heroNetwork,
    title: "Un réseau agricole interconnecté",
    subtitle: "Réseau Digital",
    description: "Agriculteurs, acheteurs et fournisseurs connectés sur une seule plateforme.",
  },
  {
    image: heroOrganic,
    title: "Agriculture biologique et durable",
    subtitle: "Qualité Certifiée",
    description: "Des produits naturels et certifiés bio, des champs à votre table.",
  },
  {
    image: heroAI,
    title: "L'IA au service de l'agriculture",
    subtitle: "Innovation Agricole",
    description: "Conseils personnalisés grâce à notre assistant NUKU AI.",
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
    <section className="relative aspect-[4/3] sm:aspect-[16/9] lg:min-h-[80vh] lg:aspect-auto flex items-center overflow-hidden rounded-none sm:rounded-none">
      {slides.map((slide, index) => (
        <div key={index} className={`absolute inset-0 transition-all duration-1000 ease-in-out ${index === currentSlide ? "opacity-100 scale-100" : "opacity-0 scale-105"}`}>
          <img src={slide.image} alt={slide.subtitle} className="w-full h-full object-cover" loading={index === 0 ? "eager" : "lazy"} />
          <div className="absolute inset-0 bg-gradient-to-r from-foreground/95 via-foreground/75 to-foreground/40" />
          <div className="absolute inset-0 bg-gradient-to-t from-foreground/80 via-transparent to-transparent" />
        </div>
      ))}

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-3xl">
          <div className="overflow-hidden mb-2 sm:mb-6">
            {slides.map((slide, index) => (
              <h1 key={index} className={`font-heading text-lg sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold text-primary-foreground leading-tight transition-all duration-700 ${index === currentSlide ? "translate-y-0 opacity-100" : "translate-y-full opacity-0 absolute"}`}>
                {slide.title}
              </h1>
            ))}
          </div>

          <div className="overflow-hidden mb-3 sm:mb-8 h-8 sm:h-14">
            {slides.map((slide, index) => (
              <p key={index} className={`text-[11px] sm:text-base md:text-lg text-primary-foreground/80 max-w-2xl transition-all duration-700 ${index === currentSlide ? "translate-y-0 opacity-100" : "translate-y-full opacity-0 absolute"}`}>
                {slide.description}
              </p>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mb-4 sm:mb-10">
            <Link to="/marketplace">
              <Button variant="hero" size="sm" className="text-xs sm:text-base sm:h-11 w-full sm:w-auto">
                Commencer maintenant <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-3 gap-3 sm:gap-8 pt-3 sm:pt-8 border-t border-primary-foreground/20">
            {stats.map((stat) => (
              <div key={stat.label}>
                <p className="font-heading text-base sm:text-2xl md:text-3xl font-bold text-accent">{stat.value}</p>
                <p className="text-[9px] sm:text-xs text-primary-foreground/70">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="absolute bottom-3 sm:bottom-8 left-1/2 -translate-x-1/2 z-20 flex gap-2">
        {slides.map((_, index) => (
          <button key={index} onClick={() => goToSlide(index)}
            className={`h-1.5 rounded-full transition-all duration-500 ${index === currentSlide ? "w-8 bg-primary" : "w-1.5 bg-primary-foreground/40"}`} />
        ))}
      </div>
    </section>
  );
};

export default HeroCarousel;
