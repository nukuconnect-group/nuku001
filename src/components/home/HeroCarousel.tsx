import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight, Award } from "lucide-react";
import { Link } from "react-router-dom";
import awardImage from "@/assets/award-togo-top-impact.jpg";
import heroFarmers from "@/assets/hero-farmers-connected.jpg";
import heroNetwork from "@/assets/hero-network-agriculture.jpg";
import heroOrganic from "@/assets/hero-organic-farm.jpg";
import heroAI from "@/assets/hero-ai-agriculture.jpg";
import heroDrone from "@/assets/hero-drone-agriculture.png";
import heroShopping from "@/assets/hero-online-shopping-woman.jpg";

const slides = [
  {
    image: awardImage,
    title: "NukuConnect sacrée Meilleure Innovation de l'Année 2025",
    subtitle: "🏆 Prix Togo Top Impact",
    description: "NukuConnect a été récompensée comme la meilleure innovation technologique de l'année 2025 lors de la cérémonie Togo Top Impact.",
  },
  {
    image: heroShopping,
    title: "Achetez vos produits agricoles en ligne, où que vous soyez",
    subtitle: "Achat en Ligne",
    description: "Commandez directement auprès des producteurs vérifiés et recevez vos produits frais à domicile.",
    brandOverlay: true,
  },
  {
    image: heroDrone,
    title: "L'agriculture de précision par drone",
    subtitle: "Technologie Avancée",
    description: "Optimisez vos rendements grâce aux drones agricoles et à la surveillance intelligente des cultures.",
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
    description: "Conseils personnalisés grâce à notre assistant NUKUCONNECT IA.",
  }
];

const stats = [
  { value: "10K+", label: "Producteurs" },
  { value: "25K+", label: "Acheteurs" },
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
          {(slide as any).brandOverlay ? (
            <>
              <div className="absolute inset-0 bg-gradient-to-r from-primary/90 via-primary/70 to-primary/40" />
              <div className="absolute inset-0 bg-gradient-to-t from-primary/80 via-transparent to-transparent" />
            </>
          ) : (
            <>
              <div className="absolute inset-0 bg-gradient-to-r from-foreground/95 via-foreground/75 to-foreground/40" />
              <div className="absolute inset-0 bg-gradient-to-t from-foreground/80 via-transparent to-transparent" />
            </>
          )}
        </div>
      ))}

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-3xl">
          {/* Subtitle badge - like reference image */}
          <div className="overflow-hidden mb-2 sm:mb-3">
            {slides.map((slide, index) => (
              <p key={index} className={`text-sm sm:text-base md:text-lg font-medium italic text-accent transition-all duration-700 ${index === currentSlide ? "translate-y-0 opacity-100" : "translate-y-full opacity-0 absolute"}`}>
                {slide.subtitle}
              </p>
            ))}
          </div>

          {/* Title — Bold uppercase like reference */}
          <div className="overflow-hidden mb-2 sm:mb-6">
            {slides.map((slide, index) => (
              <h1 key={index} className={`font-heading text-xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-black text-primary-foreground leading-tight uppercase tracking-tight transition-all duration-700 ${index === currentSlide ? "translate-y-0 opacity-100" : "translate-y-full opacity-0 absolute"}`}>
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

          {/* CTA Buttons — like reference with outlined + filled */}
          <div className="flex flex-row gap-2 sm:gap-3 mb-4 sm:mb-10">
            <Link to="/marketplace">
              <Button variant="heroOutline" size="sm" className="text-xs sm:text-sm sm:h-11 uppercase font-bold tracking-wider border-2 border-primary-foreground text-primary-foreground hover:bg-primary-foreground hover:text-foreground">
                Explorer
              </Button>
            </Link>
            <Link to="/categories">
              <Button variant="hero" size="sm" className="text-xs sm:text-sm sm:h-11 uppercase font-bold tracking-wider bg-accent text-accent-foreground hover:bg-accent/90">
                Catégories
              </Button>
            </Link>
          </div>

          <div className="flex items-center gap-6 sm:gap-10 pt-3 sm:pt-8 border-t border-primary-foreground/20">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="font-heading text-lg sm:text-2xl md:text-3xl font-bold text-accent leading-none">{stat.value}</p>
                <p className="text-[9px] sm:text-xs text-primary-foreground/70 mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Dots */}
      <div className="absolute bottom-3 sm:bottom-8 left-1/2 -translate-x-1/2 z-20 flex gap-2">
        {slides.map((_, index) => (
          <button key={index} onClick={() => goToSlide(index)}
            className={`w-3 h-3 sm:w-3.5 sm:h-3.5 rounded-full transition-all duration-500 border-2 ${index === currentSlide ? "bg-primary border-primary" : "bg-transparent border-primary-foreground/50"}`} />
        ))}
      </div>
    </section>
  );
};

export default HeroCarousel;
