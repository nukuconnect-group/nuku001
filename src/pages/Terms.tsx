import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import MobileBottomNav from "@/components/layout/MobileBottomNav";
import { Shield } from "lucide-react";

const Terms = () => {
  return (
    <div className="min-h-screen bg-background pb-14 lg:pb-0">
      <Header />
      <main>
        <div className="bg-primary/5 border-b border-border py-8 sm:py-12">
          <div className="container mx-auto px-4 text-center">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Shield className="w-7 h-7 text-primary" />
            </div>
            <h1 className="font-heading text-2xl sm:text-3xl font-bold text-foreground mb-2">
              Conditions Générales d'Utilisation
            </h1>
            <p className="text-sm text-muted-foreground">Dernière mise à jour : 09 Février 2026</p>
          </div>
        </div>

        <div className="container mx-auto px-4 py-8 sm:py-12 max-w-3xl">
          <div className="prose prose-sm sm:prose-base max-w-none space-y-8 text-foreground">
            <p className="text-muted-foreground leading-relaxed">
              Les présentes conditions générales d'utilisation (ci-après « Conditions ») régissent l'accès et l'utilisation de la plateforme Nukuconnect (ci-après « la Plateforme »), opérée par <strong>Nukuconnect SA</strong>, et accessible via <a href="https://nukuconnect.com" className="text-primary hover:underline">nukuconnect.com</a>.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              En accédant à la Plateforme, vous acceptez sans réserve ces Conditions.
            </p>

            <section>
              <h2 className="font-heading text-lg sm:text-xl font-bold text-foreground border-b border-border pb-2">1. Objet</h2>
              <p className="text-muted-foreground leading-relaxed mt-3">
                Nukuconnect est une plateforme numérique spécialisée dans la mise en relation entre producteurs agricoles, acheteurs, prestataires de services, et la vente de produits agricoles.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                Les présentes Conditions encadrent les droits et obligations des utilisateurs et de Nukuconnect SA.
              </p>
            </section>

            <section>
              <h2 className="font-heading text-lg sm:text-xl font-bold text-foreground border-b border-border pb-2">2. Définitions</h2>
              <ul className="mt-3 space-y-2 text-muted-foreground">
                <li><strong className="text-foreground">Utilisateur :</strong> Toute personne physique ou morale utilisant la Plateforme.</li>
                <li><strong className="text-foreground">Vendeur :</strong> Utilisateur proposant des produits ou services sur la Plateforme.</li>
                <li><strong className="text-foreground">Acheteur :</strong> Utilisateur achetant un produit ou service via la Plateforme.</li>
                <li><strong className="text-foreground">Contenu :</strong> Toute information, texte, image, vidéo ou donnée publiée sur la Plateforme.</li>
              </ul>
            </section>

            <section>
              <h2 className="font-heading text-lg sm:text-xl font-bold text-foreground border-b border-border pb-2">3. Accès et inscription</h2>
              <ul className="mt-3 space-y-2 text-muted-foreground list-disc pl-5">
                <li>L'accès à certaines fonctionnalités nécessite la création d'un compte.</li>
                <li>L'utilisateur doit fournir des informations exactes, complètes et à jour.</li>
                <li>Le compte est personnel et ne peut être partagé sans autorisation écrite.</li>
                <li>Nukuconnect SA se réserve le droit de suspendre ou de supprimer un compte en cas de violation des Conditions.</li>
              </ul>
            </section>

            <section>
              <h2 className="font-heading text-lg sm:text-xl font-bold text-foreground border-b border-border pb-2">4. Utilisation de la Plateforme</h2>
              <ul className="mt-3 space-y-2 text-muted-foreground list-disc pl-5">
                <li>L'utilisateur s'engage à utiliser la Plateforme dans le respect des lois en vigueur.</li>
                <li>Toute utilisation frauduleuse, abusive ou portant atteinte aux droits de tiers est interdite.</li>
                <li>L'utilisateur est responsable du contenu qu'il publie et garantit qu'il ne viole aucun droit de propriété intellectuelle.</li>
              </ul>
            </section>

            <section>
              <h2 className="font-heading text-lg sm:text-xl font-bold text-foreground border-b border-border pb-2">5. Produits et services proposés</h2>
              <ul className="mt-3 space-y-2 text-muted-foreground list-disc pl-5">
                <li>Les descriptions, images et prix sont fournis par les vendeurs, qui en sont seuls responsables.</li>
                <li>Nukuconnect SA ne garantit pas la disponibilité ou la conformité des produits.</li>
                <li>Les transactions se font directement entre vendeur et acheteur, sauf mention contraire.</li>
              </ul>
            </section>

            <section>
              <h2 className="font-heading text-lg sm:text-xl font-bold text-foreground border-b border-border pb-2">6. Paiements</h2>
              <ul className="mt-3 space-y-2 text-muted-foreground list-disc pl-5">
                <li>Les paiements peuvent être effectués via les moyens proposés sur la Plateforme (ex. Mobile Money, carte bancaire, virement).</li>
                <li>En cas de litige sur un paiement, Nukuconnect SA pourra intervenir comme médiateur mais n'est pas responsable des transactions conclues directement entre utilisateurs.</li>
              </ul>
            </section>

            <section>
              <h2 className="font-heading text-lg sm:text-xl font-bold text-foreground border-b border-border pb-2">7. Responsabilités</h2>
              <ul className="mt-3 space-y-2 text-muted-foreground list-disc pl-5">
                <li><strong className="text-foreground">Responsabilité de Nukuconnect SA :</strong> Fournir un accès à la Plateforme et en assurer le bon fonctionnement dans la mesure du possible.</li>
                <li><strong className="text-foreground">Limitation :</strong> Nukuconnect SA ne peut être tenu responsable des pertes, dommages ou litiges découlant des transactions entre utilisateurs.</li>
                <li><strong className="text-foreground">Responsabilité de l'utilisateur :</strong> Garantir l'exactitude des informations fournies et le respect des lois.</li>
              </ul>
            </section>

            <section>
              <h2 className="font-heading text-lg sm:text-xl font-bold text-foreground border-b border-border pb-2">8. Propriété intellectuelle</h2>
              <ul className="mt-3 space-y-2 text-muted-foreground list-disc pl-5">
                <li>L'ensemble du contenu et des éléments techniques de la Plateforme est protégé par le droit d'auteur et les lois sur la propriété intellectuelle.</li>
                <li>Toute reproduction ou utilisation non autorisée est interdite.</li>
              </ul>
            </section>

            <section>
              <h2 className="font-heading text-lg sm:text-xl font-bold text-foreground border-b border-border pb-2">9. Protection des données</h2>
              <ul className="mt-3 space-y-2 text-muted-foreground list-disc pl-5">
                <li>Les données personnelles collectées sont utilisées conformément à notre Politique de Confidentialité.</li>
                <li>L'utilisateur dispose d'un droit d'accès, de rectification et de suppression de ses données.</li>
              </ul>
            </section>

            <section>
              <h2 className="font-heading text-lg sm:text-xl font-bold text-foreground border-b border-border pb-2">10. Modification des Conditions</h2>
              <ul className="mt-3 space-y-2 text-muted-foreground list-disc pl-5">
                <li>Nukuconnect SA peut modifier ces Conditions à tout moment.</li>
                <li>Les utilisateurs seront informés des changements importants et devront accepter la nouvelle version pour continuer à utiliser la Plateforme.</li>
              </ul>
            </section>

            <section>
              <h2 className="font-heading text-lg sm:text-xl font-bold text-foreground border-b border-border pb-2">11. Droit applicable et juridiction</h2>
              <ul className="mt-3 space-y-2 text-muted-foreground list-disc pl-5">
                <li>Ces Conditions sont régies par les lois en vigueur au <strong className="text-foreground">Togo</strong>.</li>
                <li>Tout litige relatif à l'interprétation ou l'exécution des présentes relève des tribunaux compétents de <strong className="text-foreground">Lomé, Togo</strong>.</li>
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

export default Terms;
