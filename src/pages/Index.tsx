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
      <Header />
      <main className="space-y-0">
        {/* HeroCarousel: desktop/tablet only */}
        <div className="hidden md:block">
          <HeroCarousel />
        </div>
        {/* PromoBannerSlider: mobile only */}
        <PromoBannerSlider />
        {/* Solutions section: after hero, before categories */}
        <SolutionsSection />
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
