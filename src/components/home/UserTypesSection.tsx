import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight, CheckCircle2, Tractor, Store } from "lucide-react";

const UserTypesSection = () => {
  return (
    <section className="py-20 lg:py-32 bg-background">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="inline-block px-4 py-2 rounded-full bg-accent/20 text-accent-foreground text-sm font-medium mb-4">
            Pour qui ?
          </span>
          <h2 className="font-heading text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4">
            Une plateforme pour{" "}
            <span className="text-primary">tous les acteurs</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            Que vous soyez producteur ou acheteur, NUKUCONNECT vous offre 
            les outils adaptés à vos besoins.
          </p>
        </div>

        {/* Cards */}
        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {/* Producteurs */}
          <Card variant="feature" className="overflow-hidden group">
            <div className="h-48 bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center relative">
              <Tractor className="w-24 h-24 text-primary-foreground/20 absolute right-4 bottom-4" />
              <div className="w-20 h-20 rounded-2xl bg-primary-foreground/20 flex items-center justify-center">
                <Tractor className="w-10 h-10 text-primary-foreground" />
              </div>
            </div>
            <CardContent className="p-8">
              <h3 className="font-heading text-2xl font-bold text-foreground mb-4">
                Producteurs & Agriculteurs
              </h3>
              <ul className="space-y-3 mb-6">
                {[
                  "Publiez vos produits en quelques clics",
                  "Accédez à des milliers d'acheteurs vérifiés",
                  "Recevez des conseils personnalisés de NUKU AI",
                  "Suivez vos ventes avec des tableaux de bord",
                  "Formations gratuites pour améliorer vos rendements",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                    <span className="text-muted-foreground">{item}</span>
                  </li>
                ))}
              </ul>
              <Button variant="hero" className="w-full group">
                Devenir producteur
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </CardContent>
          </Card>

          {/* Acheteurs */}
          <Card variant="feature" className="overflow-hidden group">
            <div className="h-48 bg-gradient-to-br from-accent to-accent/80 flex items-center justify-center relative">
              <Store className="w-24 h-24 text-accent-foreground/20 absolute right-4 bottom-4" />
              <div className="w-20 h-20 rounded-2xl bg-accent-foreground/20 flex items-center justify-center">
                <Store className="w-10 h-10 text-accent-foreground" />
              </div>
            </div>
            <CardContent className="p-8">
              <h3 className="font-heading text-2xl font-bold text-foreground mb-4">
                Acheteurs & Grossistes
              </h3>
              <ul className="space-y-3 mb-6">
                {[
                  "Trouvez des produits de qualité certifiée",
                  "Négociez directement avec les producteurs",
                  "Traçabilité complète des produits",
                  "Recommandations basées sur vos besoins",
                  "Paiements sécurisés et livraison suivie",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-accent mt-0.5 flex-shrink-0" />
                    <span className="text-muted-foreground">{item}</span>
                  </li>
                ))}
              </ul>
              <Button variant="gold" className="w-full group">
                Devenir acheteur
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
};

export default UserTypesSection;
