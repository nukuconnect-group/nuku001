import SEO from "@/components/SEO";
import { useState } from "react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import MobileBottomNav from "@/components/layout/MobileBottomNav";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import {
  HelpCircle, Search, ShoppingCart, User, CreditCard, Truck,
  MessageCircle, Shield, Settings, ChevronDown, ChevronUp, Mail
} from "lucide-react";

const faqCategories = [
  {
    icon: User,
    title: "Compte & Inscription",
    questions: [
      {
        q: "Comment créer un compte sur NUKUCONNECT ?",
        a: "Rendez-vous sur la page d'inscription, choisissez votre rôle (Fournisseur ou Acheteur), remplissez le formulaire avec vos informations et validez. Votre compte sera créé immédiatement."
      },
      {
        q: "Comment modifier mes informations de profil ?",
        a: "Connectez-vous à votre compte, accédez à votre tableau de bord et cliquez sur l'icône de profil en haut à droite. Vous pouvez modifier votre nom, photo, téléphone et localisation."
      },
      {
        q: "J'ai oublié mon mot de passe, que faire ?",
        a: "Sur la page de connexion, cliquez sur « Mot de passe oublié ». Un email de réinitialisation vous sera envoyé à l'adresse associée à votre compte."
      },
      {
        q: "Puis-je passer d'un compte acheteur à un compte producteur ?",
        a: "Oui ! Depuis votre tableau de bord acheteur, cliquez sur « Devenir producteur ». Votre compte sera mis à jour et vous pourrez commencer à vendre vos produits."
      },
    ]
  },
  {
    icon: ShoppingCart,
    title: "Commandes & Achats",
    questions: [
      {
        q: "Comment passer une commande ?",
        a: "Parcourez le marketplace, ajoutez les produits souhaités au panier, choisissez votre méthode de livraison et de paiement, puis validez votre commande."
      },
      {
        q: "Comment suivre ma commande ?",
        a: "Allez dans « Suivre mes commandes » depuis votre tableau de bord. Vous verrez l'état en temps réel de chaque commande : en attente, en préparation, en transit ou livrée."
      },
      {
        q: "Puis-je annuler une commande ?",
        a: "Vous pouvez demander l'annulation tant que la commande est en statut « En attente ». Contactez le vendeur via la messagerie pour coordonner l'annulation."
      },
      {
        q: "Comment télécharger ma facture ?",
        a: "Dans le suivi de commande, sélectionnez la commande souhaitée puis cliquez sur le bouton « Facture » pour générer et télécharger votre facture au format PDF."
      },
    ]
  },
  {
    icon: CreditCard,
    title: "Paiements",
    questions: [
      {
        q: "Quels moyens de paiement sont acceptés ?",
        a: "NUKUCONNECT accepte Mobile Money (Flooz, T-Money), les cartes bancaires (Visa, Mastercard), et les virements bancaires. Le paiement à la livraison est aussi disponible pour certaines zones."
      },
      {
        q: "Mon paiement est-il sécurisé ?",
        a: "Oui, toutes les transactions sont sécurisées par chiffrement SSL/TLS. Vos données de paiement ne sont jamais stockées sur nos serveurs."
      },
      {
        q: "Quand suis-je débité ?",
        a: "Le débit est effectué au moment de la validation de votre commande. En cas d'annulation, le remboursement est traité sous 48-72 heures."
      },
    ]
  },
  {
    icon: Truck,
    title: "Livraison",
    questions: [
      {
        q: "Quelles sont les zones de livraison ?",
        a: "Nous livrons dans les principales villes du Togo (Lomé, Kara, Sokodé, Atakpamé, etc.) et progressivement dans toute l'Afrique de l'Ouest."
      },
      {
        q: "Quel est le délai de livraison ?",
        a: "Les délais varient selon la zone : 24-48h pour Lomé, 2-5 jours pour les autres villes. Le délai estimé est indiqué sur chaque fiche produit."
      },
      {
        q: "Puis-je choisir le retrait sur place ?",
        a: "Oui, lors de la commande vous pouvez choisir le retrait sur place chez le producteur si cette option est disponible pour le produit."
      },
    ]
  },
  {
    icon: Settings,
    title: "Producteurs / Fournisseurs",
    questions: [
      {
        q: "Comment publier un produit ?",
        a: "Depuis votre tableau de bord producteur, cliquez sur « Ajouter un produit ». Remplissez les détails (nom, prix, quantité, photos, catégorie) et publiez. Votre produit sera visible immédiatement sur le marketplace."
      },
      {
        q: "Combien de produits puis-je publier ?",
        a: "Le nombre de produits dépend de votre abonnement : 3 produits en plan Gratuit, 15 en plan Starter, 50 en plan Pro et illimité en plan Enterprise."
      },
      {
        q: "Comment gérer mes commandes reçues ?",
        a: "Les commandes apparaissent dans l'onglet « Commandes » de votre tableau de bord. Vous pouvez confirmer, expédier ou marquer comme livrée chaque commande."
      },
      {
        q: "Qu'est-ce que la traçabilité ?",
        a: "Le module Traçabilité vous permet de documenter le parcours de vos produits de la production à la vente. Les acheteurs peuvent scanner un QR code pour vérifier l'origine et la qualité du produit."
      },
    ]
  },
  {
    icon: Shield,
    title: "Sécurité & Confidentialité",
    questions: [
      {
        q: "Mes données sont-elles protégées ?",
        a: "Oui, nous appliquons les meilleures pratiques en matière de sécurité : chiffrement des données, connexions HTTPS, et politique stricte de confidentialité."
      },
      {
        q: "Comment signaler un problème ou un abus ?",
        a: "Utilisez le bouton « Signaler » disponible sur chaque commande ou profil, ou contactez-nous directement via la page Contact ou par email."
      },
      {
        q: "Comment supprimer mon compte ?",
        a: "Contactez notre support à contact@nukuconnect.com avec votre demande de suppression. Votre compte et vos données seront supprimés sous 48h."
      },
    ]
  },
];

const Help = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [openItems, setOpenItems] = useState<Record<string, boolean>>({});

  const toggleItem = (key: string) => {
    setOpenItems(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const filteredCategories = faqCategories.map(cat => ({
    ...cat,
    questions: cat.questions.filter(
      q => q.q.toLowerCase().includes(searchQuery.toLowerCase()) || q.a.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })).filter(cat => cat.questions.length > 0);

  return (
    <div className="min-h-screen bg-background pb-14 lg:pb-0">
      <SEO url="/aide" title="Centre d'Aide et FAQ" description="Trouvez des réponses à toutes vos questions sur NUKUCONNECT. FAQ, guides d'utilisation et support client." />
      <Header />
      <main>
        <div className="bg-primary/5 border-b border-border py-8 sm:py-12">
          <div className="container mx-auto px-4 text-center">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <HelpCircle className="w-7 h-7 text-primary" />
            </div>
            <h1 className="font-heading text-2xl sm:text-3xl font-bold text-foreground mb-2">
              Centre d'aide
            </h1>
            <p className="text-sm text-muted-foreground max-w-md mx-auto mb-6">
              Trouvez rapidement des réponses à vos questions sur NUKUCONNECT.
            </p>

            <div className="max-w-lg mx-auto relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                placeholder="Rechercher une question..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-12 h-12 text-sm rounded-xl"
              />
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 py-8 sm:py-12 max-w-4xl">
          <div className="space-y-6 sm:space-y-8">
            {filteredCategories.map((category, catIdx) => (
              <div key={catIdx}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <category.icon className="w-5 h-5 text-primary" />
                  </div>
                  <h2 className="font-heading text-base sm:text-lg font-bold text-foreground">{category.title}</h2>
                </div>

                <div className="space-y-2">
                  {category.questions.map((item, qIdx) => {
                    const key = `${catIdx}-${qIdx}`;
                    const isOpen = openItems[key];
                    return (
                      <Card key={key} className="overflow-hidden">
                        <button
                          onClick={() => toggleItem(key)}
                          className="w-full p-4 flex items-center justify-between text-left hover:bg-muted/30 transition-colors"
                        >
                          <span className="font-medium text-sm text-foreground pr-4">{item.q}</span>
                          {isOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />}
                        </button>
                        {isOpen && (
                          <CardContent className="px-4 pb-4 pt-0">
                            <p className="text-sm text-muted-foreground leading-relaxed">{item.a}</p>
                          </CardContent>
                        )}
                      </Card>
                    );
                  })}
                </div>
              </div>
            ))}

            {filteredCategories.length === 0 && (
              <div className="text-center py-12">
                <HelpCircle className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                <h3 className="font-heading font-semibold text-lg mb-2">Aucun résultat</h3>
                <p className="text-sm text-muted-foreground mb-4">Essayez avec d'autres mots-clés ou contactez-nous directement.</p>
                <Link to="/contact">
                  <Button variant="hero" className="gap-2">
                    <Mail className="w-4 h-4" />Contacter le support
                  </Button>
                </Link>
              </div>
            )}
          </div>

          {/* Contact CTA */}
          <Card className="mt-10 bg-gradient-to-r from-primary/5 to-secondary/5 border-primary/10">
            <CardContent className="p-6 sm:p-8 text-center">
              <MessageCircle className="w-10 h-10 text-primary mx-auto mb-3" />
              <h3 className="font-heading text-lg font-bold text-foreground mb-1">Vous n'avez pas trouvé votre réponse ?</h3>
              <p className="text-sm text-muted-foreground mb-4">Notre équipe support est disponible pour vous aider.</p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link to="/contact">
                  <Button variant="hero" className="gap-2">
                    <Mail className="w-4 h-4" />Nous contacter
                  </Button>
                </Link>
                <a href="mailto:support@nukuconnect.com">
                  <Button variant="outline" className="gap-2">
                    <Mail className="w-4 h-4" />support@nukuconnect.com
                  </Button>
                </a>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
      <MobileBottomNav />
    </div>
  );
};

export default Help;
