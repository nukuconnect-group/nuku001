import SEO from "@/components/SEO";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import MobileBottomNav from "@/components/layout/MobileBottomNav";
import { Scale } from "lucide-react";

const Legal = () => {
  return (
    <div className="min-h-screen bg-background pb-14 lg:pb-0">
      <Header />
      <main>
        <div className="bg-primary/5 border-b border-border py-8 sm:py-12">
          <div className="container mx-auto px-4 text-center">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Scale className="w-7 h-7 text-primary" />
            </div>
            <h1 className="font-heading text-2xl sm:text-3xl font-bold text-foreground mb-2">
              Mentions Légales
            </h1>
            <p className="text-sm text-muted-foreground">Informations légales obligatoires</p>
          </div>
        </div>

        <div className="container mx-auto px-4 py-8 sm:py-12 max-w-3xl">
          <div className="prose prose-sm sm:prose-base max-w-none space-y-8 text-foreground">

            <section>
              <h2 className="font-heading text-lg sm:text-xl font-bold text-foreground border-b border-border pb-2">1. Éditeur du site</h2>
              <ul className="mt-3 space-y-2 text-muted-foreground">
                <li><strong className="text-foreground">Raison sociale :</strong> Nukuconnect SA</li>
                <li><strong className="text-foreground">Forme juridique :</strong> Société Anonyme</li>
                <li><strong className="text-foreground">Siège social :</strong> Lomé, Togo</li>
                <li><strong className="text-foreground">Capital social :</strong> 10 000 000 FCFA</li>
                <li><strong className="text-foreground">Numéro RCCM :</strong> TG-LOM-2025-A-XXXXX</li>
                <li><strong className="text-foreground">NIF :</strong> XXXXXXXXX</li>
                <li><strong className="text-foreground">Email :</strong> <a href="mailto:contact@nukuconnect.com" className="text-primary hover:underline">contact@nukuconnect.com</a></li>
                <li><strong className="text-foreground">Téléphone :</strong> +228 90 00 00 00</li>
                <li><strong className="text-foreground">Directeur de la publication :</strong> Le Directeur Général de Nukuconnect SA</li>
              </ul>
            </section>

            <section>
              <h2 className="font-heading text-lg sm:text-xl font-bold text-foreground border-b border-border pb-2">2. Hébergeur</h2>
              <ul className="mt-3 space-y-2 text-muted-foreground">
                <li><strong className="text-foreground">Nom :</strong> Nukuconnect Cloud</li>
                <li><strong className="text-foreground">Type :</strong> Hébergement cloud sécurisé</li>
                <li><strong className="text-foreground">Localisation des serveurs :</strong> Infrastructure internationale</li>
              </ul>
            </section>

            <section>
              <h2 className="font-heading text-lg sm:text-xl font-bold text-foreground border-b border-border pb-2">3. Objet du site</h2>
              <p className="text-muted-foreground leading-relaxed mt-3">
                Le site <a href="https://nukuconnect.com" className="text-primary hover:underline">nukuconnect.com</a> est une marketplace agricole en ligne permettant la mise en relation entre producteurs agricoles et acheteurs professionnels ou particuliers en Afrique de l'Ouest.
              </p>
            </section>

            <section>
              <h2 className="font-heading text-lg sm:text-xl font-bold text-foreground border-b border-border pb-2">4. Propriété intellectuelle</h2>
              <ul className="mt-3 space-y-2 text-muted-foreground list-disc pl-5">
                <li>L'ensemble du contenu du site (textes, images, logos, graphismes, icônes, logiciels) est la propriété exclusive de Nukuconnect SA ou de ses partenaires.</li>
                <li>Toute reproduction, représentation, modification ou adaptation, totale ou partielle, est strictement interdite sans autorisation écrite préalable.</li>
                <li>Le logo et la marque NUKUCONNECT sont des marques déposées. Leur utilisation sans autorisation est passible de poursuites judiciaires.</li>
              </ul>
            </section>

            <section>
              <h2 className="font-heading text-lg sm:text-xl font-bold text-foreground border-b border-border pb-2">5. Responsabilité</h2>
              <ul className="mt-3 space-y-2 text-muted-foreground list-disc pl-5">
                <li>Nukuconnect SA s'efforce d'assurer l'exactitude des informations diffusées sur le site, mais ne saurait être tenue responsable d'éventuelles erreurs ou omissions.</li>
                <li>La plateforme agit en tant qu'intermédiaire et n'est pas partie aux transactions entre vendeurs et acheteurs.</li>
                <li>L'utilisateur est seul responsable de l'utilisation qu'il fait des informations et services disponibles sur le site.</li>
                <li>Nukuconnect SA ne garantit pas la disponibilité permanente du site et peut effectuer des interruptions pour maintenance.</li>
              </ul>
            </section>

            <section>
              <h2 className="font-heading text-lg sm:text-xl font-bold text-foreground border-b border-border pb-2">6. Liens hypertextes</h2>
              <ul className="mt-3 space-y-2 text-muted-foreground list-disc pl-5">
                <li>Le site peut contenir des liens vers des sites tiers. Nukuconnect SA décline toute responsabilité quant au contenu de ces sites.</li>
                <li>La création de liens hypertextes vers le site nukuconnect.com est autorisée sans demande préalable, sous réserve de ne pas porter atteinte à l'image de Nukuconnect SA.</li>
              </ul>
            </section>

            <section>
              <h2 className="font-heading text-lg sm:text-xl font-bold text-foreground border-b border-border pb-2">7. Protection des données personnelles</h2>
              <p className="text-muted-foreground leading-relaxed mt-3">
                Conformément à la législation togolaise sur la protection des données personnelles et au RGPD, vous disposez d'un droit d'accès, de rectification, de suppression et d'opposition concernant vos données personnelles.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                Pour plus de détails, consultez notre <a href="/privacy" className="text-primary hover:underline">Politique de Confidentialité</a>.
              </p>
            </section>

            <section>
              <h2 className="font-heading text-lg sm:text-xl font-bold text-foreground border-b border-border pb-2">8. Droit applicable</h2>
              <p className="text-muted-foreground leading-relaxed mt-3">
                Les présentes mentions légales sont régies par le droit togolais. Tout litige relatif à l'utilisation du site sera soumis à la compétence exclusive des tribunaux de <strong className="text-foreground">Lomé, Togo</strong>.
              </p>
            </section>

            <section>
              <h2 className="font-heading text-lg sm:text-xl font-bold text-foreground border-b border-border pb-2">9. Crédits</h2>
              <ul className="mt-3 space-y-2 text-muted-foreground">
                <li><strong className="text-foreground">Conception et développement :</strong> Nukuconnect SA</li>
                <li><strong className="text-foreground">Technologie :</strong> React, TypeScript, Cloud Infrastructure</li>
                <li><strong className="text-foreground">Illustrations :</strong> Nukuconnect SA / Licences libres</li>
              </ul>
            </section>
          </div>
        </div>
      </main>
      <Footer />
      <MobileBottomNav />
    </div>
  );
};

export default Legal;
