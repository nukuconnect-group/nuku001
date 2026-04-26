import SEO from "@/components/SEO";
import { useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import MobileBottomNav from "@/components/layout/MobileBottomNav";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import { Search, Sparkles, Sprout, ShoppingBasket, Bug, CloudRain, Wallet, Tractor, Bot } from "lucide-react";

type Category = "producer" | "buyer" | "tech" | "money";

interface FAQ {
  id: string;
  category: Category;
  question: string;
  answer: string;
}

const categories: { id: Category | "all"; label: string; icon: any }[] = [
  { id: "all", label: "Toutes", icon: Sparkles },
  { id: "producer", label: "Producteurs", icon: Sprout },
  { id: "buyer", label: "Acheteurs", icon: ShoppingBasket },
  { id: "tech", label: "Techniques agricoles", icon: Tractor },
  { id: "money", label: "Prix & ventes", icon: Wallet },
];

const FAQS: FAQ[] = [
  { id: "1", category: "producer", question: "Comment publier mon premier produit sur NukuConnect ?",
    answer: "Connectez-vous, allez dans votre tableau de bord fournisseur, cliquez sur « Publier », choisissez « Produit agricole », ajoutez 1 à 5 photos claires, le prix au kg/sac, le délai d'expédition et la zone de livraison. Le produit est validé par notre IA en quelques minutes." },
  { id: "2", category: "producer", question: "Pourquoi mon produit a été rejeté par la modération ?",
    answer: "Les motifs les plus fréquents : photos floues, description trop courte, prix incohérent, ou produit hors catégorie agricole. Consultez la page Modération pour voir le motif exact, corrigez et resoumettez — c'est gratuit." },
  { id: "3", category: "producer", question: "Comment proposer des prix de gros (rabais par quantité) ?",
    answer: "Sur la fiche produit, ajoutez des paliers : par exemple 1–9 sacs à 25 000 F, 10–49 à 22 000 F, 50+ à 20 000 F. Les acheteurs verront automatiquement le meilleur prix selon la quantité." },
  { id: "4", category: "buyer", question: "Comment vérifier qu'un produit est authentique ?",
    answer: "Cherchez le badge vert « Fournisseur vérifié » et scannez le QR code du lot via la page Traçabilité. Vous verrez l'origine, la date de récolte, les certifications et le parcours du produit." },
  { id: "5", category: "buyer", question: "Quels sont les modes de paiement acceptés ?",
    answer: "Mobile Money (Flooz, T-Money, MTN, Moov, Orange Money), carte bancaire et paiement à la livraison selon le fournisseur. Toutes les transactions sont sécurisées." },
  { id: "6", category: "buyer", question: "Combien de temps prend la livraison ?",
    answer: "Cela dépend du délai d'expédition affiché : « Immédiat », « Sous 24h » ou « Sous N jours ». Une fois expédié, vous suivez la livraison en temps réel sur la carte." },
  { id: "7", category: "tech", question: "Quand semer le maïs en Afrique de l'Ouest ?",
    answer: "Les périodes idéales sont : 1ʳᵉ saison de mars à mai (zone soudano-guinéenne), 2ᵉ saison d'août à septembre. Vérifiez l'humidité du sol (> 60 %) et les prévisions de pluie sur 15 jours avant de semer." },
  { id: "8", category: "tech", question: "Comment lutter contre la chenille légionnaire d'automne sur le maïs ?",
    answer: "Inspectez régulièrement les jeunes plants. Utilisez des pièges à phéromones, alternez avec du Bacillus thuringiensis (bio), et en dernier recours un insecticide homologué. Détruisez les résidus de récolte pour casser le cycle." },
  { id: "9", category: "tech", question: "Quel est le meilleur engrais pour la tomate ?",
    answer: "Au démarrage, NPK 15-15-15. Pendant la floraison/fructification, basculez vers NPK 12-24-12 enrichi en potassium. Compost organique 2 fois par cycle. Évitez l'excès d'azote qui favorise les feuilles au détriment des fruits." },
  { id: "10", category: "money", question: "Quels sont les prix moyens du cacao en 2026 ?",
    answer: "Les prix fluctuent fortement. Consultez quotidiennement la section « Tendances » de NukuConnect ou demandez à Nuku AI le « prix actuel du cacao ». Vendez par lots groupés pour obtenir un meilleur prix." },
  { id: "11", category: "money", question: "Comment retirer mes gains de NukuConnect ?",
    answer: "Allez dans Tableau de bord → Retraits, choisissez Mobile Money ou virement bancaire, indiquez le montant (minimum 5 000 F). Le retrait est traité sous 24–48 h ouvrées." },
  { id: "12", category: "tech", question: "Comment conserver mes récoltes pour éviter les pertes ?",
    answer: "Séchez les céréales à 12–14 % d'humidité avant stockage. Utilisez des sacs PICS hermétiques contre les charançons. Stockez dans un local frais, sec et ventilé. Surélevez sur palettes." },
];

const FAQNukuAI = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [activeCat, setActiveCat] = useState<Category | "all">("all");

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return FAQS.filter(f => {
      if (activeCat !== "all" && f.category !== activeCat) return false;
      if (!q) return true;
      return f.question.toLowerCase().includes(q) || f.answer.toLowerCase().includes(q);
    });
  }, [search, activeCat]);

  return (
    <div className="min-h-screen bg-background pb-20 lg:pb-0">
      <SEO
        url="/faq-nuku-ai"
        title="FAQ Nuku AI — Questions agricoles fréquentes"
        description="Trouvez des réponses claires en français sur l'agriculture, l'élevage, les prix et l'utilisation de NukuConnect. Posez votre question à Nuku AI."
      />
      <Header />

      <main className="container mx-auto px-3 sm:px-4 py-6 max-w-4xl">
        {/* Hero */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium mb-3">
            <Bot className="w-3.5 h-3.5" /> Assistant agricole intelligent
          </div>
          <h1 className="font-heading text-2xl sm:text-3xl font-bold text-foreground mb-2">
            FAQ Nuku AI
          </h1>
          <p className="text-sm text-muted-foreground max-w-2xl mx-auto">
            Producteurs et acheteurs : trouvez des réponses claires en français sur la culture,
            l'élevage, les prix du marché et l'utilisation de NukuConnect.
          </p>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher une question (ex : maïs, prix, livraison...)"
            className="pl-10 h-11 text-sm"
          />
        </div>

        {/* Categories */}
        <div className="flex flex-wrap gap-2 mb-6">
          {categories.map(c => {
            const Icon = c.icon;
            const active = activeCat === c.id;
            return (
              <button
                key={c.id}
                onClick={() => setActiveCat(c.id as any)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                  active
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card border-border text-muted-foreground hover:text-foreground hover:border-primary/50"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {c.label}
              </button>
            );
          })}
        </div>

        {/* Results count */}
        <p className="text-xs text-muted-foreground mb-3">
          {filtered.length} question{filtered.length !== 1 ? "s" : ""} trouvée{filtered.length !== 1 ? "s" : ""}
        </p>

        {/* FAQs */}
        {filtered.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Bug className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground mb-4">
                Aucune réponse pour « {search} »
              </p>
              <Button variant="hero" size="sm" onClick={() => navigate("/nuku-ai")} className="gap-2">
                <Sparkles className="w-4 h-4" /> Demander à Nuku AI
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Accordion type="single" collapsible className="space-y-2">
            {filtered.map(f => (
              <AccordionItem key={f.id} value={f.id} className="border border-border rounded-lg bg-card px-3">
                <AccordionTrigger className="text-sm font-medium text-left hover:no-underline py-3">
                  <div className="flex items-start gap-2 text-left">
                    <Badge variant="secondary" className="text-[9px] mt-0.5 capitalize flex-shrink-0">
                      {categories.find(c => c.id === f.category)?.label}
                    </Badge>
                    <span>{f.question}</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground leading-relaxed pb-3">
                  {f.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}

        {/* CTA bottom */}
        <Card className="mt-6 bg-gradient-to-r from-primary/5 to-accent/5 border-primary/20">
          <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row items-center gap-3 text-center sm:text-left">
            <div className="w-12 h-12 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-sm text-foreground mb-0.5">Vous ne trouvez pas votre réponse ?</h3>
              <p className="text-xs text-muted-foreground">
                Posez votre question directement à Nuku AI, notre assistant agricole IA.
              </p>
            </div>
            <Link to="/nuku-ai" className="flex-shrink-0">
              <Button variant="hero" size="sm" className="gap-1.5">
                <Bot className="w-4 h-4" /> Discuter avec Nuku AI
              </Button>
            </Link>
          </CardContent>
        </Card>
      </main>

      <Footer />
      <MobileBottomNav />
    </div>
  );
};

export default FAQNukuAI;
