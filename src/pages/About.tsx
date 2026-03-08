import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import MobileBottomNav from "@/components/layout/MobileBottomNav";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Users, Target, Globe, Leaf, ArrowRight, Linkedin, Mail } from "lucide-react";
import teamCeo from "@/assets/team-ceo.png";
import teamCto from "@/assets/team-cto.png";

const teamMembers = [
  { name: "Edem ADZO Kodzo", role: "CEO & Co-fondateur", bio: "Visionnaire et entrepreneur, co-fondateur de NUKUCONNECT. Passionné par l'innovation technologique au service de l'agriculture africaine.", avatar: teamCeo },
  { name: "Komi Sena AFANDONOUGBO", role: "CTO & Co-fondateur", bio: "Expert en développement logiciel et architecte de la plateforme NUKUCONNECT. Spécialiste en solutions digitales pour l'agritech.", avatar: teamCto },
];

const values = [
  { icon: Target, title: "Notre Mission", description: "Connecter directement les producteurs agricoles aux acheteurs pour créer un commerce équitable et transparent en Afrique." },
  { icon: Globe, title: "Notre Vision", description: "Devenir la première plateforme de commerce agricole en Afrique de l'Ouest, en utilisant la technologie pour transformer l'agriculture." },
  { icon: Leaf, title: "Nos Valeurs", description: "Transparence, durabilité, innovation et inclusion. Nous croyons en un avenir agricole prospère pour tous." },
  { icon: Users, title: "Notre Impact", description: "Plus de 850 producteurs connectés, 15 000+ transactions réalisées et un réseau en constante croissance." },
];

const About = () => {
  return (
    <div className="min-h-screen bg-background pb-14 lg:pb-0">
      <Header />

      {/* Hero */}
      <section className="py-10 sm:py-16 bg-gradient-to-b from-primary/5 to-background">
        <div className="container mx-auto px-3 sm:px-4 text-center">
          <Badge variant="secondary" className="mb-4">À propos</Badge>
          <h1 className="font-heading text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground mb-3">
            Qui sommes-<span className="text-primary">nous</span> ?
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto mb-6">
            NUKUCONNECT est une marketplace agricole intelligente qui met en relation 
            directe les producteurs et les acheteurs en Afrique de l'Ouest.
          </p>
        </div>
      </section>

      {/* Values */}
      <section className="py-8 sm:py-12">
        <div className="container mx-auto px-3 sm:px-4">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-5xl mx-auto">
            {values.map((value) => (
              <Card key={value.title} className="text-center p-4 sm:p-6 hover:shadow-elevated transition-all">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
                  <value.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-heading font-bold text-sm sm:text-base mb-2">{value.title}</h3>
                <p className="text-xs sm:text-sm text-muted-foreground">{value.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="py-8 sm:py-12 bg-muted/30">
        <div className="container mx-auto px-3 sm:px-4">
          <div className="text-center mb-8">
            <h2 className="font-heading text-xl sm:text-2xl font-bold text-foreground mb-2">Notre Équipe</h2>
            <p className="text-xs sm:text-sm text-muted-foreground">Des passionnés d'agriculture et de technologie</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-8 max-w-4xl mx-auto">
            {teamMembers.map((member) => (
              <Card key={member.name} className="overflow-hidden group hover:shadow-elevated transition-all">
                <div className="aspect-[4/3] w-full overflow-hidden">
                  <img
                    src={member.avatar}
                    alt={member.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                </div>
                <CardContent className="p-4 sm:p-5 text-center">
                  <h3 className="font-heading font-bold text-sm sm:text-base text-foreground">{member.name}</h3>
                  <p className="text-xs sm:text-sm text-primary font-medium mb-2">{member.role}</p>
                  <p className="text-xs sm:text-sm text-muted-foreground">{member.bio}</p>
                  <div className="flex justify-center gap-2 mt-3">
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Linkedin className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Mail className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-10 sm:py-14">
        <div className="container mx-auto px-3 sm:px-4 text-center">
          <h2 className="font-heading text-lg sm:text-2xl font-bold text-foreground mb-3">
            Rejoignez l'aventure NUKUCONNECT
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground mb-6 max-w-lg mx-auto">
            Que vous soyez producteur ou acheteur, rejoignez notre communauté et contribuez 
            à transformer l'agriculture africaine.
          </p>
          <div className="flex gap-3 justify-center">
            <Link to="/auth">
              <Button variant="hero" className="gap-2 text-xs sm:text-sm">
                Créer mon compte <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <Link to="/marketplace">
              <Button variant="outline" className="text-xs sm:text-sm">Explorer le marché</Button>
            </Link>
          </div>
        </div>
      </section>

      <Footer />
      <MobileBottomNav />
    </div>
  );
};

export default About;
