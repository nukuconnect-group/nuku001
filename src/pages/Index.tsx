import SEO from "@/components/SEO";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import MobileBottomNav from "@/components/layout/MobileBottomNav";
import NukuAIFloating from "@/components/home/NukuAIFloating";
import HeroCarousel from "@/components/home/HeroCarousel";

import SolutionsSection from "@/components/home/SolutionsSection";
import FeaturedProducts from "@/components/home/FeaturedProducts";
import CategoriesSection from "@/components/home/CategoriesSection";
import FeaturesSection from "@/components/home/FeaturesSection";
import HowItWorksSection from "@/components/home/HowItWorksSection";
import NukuAISection from "@/components/home/NukuAISection";
import CTASection from "@/components/home/CTASection";
import HomeDemandsSection from "@/components/home/HomeDemandsSection";
import DirectFromFarmHero from "@/components/home/DirectFromFarmHero";
import RecentPublications from "@/components/home/RecentPublications";
import HelpAICard from "@/components/home/HelpAICard";
import SellProductsCard from "@/components/home/SellProductsCard";
import VerifiedSuppliersBar from "@/components/home/VerifiedSuppliersBar";

import { useProfile } from "@/contexts/ProfileContext";

const Index = () => {
  const { user, profile } = useProfile();

  return (
    <div className="min-h-screen pb-14 lg:pb-0">
      <SEO
        url="/"
        title="Marketplace Agricole Intelligent d'Afrique"
        description="Achetez et vendez des produits agricoles frais en Afrique. Connectez-vous avec des milliers de producteurs vérifiés, livreurs et acheteurs. Inscription gratuite."
        image="https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=1200&h=630&fit=crop&q=80"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "WebSite",
          "name": "NUKUCONNECT",
          "url": "https://www.nukuconnect.com",
          "description": "Marketplace agricole intelligente d'Afrique — Achetez, vendez et livrez des produits agricoles.",
          "potentialAction": [
            {
              "@type": "SearchAction",
              "target": "https://www.nukuconnect.com/marketplace?q={search_term_string}",
              "query-input": "required name=search_term_string"
            }
          ],
          "sameAs": [
            "https://web.facebook.com/nukuconnect",
            "https://www.linkedin.com/company/nukuconnect"
          ]
        }}
      />
      <Header />
      <main className="space-y-0">
        <div className="hidden md:block">
          <HeroCarousel />
        </div>
        <div className="md:hidden">
          <HelpAICard />
          <SellProductsCard />
          <RecentPublications />
        </div>
        <SolutionsSection />
        <div className="hidden md:block">
          <RecentPublications />
        </div>
        <CategoriesSection />
        
        <DirectFromFarmHero />
        <VerifiedSuppliersBar />
        <FeaturedProducts />
        <HomeDemandsSection />
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
