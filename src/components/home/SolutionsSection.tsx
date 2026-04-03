import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Truck, Globe, Handshake, GraduationCap, ArrowRight, Bot, BarChart3, ShieldCheck, Leaf } from "lucide-react";

const solutions = [
  {
    icon: Truck,
    title: "Livraison rapide & traçable",
    description: "Recevez vos produits agricoles certifiés directement chez vous avec suivi en temps réel et garantie de traçabilité complète.",
    cta: "Commander maintenant",
    link: "/marketplace",
    gradient: "from-primary/10 to-primary/5",
    iconBg: "bg-primary/15",
    iconColor: "text-primary",
    borderColor: "border-primary/20 hover:border-primary/40",
  },
  {
    icon: Globe,
    title: "Marchés locaux & internationaux",
    description: "Accédez à un réseau de producteurs et d'acheteurs à travers l'Afrique de l'Ouest. Vendez et achetez en toute sécurité.",
    cta: "Explorer le marché",
    link: "/marketplace",
    gradient: "from-accent/10 to-accent/5",
    iconBg: "bg-accent/15",
    iconColor: "text-accent",
    borderColor: "border-accent/20 hover:border-accent/40",
  },
  {
    icon: Handshake,
    title: "Mise en relation pro",
    description: "Trouvez des producteurs, fournisseurs, experts et partenaires qualifiés pour développer votre activité agricole.",
    cta: "Devenir partenaire",
    link: "/devenir-vendeur",
    gradient: "from-primary/10 to-primary/5",
    iconBg: "bg-primary/15",
    iconColor: "text-primary",
    borderColor: "border-primary/20 hover:border-primary/40",
  },
  {
    icon: GraduationCap,
    title: "Formations spécialisées",
    description: "Accédez à des programmes de formation en aquaculture, agriculture et agrobusiness pour booster vos compétences.",
    cta: "Voir les formations",
    link: "/formations",
    gradient: "from-accent/10 to-accent/5",
    iconBg: "bg-accent/15",
    iconColor: "text-accent",
    borderColor: "border-accent/20 hover:border-accent/40",
  },
];

const highlights = [
  { icon: Bot, label: "IA intégrée", link: "/nuku-ai" },
  { icon: BarChart3, label: "Tableau de bord", link: "/dashboard" },
  { icon: ShieldCheck, label: "Produits vérifiés", link: "/tracabilite" },
  { icon: Leaf, label: "Agriculture bio", link: "/marketplace?category=bio" },
];

const SolutionsSection = () => {
  return (
    <section className="hidden md:block py-10 lg:py-16 bg-gradient-to-b from-muted/30 to-background">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-8 lg:mb-12">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-semibold tracking-wide uppercase mb-4">
            <ShieldCheck className="w-3.5 h-3.5" />
            Solutions NUKUCONNECT
          </span>
          <h2 className="font-heading text-xl sm:text-2xl lg:text-3xl font-bold text-foreground mb-3">
            Des solutions innovantes au service de{" "}
            <span className="text-primary">votre croissance</span>
          </h2>
          <p className="text-sm lg:text-base text-muted-foreground max-w-2xl mx-auto">
            Une plateforme complète qui connecte, forme et dynamise l'agriculture
            et l'aquaculture en Afrique de l'Ouest et au-delà.
          </p>
        </div>

        {/* Solutions Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-8 lg:mb-12">
          {solutions.map((sol, idx) => (
            <Link
              key={sol.title}
              to={sol.link}
              className={`group relative bg-card border ${sol.borderColor} rounded-2xl p-5 lg:p-6 flex flex-col transition-all duration-300 hover:shadow-elevated hover:-translate-y-1`}
            >
              {/* Gradient overlay */}
              <div className={`absolute inset-0 bg-gradient-to-br ${sol.gradient} rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />

              <div className="relative z-10 flex flex-col flex-1">
                {/* Icon */}
                <div className={`w-12 h-12 lg:w-14 lg:h-14 rounded-xl ${sol.iconBg} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                  <sol.icon className={`w-6 h-6 lg:w-7 lg:h-7 ${sol.iconColor}`} />
                </div>

                {/* Number badge */}
                <span className="absolute top-0 right-0 text-[10px] font-bold text-muted-foreground/30 group-hover:text-primary/20 transition-colors">
                  0{idx + 1}
                </span>

                {/* Content */}
                <h3 className="font-heading text-sm lg:text-base font-bold text-foreground mb-2 leading-tight">
                  {sol.title}
                </h3>
                <p className="text-[11px] lg:text-xs text-muted-foreground leading-relaxed mb-4 flex-1">
                  {sol.description}
                </p>

                {/* CTA */}
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary group-hover:gap-2.5 transition-all">
                  {sol.cta}
                  <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
                </span>
              </div>
            </Link>
          ))}
        </div>

        {/* Quick access highlights */}
        <div className="flex flex-wrap items-center justify-center gap-3 lg:gap-4">
          <span className="text-xs text-muted-foreground font-medium mr-2">Accès rapide :</span>
          {highlights.map((h) => (
            <Link
              key={h.label}
              to={h.link}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-border bg-card hover:border-primary/40 hover:bg-primary/5 transition-all text-xs font-medium text-foreground group"
            >
              <h.icon className="w-3.5 h-3.5 text-primary" />
              {h.label}
              <ArrowRight className="w-3 h-3 text-muted-foreground group-hover:text-primary transition-colors" />
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};

export default SolutionsSection;
