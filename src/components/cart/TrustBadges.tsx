import { Truck, Smartphone, Headphones, ShieldCheck } from "lucide-react";

const badges = [
  {
    icon: Truck,
    title: "LIVRAISON INTERNE",
    desc: "Flotte Nukuconnect dans tout le pays",
  },
  {
    icon: Smartphone,
    title: "MOBILE MONEY",
    desc: "Moov & Mixx, simple et rapide",
  },
  {
    icon: Headphones,
    title: "SUPPORT 24/7",
    desc: "Assistance illimitée",
  },
  {
    icon: ShieldCheck,
    title: "100% SÉCURISÉ",
    desc: "Vos paiements et données protégés",
  },
];

const TrustBadges = () => {
  return (
    <section
      aria-label="Nos engagements"
      className="bg-muted/40 border-t border-border/50 py-8 sm:py-10"
    >
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
          {badges.map((b) => {
            const Icon = b.icon;
            return (
              <div
                key={b.title}
                className="flex items-center gap-3 sm:gap-4 p-2 sm:p-3"
              >
                <div className="flex-shrink-0 w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-background border border-primary/20 flex items-center justify-center">
                  <Icon
                    className="w-6 h-6 sm:w-7 sm:h-7 text-primary"
                    strokeWidth={1.5}
                  />
                </div>
                <div className="min-w-0">
                  <h3 className="text-[11px] sm:text-xs font-bold tracking-wide text-foreground leading-tight">
                    {b.title}
                  </h3>
                  <p className="text-[10px] sm:text-xs text-muted-foreground leading-snug mt-0.5">
                    {b.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default TrustBadges;
