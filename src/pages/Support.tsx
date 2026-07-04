import SEO from "@/components/SEO";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import MobileBottomNav from "@/components/layout/MobileBottomNav";
import SupportWidget from "@/components/SupportWidget";
import { useProfile } from "@/contexts/ProfileContext";
import { LifeBuoy } from "lucide-react";

/**
 * Dedicated Support page (replaces the floating popup).
 * Renders the SupportWidget in "openByDefault" mode inside a
 * full-page container so users can browse categories, create a
 * ticket and follow replies without a cramped popup.
 */
const Support = () => {
  const { user, profile } = useProfile();

  return (
    <div className="min-h-screen bg-background pb-14 lg:pb-0">
      <SEO
        title="Support client — NukuConnect"
        description="Créez un ticket, choisissez la catégorie et recevez une réponse instantanée de notre équipe support."
        url="/support"
      />
      <Header />
      <main className="container mx-auto px-3 sm:px-4 py-6 sm:py-10 max-w-4xl">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
            <LifeBuoy className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-heading text-xl sm:text-2xl font-bold">Support client</h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Choisissez une catégorie ci-dessous et créez votre ticket — réponse instantanée de notre assistant.
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card overflow-hidden min-h-[70vh]">
          <SupportWidget
            userId={user?.id}
            userName={profile?.full_name || undefined}
            openByDefault
            asPage
          />
        </div>
      </main>
      <Footer />
      <MobileBottomNav />
    </div>
  );
};

export default Support;
