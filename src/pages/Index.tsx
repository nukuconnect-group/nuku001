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
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "WebSite",
          "name": "NUKUCONNECT",
          "url": "https://nukuconnect.lovable.app",
          "description": "Marketplace agricole intelligente d'Afrique",
          "potentialAction": {
            "@type": "SearchAction",
            "target": "https://nukuconnect.lovable.app/marketplace?q={search_term_string}",
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
