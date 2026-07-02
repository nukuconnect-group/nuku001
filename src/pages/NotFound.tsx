import SEO from "@/components/SEO";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { ArrowLeft, Home, Store } from "lucide-react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import notFoundImg from "@/assets/not-found-illustration.jpg.asset.json";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SEO
        title="Page introuvable — Nukuconnect"
        description="La page que vous recherchez est introuvable. Revenez à l'accueil ou explorez la marketplace agricole Nukuconnect."
        noIndex
      />
      <Header />

      <main className="flex-1">
        <section className="container mx-auto px-4 py-10 sm:py-16 lg:py-20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center max-w-6xl mx-auto">
            {/* Illustration */}
            <div className="order-2 lg:order-1">
              <div className="relative rounded-2xl overflow-hidden shadow-elevated border border-border bg-card">
                <img
                  src={notFoundImg.url}
                  alt="Illustration — page introuvable sur Nukuconnect"
                  className="w-full h-auto object-cover"
                  width={1024}
                  height={768}
                  loading="eager"
                  decoding="async"
                />
              </div>
            </div>

            {/* Content */}
            <div className="order-1 lg:order-2 text-center lg:text-left">
              <span className="inline-block px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs sm:text-sm font-semibold mb-4">
                Erreur 404
              </span>
              <h1 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-4 leading-tight">
                Oups… cette page a pris le champ 🌱
              </h1>
              <p className="text-sm sm:text-base text-muted-foreground mb-6 max-w-lg mx-auto lg:mx-0">
                La page que vous cherchez n'existe pas, a été déplacée ou n'est
                plus disponible. Pas d'inquiétude — voici comment reprendre
                votre parcours sur Nukuconnect.
              </p>

              {location.pathname && (
                <p className="text-xs text-muted-foreground/80 mb-6 break-all font-mono">
                  URL demandée : <span className="text-foreground/70">{location.pathname}</span>
                </p>
              )}

              <div className="flex flex-col sm:flex-row flex-wrap gap-3 justify-center lg:justify-start">
                <Button asChild variant="hero" size="lg" className="gap-2">
                  <Link to="/">
                    <Home className="w-4 h-4" />
                    Retour à l'accueil
                  </Link>
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className="gap-2"
                  onClick={() => (window.history.length > 1 ? navigate(-1) : navigate("/"))}
                >
                  <ArrowLeft className="w-4 h-4" />
                  Page précédente
                </Button>
                <Button asChild variant="secondary" size="lg" className="gap-2">
                  <Link to="/marketplace">
                    <Store className="w-4 h-4" />
                    Marketplace
                  </Link>
                </Button>
              </div>

              <div className="mt-8 pt-6 border-t border-border/60">
                <p className="text-xs text-muted-foreground mb-3">
                  Liens rapides :
                </p>
                <div className="flex flex-wrap gap-x-4 gap-y-2 justify-center lg:justify-start text-sm">
                  <Link to="/producteurs" className="text-primary hover:underline">Fournisseurs</Link>
                  <Link to="/formations" className="text-primary hover:underline">Formations</Link>
                  <Link to="/nuku-ai" className="text-primary hover:underline">Nuku AI</Link>
                  <Link to="/aide" className="text-primary hover:underline">Centre d'aide</Link>
                  <Link to="/contact" className="text-primary hover:underline">Contact</Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default NotFound;
