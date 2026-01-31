import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import HeroCarousel from "@/components/home/HeroCarousel";
import FeaturedProducts from "@/components/home/FeaturedProducts";
import FeaturesSection from "@/components/home/FeaturesSection";
import UserTypesSection from "@/components/home/UserTypesSection";
import NukuAISection from "@/components/home/NukuAISection";
import CTASection from "@/components/home/CTASection";

const Index = () => {
  return (
    <div className="min-h-screen">
      <Header />
      <main>
        <HeroCarousel />
        <FeaturedProducts />
        <FeaturesSection />
        <UserTypesSection />
        <NukuAISection />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
