import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";

const slides = [
  {
    image: "https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=1920&q=80",
    title: "Connectez votre production agricole au monde entier",
    subtitle: "Produits Frais",
    description: "NUKUCONNECT révolutionne le commerce agricole en Afrique."
  },
  {
    image: "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=1920&q=80",
    title: "Agriculture biologique et durable",
    subtitle: "Qualité Certifiée",
    description: "Des produits naturels et certifiés bio, des champs à votre table."
  },
  {
    image: "https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=1920&q=80",
    title: "Soutenez les producteurs locaux",
    subtitle: "Commerce Équitable",
    description: "Achetez directement auprès des agriculteurs."
  },
  {
    image: "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=1920&q=80",
    title: "L'IA au service de l'agriculture",
    subtitle: "Innovation Agricole",
    description: "Conseils personnalisés grâce à notre assistant NUKU AI."
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
    <section className="relative min-h-[60vh] sm:min-h-[75vh] lg:min-h-screen flex items-center overflow-hidden">
      {slides.map((slide, index) => (
        <div key={index} className={`absolute inset-0 transition-all duration-1000 ease-in-out ${index === currentSlide ? "opacity-100 scale-100" : "opacity-0 scale-105"}`}>
          <img src={slide.image} alt={slide.subtitle} className="w-full h-full object-cover" loading={index === 0 ? "eager" : "lazy"} />
          <div className="absolute inset-0 bg-gradient-to-r from-foreground/95 via-foreground/75 to-foreground/40" />
          <div className="absolute inset-0 bg-gradient-to-t from-foreground/80 via-transparent to-transparent" />
        </div>
      ))}

      <div className="container mx-auto px-4 relative z-10 py-8 sm:py-0">
        <div className="max-w-3xl">
          <div className="overflow-hidden h-8 sm:h-10 mb-3 sm:mb-6">
            {slides.map((slide, index) => (
              <div key={index} className={`transition-all duration-700 ${index === currentSlide ? "translate-y-0 opacity-100" : "translate-y-full opacity-0 absolute"}`}>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/20 backdrop-blur-sm border border-primary/30">
                  <Sparkles className="w-3 h-3 text-accent" />
                  <span className="text-xs sm:text-sm font-medium text-primary-foreground">{slide.subtitle}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="overflow-hidden mb-3 sm:mb-6">
            {slides.map((slide, index) => (
              <h1 key={index} className={`font-heading text-xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold text-primary-foreground leading-tight transition-all duration-700 ${index === currentSlide ? "translate-y-0 opacity-100" : "translate-y-full opacity-0 absolute"}`}>
                {slide.title}
              </h1>
            ))}
          </div>

          <div className="overflow-hidden mb-4 sm:mb-8 h-10 sm:h-14">
            {slides.map((slide, index) => (
              <p key={index} className={`text-xs sm:text-base md:text-lg text-primary-foreground/80 max-w-2xl transition-all duration-700 ${index === currentSlide ? "translate-y-0 opacity-100" : "translate-y-full opacity-0 absolute"}`}>
                {slide.description}
              </p>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-3 mb-6 sm:mb-10">
            <Link to="/marketplace">
              <Button variant="hero" size="lg" className="text-xs sm:text-base w-full sm:w-auto">
                Commencer maintenant <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-3 gap-4 sm:gap-8 pt-4 sm:pt-8 border-t border-primary-foreground/20">
            {stats.map((stat) => (
              <div key={stat.label}>
                <p className="font-heading text-lg sm:text-2xl md:text-3xl font-bold text-accent">{stat.value}</p>
                <p className="text-[9px] sm:text-xs text-primary-foreground/70">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="absolute bottom-4 sm:bottom-8 left-1/2 -translate-x-1/2 z-20 flex gap-2">
        {slides.map((_, index) => (
          <button key={index} onClick={() => goToSlide(index)}
            className={`h-1.5 rounded-full transition-all duration-500 ${index === currentSlide ? "w-8 bg-primary" : "w-1.5 bg-primary-foreground/40"}`} />
        ))}
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-1 bg-primary-foreground/10">
        <div className="h-full bg-primary transition-all duration-300" style={{ width: `${((currentSlide + 1) / slides.length) * 100}%` }} />
      </div>
    </section>
  );
};

export default HeroCarousel;
