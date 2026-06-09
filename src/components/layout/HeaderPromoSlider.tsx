import { useState, useEffect, useCallback } from "react";
import { Link, useLocation } from "react-router-dom";
import { ChevronLeft, ChevronRight, Leaf, Truck, Sparkles, Users, ShieldCheck, ShoppingBasket, Bot, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import agriWomanSmartphone from "@/assets/header-agri-woman-smartphone.jpg";
import agriFarmersPhones from "@/assets/header-agri-farmers-phones.jpg";
import agriTransactionDelivery from "@/assets/header-agri-transaction-delivery.jpg";
import driverLogistics from "@/assets/header-slide-driver-logistics.jpg";
import aiAssistant from "@/assets/header-slide-ai-assistant.jpg";
import agriDrone from "@/assets/header-slide-agri-drone.jpg";

const slides = [
  {
    eyebrow: "Marketplace agricole",
    pill: "Frais & local",
    title: "Achetez frais, directement auprès des producteurs",
    subtitle: "Produits locaux vérifiés, commandes rapides et paiement sécurisé.",
    cta: { label: "Explorer la marketplace", to: "/marketplace" },
    secondary: { label: "Découvrir", to: "/categories" },
    Icon: Leaf,
    image: agriWomanSmartphone,
  },
  {
    eyebrow: "Réseau NukuConnect",
    pill: "+10K membres",
    title: "Producteurs, fournisseurs et acheteurs réunis",
    subtitle: "Connectez votre production au marché avec une expérience simple et fiable.",
    cta: { label: "Rejoindre le réseau", to: "/producteurs" },
    secondary: { label: "Voir les producteurs", to: "/producteurs" },
    Icon: Users,
    image: agriFarmersPhones,
  },
  {
    eyebrow: "Livraison NukuConnect",
    pill: "Flotte interne",
    title: "Vos commandes livrées par notre flotte interne",
    subtitle: "Livreurs vérifiés, suivi GPS en temps réel et tarifs transparents.",
    cta: { label: "Suivre une livraison", to: "/suivi-livraison" },
    secondary: { label: "Devenir livreur", to: "/devenir-vendeur" },
    Icon: Truck,
    image: driverLogistics,
  },
  {
    eyebrow: "Assistant IA agricole",
    pill: "Nouveau",
    title: "NukuConnect IA accompagne agriculteurs et acheteurs",
    subtitle: "Conseils techniques, recommandations et support intelligent à tout moment.",
    cta: { label: "Discuter avec l'IA", to: "/nuku-ai" },
    secondary: { label: "Voir la FAQ", to: "/faq-nuku-ai" },
    Icon: Bot,
    image: aiAssistant,
  },
  {
    eyebrow: "AgriTech & innovation",
    pill: "Innovation",
    title: "Des drones agricoles pour une production moderne",
    subtitle: "Surveillance des cultures, cartographie et précision au service des producteurs.",
    cta: { label: "Explorer la marketplace", to: "/marketplace" },
    secondary: { label: "Formations", to: "/formations" },
    Icon: Sparkles,
    image: agriDrone,
  },
  {
    eyebrow: "Commerce sécurisé",
    pill: "100% sécurisé",
    title: "Vendez, payez et livrez en toute confiance",
    subtitle: "Des échanges agricoles transparents, de la boutique jusqu'à la livraison.",
    cta: { label: "Vendre mes produits", to: "/devenir-vendeur" },
    secondary: { label: "En savoir plus", to: "/about" },
    Icon: ShieldCheck,
    image: agriTransactionDelivery,
  },
];


const HeaderPromoSlider = () => {
  const [current, setCurrent] = useState(0);
  const [stats, setStats] = useState([
    { value: "—", label: "Producteurs", Icon: Users },
    { value: "—", label: "Acheteurs", Icon: ShoppingBasket },
    { value: "100%", label: "Traçabilité", Icon: ShieldCheck },
  ]);
  const location = useLocation();

  const next = useCallback(() => setCurrent(c => (c + 1) % slides.length), []);
  const prev = useCallback(() => setCurrent(c => (c - 1 + slides.length) % slides.length), []);

  useEffect(() => {
    const timer = setInterval(next, 6000);
    return () => clearInterval(timer);
  }, [next]);

  useEffect(() => {
    let cancelled = false;
    const formatCount = (n: number) => {
      if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1).replace(/\.0$/, "")}K+`;
      if (n >= 100) return `${Math.floor(n / 10) * 10}+`;
      return `${n}`;
    };
    (async () => {
      try {
        const [producersRes, buyersRes] = await Promise.all([
          supabase.from("profiles").select("id", { count: "exact", head: true }).in("user_type", ["producteur", "fournisseur", "producer", "supplier"]),
          supabase.from("profiles").select("id", { count: "exact", head: true }).in("user_type", ["acheteur", "buyer"]),
        ]);
        if (cancelled) return;
        const producers = producersRes.count ?? 0;
        const buyers = buyersRes.count ?? 0;
        setStats([
          { value: formatCount(producers), label: "Producteurs", Icon: Users },
          { value: formatCount(buyers), label: "Acheteurs", Icon: ShoppingBasket },
          { value: "100%", label: "Traçabilité", Icon: ShieldCheck },
        ]);
      } catch { /* silent */ }
    })();
    return () => { cancelled = true; };
  }, []);


  if (location.pathname !== "/") return null;

  return (
    <div className="bg-background pt-2 sm:pt-0 pb-3 sm:pb-4 space-y-3 sm:space-y-0">
      {/* === MOBILE === */}
      <div className="sm:hidden px-3">
        <div className="relative overflow-hidden rounded-xl bg-foreground shadow-xl min-h-[260px]">
          <div className="absolute inset-0">
            {slides.map((slide, i) => (
              <div
                key={slide.title}
                className={`absolute inset-0 transition-all duration-700 ease-out ${
                  i === current ? "opacity-100 translate-x-0" : i < current ? "opacity-0 -translate-x-full" : "opacity-0 translate-x-full"
                }`}
              >
                <img
                  src={slide.image}
                  alt={slide.title}
                  loading={i === 0 ? "eager" : "lazy"}
                  className="absolute inset-0 h-full w-full object-cover"
                />
                {/* Strong overlay for readability */}
                <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/60 to-black/30" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/20" />
                {/* Left accent bar */}
                <div className="absolute left-0 top-4 bottom-12 w-[3px] bg-accent" />

                <div className="relative z-10 h-full flex flex-col justify-center px-4 py-5 pl-5 pr-14">
                  <span className="inline-flex self-start items-center gap-1 text-accent text-[10px] font-extrabold uppercase tracking-[0.18em] mb-2">
                    <Sparkles className="w-2.5 h-2.5" />
                    {slide.eyebrow}
                  </span>
                  <span className="inline-flex self-start items-center bg-accent text-accent-foreground px-2 py-0.5 rounded-sm text-[10px] font-extrabold uppercase mb-2.5 shadow-sm">
                    {slide.pill}
                  </span>
                  <h3 className="font-heading font-black leading-[1.05] text-[22px] text-white drop-shadow-lg">
                    {slide.title}
                  </h3>
                  <p className="text-white/95 text-[12px] mt-2 leading-snug line-clamp-2 max-w-[30ch] drop-shadow-md font-medium">
                    {slide.subtitle}
                  </p>
                  <div className="flex gap-2 mt-3.5">
                    <Link to={slide.cta.to}>
                      <span className="inline-flex items-center gap-1.5 bg-accent text-accent-foreground rounded-full px-3 py-1.5 text-[11px] font-bold shadow-lg hover:shadow-xl transition-shadow">
                        {slide.cta.label}
                        <ArrowRight className="w-3 h-3" />
                      </span>
                    </Link>
                    <Link to={slide.secondary.to}>
                      <span className="inline-flex items-center gap-1 bg-white/15 backdrop-blur-sm border border-white/40 text-white rounded-full px-3 py-1.5 text-[11px] font-semibold">
                        {slide.secondary.label}
                      </span>
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="absolute bottom-3 left-5 flex gap-1.5 z-20">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                aria-label={`Slide ${i + 1}`}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === current ? "w-7 bg-accent" : "w-1.5 bg-white/70"
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* === DESKTOP / TABLET — image background, glass card, accent bar === */}
      <div className="hidden sm:block mx-auto px-3 sm:px-0 md:w-full">
        <div className="relative overflow-hidden rounded-none shadow-2xl bg-foreground">
          {/* Background images with fade */}
          <div className="absolute inset-0">
            {slides.map((slide, i) => (
              <img
                key={slide.title}
                src={slide.image}
                alt={slide.title}
                width={1920}
                height={720}
                className={`absolute inset-0 h-full w-full object-cover object-center transition-all duration-1000 ease-out ${
                  i === current ? "opacity-100 scale-100" : "opacity-0 scale-105"
                }`}
                loading={i === 0 ? "eager" : "lazy"}
              />
            ))}
            {/* Professional dark overlays for guaranteed contrast */}
            <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/55 to-black/20" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent" />
          </div>

          <div className="relative z-10 min-h-[260px] md:min-h-[460px] lg:min-h-[540px] xl:min-h-[600px] flex items-center">
            <div className="px-6 sm:px-10 md:px-14 lg:px-20 py-10 md:py-14 max-w-[680px] md:max-w-[760px] relative">
              {/* Left accent bar */}
              <div className="absolute left-3 sm:left-5 top-10 bottom-10 w-[3px] bg-accent rounded-full" />

              {slides.map((slide, i) => (
                <div
                  key={slide.title}
                  className={`transition-all duration-700 ease-out pl-5 sm:pl-8 ${
                    i === current
                      ? "opacity-100 translate-y-0 relative"
                      : "pointer-events-none absolute inset-0 opacity-0 translate-y-6"
                  }`}
                >
                  <p className="inline-flex items-center gap-2 text-accent text-[11px] sm:text-xs md:text-sm font-extrabold uppercase tracking-[0.22em] leading-none mb-3">
                    <Sparkles className="w-3.5 h-3.5" />
                    {slide.eyebrow}
                  </p>
                  <span className="inline-flex items-center bg-accent text-accent-foreground px-2.5 py-1 rounded-sm text-[11px] sm:text-xs font-extrabold uppercase mb-4 shadow-md">
                    {slide.pill}
                  </span>
                  <h3 className="font-heading text-white font-black leading-[1.02] tracking-tight text-[28px] sm:text-4xl md:text-5xl lg:text-[56px] xl:text-[64px] drop-shadow-2xl">
                    {slide.title}
                  </h3>
                  <p className="text-white/95 text-sm sm:text-base md:text-lg mt-4 md:mt-5 max-w-[44ch] leading-relaxed drop-shadow-md font-medium">
                    {slide.subtitle}
                  </p>
                  <div className="flex flex-wrap items-center gap-3 mt-6 md:mt-7">
                    <Link to={slide.cta.to}>
                      <span className="inline-flex items-center gap-2 bg-accent text-accent-foreground rounded-full pl-5 pr-2 py-2 text-sm font-bold shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all">
                        {slide.cta.label}
                        <span className="w-7 h-7 rounded-full bg-accent-foreground/15 flex items-center justify-center">
                          <ArrowRight className="w-3.5 h-3.5" />
                        </span>
                      </span>
                    </Link>
                    <Link to={slide.secondary.to}>
                      <span className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/50 text-white rounded-full px-5 py-2 text-sm font-semibold hover:bg-white/20 transition-colors">
                        {slide.secondary.label}
                      </span>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Arrows */}
          <button
            onClick={prev}
            aria-label="Précédent"
            className="hidden md:flex absolute left-4 top-1/2 -translate-y-1/2 w-11 h-11 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 border border-white/30 backdrop-blur text-white transition-colors shadow-lg z-20"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={next}
            aria-label="Suivant"
            className="hidden md:flex absolute right-4 top-1/2 -translate-y-1/2 w-11 h-11 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 border border-white/30 backdrop-blur text-white transition-colors shadow-lg z-20"
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          {/* Dots */}
          <div className="absolute bottom-5 left-1/2 -translate-x-1/2 sm:left-auto sm:right-8 sm:translate-x-0 sm:bottom-6 flex gap-2 z-20">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                aria-label={`Slide ${i + 1}`}
                className={`h-2 rounded-full transition-all duration-300 ${
                  i === current
                    ? "w-8 bg-accent"
                    : "w-2 bg-white/60 hover:bg-white/90"
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Stats bar — mobile uniquement */}
      <div className="md:hidden mx-auto px-3 max-w-6xl">
        <div className="grid grid-cols-3 bg-card border border-border rounded-none shadow-sm overflow-hidden">
          {stats.map(({ value, label, Icon }) => (
            <div key={label} className="flex items-center justify-center gap-1.5 px-1.5 py-3 border-r border-border last:border-r-0 min-w-0">
              <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center bg-primary/10 text-primary rounded-none">
                <Icon className="h-3.5 w-3.5" />
              </span>
              <span className="min-w-0 leading-none">
                <span className="block font-heading text-foreground font-black text-sm">{value}</span>
                <span className="block text-[9px] text-muted-foreground truncate mt-1">{label}</span>
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default HeaderPromoSlider;
