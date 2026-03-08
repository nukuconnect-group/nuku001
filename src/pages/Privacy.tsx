import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import MobileBottomNav from "@/components/layout/MobileBottomNav";
import { Lock } from "lucide-react";

const Privacy = () => {
  return (
    <div className="min-h-screen bg-background pb-14 lg:pb-0">
      <Header />
      <main>
        <div className="bg-primary/5 border-b border-border py-8 sm:py-12">
          <div className="container mx-auto px-4 text-center">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Lock className="w-7 h-7 text-primary" />
            </div>
            <h1 className="font-heading text-2xl sm:text-3xl font-bold text-foreground mb-2">
              Politique de Confidentialité
            </h1>
            <p className="text-sm text-muted-foreground">Dernière mise à jour : 09 Février 2026</p>
          </div>
        </div>

        <div className="container mx-auto px-4 py-8 sm:py-12 max-w-3xl">
          <div className="prose prose-sm sm:prose-base max-w-none space-y-8 text-foreground">
            <p className="text-muted-foreground leading-relaxed">
              La présente Politique de Confidentialité décrit comment <strong>Nukuconnect SA</strong> collecte, utilise, stocke et protège vos données personnelles lorsque vous utilisez la plateforme Nukuconnect.
            </p>

            <section>
              <h2 className="font-heading text-lg sm:text-xl font-bold text-foreground border-b border-border pb-2">1. Données collectées</h2>
              <p className="text-muted-foreground leading-relaxed mt-3">Nous collectons les types de données suivants :</p>
              <ul className="mt-2 space-y-2 text-muted-foreground list-disc pl-5">
                <li><strong className="text-foreground">Données d'identification :</strong> nom, prénom, adresse email, numéro de téléphone, localisation.</li>
                <li><strong className="text-foreground">Données de profil :</strong> photo de profil, type de compte (producteur/acheteur), bio, secteur d'activité.</li>
                <li><strong className="text-foreground">Données transactionnelles :</strong> historique des commandes, montants, modes de paiement utilisés.</li>
                <li><strong className="text-foreground">Données de navigation :</strong> adresse IP, type de navigateur, pages consultées, durée de visite.</li>
                <li><strong className="text-foreground">Données de communication :</strong> messages échangés via la messagerie interne.</li>
              </ul>
            </section>

            <section>
              <h2 className="font-heading text-lg sm:text-xl font-bold text-foreground border-b border-border pb-2">2. Finalités du traitement</h2>
              <ul className="mt-3 space-y-2 text-muted-foreground list-disc pl-5">
                <li>Création et gestion de votre compte utilisateur.</li>
                <li>Mise en relation entre producteurs et acheteurs.</li>
                <li>Traitement et suivi des commandes.</li>
                <li>Amélioration de l'expérience utilisateur et personnalisation des services.</li>
                <li>Envoi de notifications et communications relatives à vos activités.</li>
                <li>Prévention de la fraude et sécurité de la plateforme.</li>
                <li>Respect des obligations légales et réglementaires.</li>
              </ul>
            </section>

            <section>
              <h2 className="font-heading text-lg sm:text-xl font-bold text-foreground border-b border-border pb-2">3. Base légale du traitement</h2>
              <ul className="mt-3 space-y-2 text-muted-foreground list-disc pl-5">
                <li><strong className="text-foreground">Consentement :</strong> vous acceptez cette politique lors de votre inscription.</li>
                <li><strong className="text-foreground">Exécution du contrat :</strong> le traitement est nécessaire pour fournir les services demandés.</li>
                <li><strong className="text-foreground">Intérêt légitime :</strong> amélioration de la plateforme, prévention de la fraude.</li>
                <li><strong className="text-foreground">Obligation légale :</strong> conservation des données de facturation.</li>
              </ul>
            </section>

            <section>
              <h2 className="font-heading text-lg sm:text-xl font-bold text-foreground border-b border-border pb-2">4. Partage des données</h2>
              <ul className="mt-3 space-y-2 text-muted-foreground list-disc pl-5">
                <li>Vos informations publiques (nom, photo, produits) sont visibles par les autres utilisateurs.</li>
                <li>Vos coordonnées de livraison sont partagées avec les vendeurs pour le traitement des commandes.</li>
                <li>Nous ne vendons jamais vos données personnelles à des tiers.</li>
                <li>Nous pouvons partager des données avec des prestataires techniques (hébergement, paiement) dans le strict cadre du fonctionnement de la plateforme.</li>
                <li>En cas de demande légale, nous pouvons être amenés à communiquer vos données aux autorités compétentes.</li>
              </ul>
            </section>

            <section>
              <h2 className="font-heading text-lg sm:text-xl font-bold text-foreground border-b border-border pb-2">5. Conservation des données</h2>
              <ul className="mt-3 space-y-2 text-muted-foreground list-disc pl-5">
                <li>Les données de votre compte sont conservées tant que votre compte est actif.</li>
                <li>Après suppression du compte, les données sont conservées pendant 12 mois à des fins légales.</li>
                <li>Les données de facturation sont conservées pendant 10 ans conformément à la loi.</li>
                <li>Les données de navigation sont conservées pendant 13 mois maximum.</li>
              </ul>
            </section>

            <section>
              <h2 className="font-heading text-lg sm:text-xl font-bold text-foreground border-b border-border pb-2">6. Sécurité des données</h2>
              <ul className="mt-3 space-y-2 text-muted-foreground list-disc pl-5">
                <li>Chiffrement des données sensibles (mots de passe, données de paiement).</li>
                <li>Connexions sécurisées via HTTPS/TLS.</li>
                <li>Accès restreint aux données personnelles par le personnel autorisé.</li>
                <li>Sauvegardes régulières et protection contre les accès non autorisés.</li>
              </ul>
            </section>

            <section>
              <h2 className="font-heading text-lg sm:text-xl font-bold text-foreground border-b border-border pb-2">7. Vos droits</h2>
              <p className="text-muted-foreground leading-relaxed mt-3">Conformément aux lois en vigueur, vous disposez des droits suivants :</p>
              <ul className="mt-2 space-y-2 text-muted-foreground list-disc pl-5">
                <li><strong className="text-foreground">Droit d'accès :</strong> obtenir une copie de vos données personnelles.</li>
                <li><strong className="text-foreground">Droit de rectification :</strong> corriger vos informations inexactes ou incomplètes.</li>
                <li><strong className="text-foreground">Droit de suppression :</strong> demander la suppression de vos données.</li>
                <li><strong className="text-foreground">Droit d'opposition :</strong> vous opposer au traitement de vos données.</li>
                <li><strong className="text-foreground">Droit à la portabilité :</strong> recevoir vos données dans un format structuré.</li>
              </ul>
              <p className="text-muted-foreground leading-relaxed mt-3">
                Pour exercer ces droits, contactez-nous à : <a href="mailto:privacy@nukuconnect.com" className="text-primary hover:underline">privacy@nukuconnect.com</a>
              </p>
            </section>

            <section>
              <h2 className="font-heading text-lg sm:text-xl font-bold text-foreground border-b border-border pb-2">8. Cookies</h2>
              <ul className="mt-3 space-y-2 text-muted-foreground list-disc pl-5">
                <li><strong className="text-foreground">Cookies essentiels :</strong> nécessaires au fonctionnement de la plateforme (session, authentification).</li>
                <li><strong className="text-foreground">Cookies analytiques :</strong> mesure d'audience et amélioration des services.</li>
                <li>Vous pouvez gérer vos préférences de cookies via les paramètres de votre navigateur.</li>
              </ul>
            </section>

            <section>
              <h2 className="font-heading text-lg sm:text-xl font-bold text-foreground border-b border-border pb-2">9. Modifications</h2>
              <p className="text-muted-foreground leading-relaxed mt-3">
                Nukuconnect SA se réserve le droit de modifier cette Politique de Confidentialité à tout moment. Les utilisateurs seront informés de tout changement significatif par notification sur la plateforme ou par email.
              </p>
            </section>

            <section>
              <h2 className="font-heading text-lg sm:text-xl font-bold text-foreground border-b border-border pb-2">10. Contact</h2>
              <p className="text-muted-foreground leading-relaxed mt-3">
                Pour toute question relative à cette politique, contactez notre Délégué à la Protection des Données :
              </p>
              <ul className="mt-2 space-y-1 text-muted-foreground">
                <li>📧 <a href="mailto:privacy@nukuconnect.com" className="text-primary hover:underline">privacy@nukuconnect.com</a></li>
                <li>📞 +228 90 00 00 00</li>
                <li>📍 Lomé, Togo</li>
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

export default Privacy;
