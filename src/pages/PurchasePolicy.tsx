import SEO from "@/components/SEO";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import MobileBottomNav from "@/components/layout/MobileBottomNav";
import { Card, CardContent } from "@/components/ui/card";
import { ShieldCheck, FileText } from "lucide-react";

const sections: { title: string; body: React.ReactNode }[] = [
  {
    title: "1. Champ d'application",
    body: (
      <>
        <p>
          Cette politique s'applique à toutes les commandes passées sur Nukuconnect, que ce soit pour
          des produits agricoles, des intrants, ou des services, sauf mention contraire par le vendeur ou
          dans l'offre.
        </p>
        <p>Elle ne s'applique pas aux transactions conclues en dehors de la Plateforme.</p>
      </>
    ),
  },
  {
    title: "2. Responsabilité des vendeurs",
    body: (
      <>
        <p>
          Chaque vendeur est responsable de la qualité, de la conformité et de la livraison des produits
          ou services vendus.
        </p>
        <p>
          Les conditions spécifiques de retour ou de remboursement d'un vendeur doivent être clairement
          indiquées sur sa page produit.
        </p>
        <p>
          Nukuconnect SA agit en tant qu'intermédiaire et facilite la communication et, si nécessaire,
          la médiation en cas de litige.
        </p>
      </>
    ),
  },
  {
    title: "3. Cas d'éligibilité à un remboursement ou retour",
    body: (
      <>
        <p>Un remboursement ou un retour peut être demandé dans les situations suivantes :</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Produit non conforme à la description (taille, variété, caractéristiques, etc.)</li>
          <li>Produit endommagé ou périmé à la réception</li>
          <li>Produit manquant par rapport à la commande initiale</li>
          <li>Service non exécuté conformément à ce qui était prévu</li>
        </ul>
      </>
    ),
  },
  {
    title: "4. Procédure de demande",
    body: (
      <>
        <p>
          La demande doit être formulée via la messagerie de la plateforme dans un délai de{" "}
          <strong>48 heures</strong> après réception du produit ou de l'exécution du service.
        </p>
        <p>
          L'utilisateur doit fournir des preuves (photos, vidéos, facture) pour appuyer sa réclamation.
        </p>
        <p>
          Nukuconnect SA transmettra la demande au vendeur concerné et suivra la procédure jusqu'à
          résolution.
        </p>
      </>
    ),
  },
  {
    title: "5. Modalités de remboursement",
    body: (
      <>
        <p>
          Si le remboursement est approuvé, il sera effectué selon le mode de paiement initial (Mobile
          Money, carte bancaire, virement) dans un délai maximum de <strong>7 à 14 jours ouvrés</strong>.
        </p>
        <p>
          Les frais de retour (si applicables) peuvent être à la charge de l'acheteur ou du vendeur,
          selon la cause du retour :
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li>
            Défaut du vendeur (produit non conforme, endommagé) → frais à la charge du{" "}
            <strong>vendeur</strong>
          </li>
          <li>
            Changement d'avis de l'acheteur → frais à la charge de l'<strong>acheteur</strong>
          </li>
        </ul>
      </>
    ),
  },
  {
    title: "6. Produits non remboursables / non retournables",
    body: (
      <>
        <p>Certains produits ne peuvent pas être retournés ni remboursés, sauf défaut ou non-conformité :</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Produits périssables (fruits, légumes, poisson frais, etc.)</li>
          <li>Produits transformés ou ouverts après livraison</li>
          <li>Services déjà exécutés ou en cours d'exécution</li>
        </ul>
      </>
    ),
  },
  {
    title: "7. Litiges",
    body: (
      <>
        <p>
          En cas de désaccord persistant entre acheteur et vendeur, Nukuconnect SA peut proposer une
          solution de médiation.
        </p>
        <p>
          La décision finale pourra, si nécessaire, être soumise aux juridictions compétentes.
        </p>
      </>
    ),
  },
  {
    title: "8. Modification de la politique",
    body: (
      <>
        <p>Nukuconnect SA se réserve le droit de modifier cette politique à tout moment.</p>
        <p>
          Toute modification sera publiée sur la Plateforme et applicable aux commandes passées après
          sa date d'entrée en vigueur.
        </p>
      </>
    ),
  },
];

export default function PurchasePolicy() {
  return (
    <div className="min-h-screen bg-background pb-14 lg:pb-0">
      <SEO
        url="/politique-achat"
        title="Politique d'achat & remboursement | NUKUCONNECT"
        description="Conditions de remboursement, retour et médiation applicables aux commandes effectuées sur la marketplace Nukuconnect SA."
        image="https://images.unsplash.com/photo-1556742044-3c52d6e88c62?w=1200&h=630&fit=crop&q=80"
      />
      <Header />
      <main>
        <div className="bg-primary/5 border-b border-border py-8 sm:py-12">
          <div className="container mx-auto px-4 text-center max-w-3xl">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <ShieldCheck className="w-7 h-7 text-primary" />
            </div>
            <h1 className="font-heading text-2xl sm:text-3xl font-bold text-foreground mb-2">
              Politique d'achat & remboursement
            </h1>
            <p className="text-sm text-muted-foreground max-w-xl mx-auto">
              Chez Nukuconnect SA, nous avons à cœur de garantir une expérience fiable et transparente à
              tous nos utilisateurs. La présente politique précise les conditions de remboursement et de
              retour applicables aux transactions effectuées via la plateforme Nukuconnect.
            </p>
            <p className="mt-3 inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <FileText className="w-3 h-3" /> Dernière mise à jour : 09 février 2025
            </p>
          </div>
        </div>

        <div className="container mx-auto px-4 py-8 sm:py-12 max-w-3xl">
          <div className="space-y-4 sm:space-y-5">
            {sections.map((s, i) => (
              <Card key={i} className="overflow-hidden">
                <CardContent className="p-4 sm:p-6 space-y-2 text-sm leading-relaxed text-foreground/90">
                  <h2 className="font-heading text-base sm:text-lg font-bold text-foreground mb-1">
                    {s.title}
                  </h2>
                  {s.body}
                </CardContent>
              </Card>
            ))}
          </div>

          <p className="text-[11px] text-muted-foreground text-center mt-8">
            © {new Date().getFullYear()} Nukuconnect SA — Tous droits réservés.
          </p>
        </div>
      </main>
      <Footer />
      <MobileBottomNav />
    </div>
  );
}
