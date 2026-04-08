import SEO from "@/components/SEO";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import MobileBottomNav from "@/components/layout/MobileBottomNav";
import NukuAIFloating from "@/components/home/NukuAIFloating";
import HeroCarousel from "@/components/home/HeroCarousel";
import PromoBannerSlider from "@/components/home/PromoBannerSlider";
import SolutionsSection from "@/components/home/SolutionsSection";
import FeaturedProducts from "@/components/home/FeaturedProducts";
import CategoriesSection from "@/components/home/CategoriesSection";
import FeaturesSection from "@/components/home/FeaturesSection";
import HowItWorksSection from "@/components/home/HowItWorksSection";
import NukuAISection from "@/components/home/NukuAISection";
import CTASection from "@/components/home/CTASection";

const Index = () => {
  return (
    <div className="min-h-screen pb-14 lg:pb-0">
      <SEO
        url="/"
        title="Marketplace Agricole Intelligent d'Afrique"
        description="Achetez et vendez des produits agricoles. Connectez-vous avec des milliers de producteurs vérifiés, livreurs et acheteurs en Afrique."
        image="https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=1200&h=630&fit=crop&q=80"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "WebSite",
          "name": "NUKUCONNECT",
          "url": "https://www.nukuconnect.com",
          "description": "Marketplace agricole intelligente d'Afrique",
          "potentialAction": {
            "@type": "SearchAction",
            "target": "https://www.nukuconnect.com/marketplace?q={search_term_string}",
            "query-input": "required name=search_term_string"
          }
        }}
      />
      <Header />
      <main className="space-y-0">
        {/* HeroCarousel: desktop/tablet only */}
        <div className="hidden md:block">
          <HeroCarousel />
        </div>
        {/* Solutions section: desktop/tablet only, before publications */}
        <SolutionsSection />
        {/* PromoBannerSlider: mobile hero + products */}
        <PromoBannerSlider />
        <CategoriesSection />
        <FeaturedProducts />
        {/* Award Banner */}
        <section className="py-6 sm:py-10 bg-gradient-to-r from-primary/5 via-accent/5 to-primary/5">
          <div className="container mx-auto px-3 sm:px-4">
            <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-8 max-w-4xl mx-auto">
              <div className="w-20 h-20 sm:w-28 sm:h-28 rounded-2xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                <span className="text-4xl sm:text-5xl">🏆</span>
              </div>
              <div className="text-center sm:text-left flex-1">
                <p className="text-[10px] sm:text-xs font-semibold text-primary uppercase tracking-wider mb-1">Togo Top Impact 2025</p>
                <h3 className="font-heading text-base sm:text-xl lg:text-2xl font-extrabold text-foreground mb-2">
                  NukuConnect sacré meilleure innovation de l'année
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground mb-3">
                  Notre plateforme a été récompensée pour son impact sur la chaîne de valeur agricole en Afrique.
                </p>
                <a href="/blog/nukuconnect-meilleure-innovation-togo-top-impact-2025" className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-primary hover:underline">
                  Lire l'article complet →
                </a>
              </div>
            </div>
          </div>
        </section>
        <FeaturesSection />
        <HowItWorksSection />
        <NukuAISection />
        <CTASection />
      </main>
      <Footer />
      <NukuAIFloating />
      <MobileBottomNav />
    </div>
  );
};

export default Index;
