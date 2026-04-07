import SEO from "@/components/SEO";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import MobileBottomNav from "@/components/layout/MobileBottomNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { 
  QrCode, Search, MapPin, Calendar, Leaf, Truck,
  CheckCircle2, Clock, Package, Shield, Camera, FileText,
  Scan, ArrowRight, Star, Crown, Zap, Lock, Loader2,
  Factory, Store, Eye, Sprout, Warehouse, ShoppingCart, MessageCircle
} from "lucide-react";
import QRScanner from "@/components/QRScanner";

// ===== Traceability timeline stages =====
interface TraceStage {
  id: string;
  label: string;
  icon: any;
  description: string;
}

const TRACE_STAGES: TraceStage[] = [
  { id: "semis", label: "Semis / Plantation", icon: Sprout, description: "Graines plantées, début du cycle de culture" },
  { id: "croissance", label: "Croissance", icon: Leaf, description: "Phase de développement et entretien de la culture" },
  { id: "recolte", label: "Récolte", icon: Factory, description: "Cueillette ou moisson du produit" },
  { id: "controle", label: "Contrôle qualité", icon: Shield, description: "Vérification de la qualité et conformité" },
  { id: "conditionnement", label: "Conditionnement", icon: Package, description: "Emballage et préparation pour le transport" },
  { id: "stockage", label: "Stockage", icon: Warehouse, description: "Entreposage dans des conditions optimales" },
  { id: "expedition", label: "Expédition", icon: Truck, description: "Transport vers le point de vente ou l'acheteur" },
  { id: "vente", label: "Mise en vente", icon: Store, description: "Disponible sur la marketplace" },
  { id: "livre", label: "Livré au client", icon: ShoppingCart, description: "Produit remis à l'acheteur final" },
];

// ===== Pricing plans for traceability =====
const tracePlans = [
  {
    id: "basic",
    name: "Essentiel",
    price: 2500,
    period: "mois",
    icon: Zap,
    description: "Pour les petits producteurs",
    features: [
      "5 produits traçables",
      "QR codes basiques",
      "Timeline simplifiée",
      "Support email",
    ],
    limitations: ["Pas de certifications", "Pas d'export PDF"],
    color: "border-border",
  },
  {
    id: "pro",
    name: "Professionnel",
    price: 7500,
    period: "mois",
    icon: Star,
    popular: true,
    description: "Pour les producteurs actifs",
    features: [
      "25 produits traçables",
      "QR codes personnalisés",
      "Timeline complète (9 étapes)",
      "Certifications bio/qualité",
      "Export PDF des rapports",
      "Support prioritaire",
    ],
    limitations: [],
    color: "border-primary",
  },
  {
    id: "enterprise",
    name: "Entreprise",
    price: 20000,
    period: "mois",
    icon: Crown,
    description: "Pour les coopératives & exportateurs",
    features: [
      "Produits illimités",
      "QR codes avec logo",
      "Timeline complète + GPS",
      "Toutes certifications",
      "Export PDF + Excel",
      "API d'intégration",
      "Support dédié 24/7",
      "Audit de traçabilité",
    ],
    limitations: [],
    color: "border-accent",
  },
];

// Demo traceable products
interface TraceableProduct {
  id: string;
  name: string;
  image: string;
  producer: string;
  origin: string;
  harvestDate: string;
  isOrganic: boolean;
  certifications: string[];
  status: "verified" | "pending" | "in-transit";
  currentStage: number; // index in TRACE_STAGES
  timeline: { date: string; event: string; location: string; stageIndex: number }[];
  batchNumber?: string;
  weight?: string;
  temperature?: string;
  humidity?: string;
}

const traceableProducts: TraceableProduct[] = [
  {
    id: "TRC-001",
    name: "Maïs Jaune Premium",
    image: "https://images.unsplash.com/photo-1551754655-cd27e38d2076?w=400",
    producer: "Kofi Mensah",
    origin: "Kara, Togo",
    harvestDate: "2025-01-15",
    isOrganic: true,
    certifications: ["Bio Certifié", "Sans OGM", "Commerce Équitable"],
    status: "verified",
    currentStage: 7,
    batchNumber: "LOT-2025-KR-0045",
    weight: "500 kg",
    temperature: "22°C",
    humidity: "45%",
    timeline: [
      { date: "2024-10-05", event: "Semis effectué — variété Obatanpa", location: "Ferme Mensah, Kara", stageIndex: 0 },
      { date: "2024-11-20", event: "Croissance — traitement bio appliqué", location: "Ferme Mensah, Kara", stageIndex: 1 },
      { date: "2025-01-15", event: "Récolte manuelle terminée", location: "Ferme Mensah, Kara", stageIndex: 2 },
      { date: "2025-01-16", event: "Contrôle qualité — taux d'humidité 14%", location: "Centre de tri, Kara", stageIndex: 3 },
      { date: "2025-01-17", event: "Conditionnement en sacs de 50kg", location: "Centre NUKUCONNECT, Kara", stageIndex: 4 },
      { date: "2025-01-18", event: "Stockage en entrepôt ventilé", location: "Entrepôt NUKUCONNECT", stageIndex: 5 },
      { date: "2025-01-19", event: "Expédition vers Lomé", location: "En transit Kara → Lomé", stageIndex: 6 },
      { date: "2025-01-20", event: "Disponible sur la marketplace", location: "Marketplace NUKUCONNECT", stageIndex: 7 },
    ],
  },
  {
    id: "TRC-002",
    name: "Tomates Fraîches",
    image: "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=400",
    producer: "Ama Koffi",
    origin: "Lomé, Togo",
    harvestDate: "2025-01-28",
    isOrganic: false,
    certifications: ["Qualité Standard", "Hygiène Contrôlée"],
    status: "in-transit",
    currentStage: 6,
    batchNumber: "LOT-2025-LM-0112",
    weight: "200 kg",
    temperature: "18°C",
    humidity: "60%",
    timeline: [
      { date: "2025-01-10", event: "Semis en pépinière", location: "Ferme Koffi, Lomé", stageIndex: 0 },
      { date: "2025-01-18", event: "Repiquage et croissance", location: "Ferme Koffi, Lomé", stageIndex: 1 },
      { date: "2025-01-25", event: "Récolte à maturité optimale", location: "Ferme Koffi, Lomé", stageIndex: 2 },
      { date: "2025-01-26", event: "Tri et contrôle — calibre A", location: "Centre de tri, Lomé", stageIndex: 3 },
      { date: "2025-01-27", event: "Conditionnement en caisses", location: "Centre de tri, Lomé", stageIndex: 4 },
      { date: "2025-01-28", event: "Expédition en cours — véhicule réfrigéré", location: "En transit", stageIndex: 6 },
    ],
  },
  {
    id: "TRC-003",
    name: "Ignames Blancs",
    image: "https://images.unsplash.com/photo-1590165482129-1b8b27698780?w=400",
    producer: "Yao Agbeko",
    origin: "Atakpamé, Togo",
    harvestDate: "2025-01-20",
    isOrganic: true,
    certifications: ["Bio Certifié", "Origine Contrôlée"],
    status: "verified",
    currentStage: 8,
    batchNumber: "LOT-2025-AT-0078",
    weight: "1000 kg",
    timeline: [
      { date: "2024-09-01", event: "Mise en terre des semenceaux", location: "Ferme Agbeko, Atakpamé", stageIndex: 0 },
      { date: "2024-12-15", event: "Croissance — buttage et sarclage", location: "Ferme Agbeko, Atakpamé", stageIndex: 1 },
      { date: "2025-01-15", event: "Récolte complète", location: "Ferme Agbeko, Atakpamé", stageIndex: 2 },
      { date: "2025-01-16", event: "Contrôle — absence de parasites", location: "Centre NUKUCONNECT", stageIndex: 3 },
      { date: "2025-01-17", event: "Conditionnement", location: "Centre NUKUCONNECT", stageIndex: 4 },
      { date: "2025-01-18", event: "Stockage contrôlé", location: "Entrepôt NUKUCONNECT", stageIndex: 5 },
      { date: "2025-01-19", event: "Expédition", location: "Atakpamé → Lomé", stageIndex: 6 },
      { date: "2025-01-20", event: "Disponible sur la marketplace", location: "Marketplace NUKUCONNECT", stageIndex: 7 },
      { date: "2025-01-22", event: "Livré à l'acheteur", location: "Lomé, Togo", stageIndex: 8 },
    ],
  },
];

const Traceability = () => {
  const navigate = useNavigate();
  const { formatPrice } = useLanguage();
  const { toast } = useToast();
  const [searchCode, setSearchCode] = useState("");
  const [searchResult, setSearchResult] = useState<TraceableProduct | null>(null);
  const [showScanner, setShowScanner] = useState(false);
  const [activeTab, setActiveTab] = useState("trace");
  const [requestForm, setRequestForm] = useState({ name: "", phone: "", products: "", location: "" });
  const [requestLoading, setRequestLoading] = useState(false);

  const handleSearch = () => {
    const product = traceableProducts.find((p) => p.id === searchCode.toUpperCase());
    setSearchResult(product || null);
    if (!product && searchCode.trim()) {
      toast({ title: "Produit introuvable", description: "Vérifiez le code de traçabilité et réessayez.", variant: "destructive" });
    }
  };

  const handleRequestSubmit = async () => {
    if (!requestForm.name.trim() || !requestForm.phone.trim()) {
      toast({ title: "Champs requis", description: "Veuillez remplir tous les champs obligatoires.", variant: "destructive" });
      return;
    }
    setRequestLoading(true);
    // Simulate submission
    await new Promise((r) => setTimeout(r, 1500));
    toast({ title: "Demande envoyée ✓", description: "Notre équipe vous contactera sous 48h pour mettre en place la traçabilité." });
    setRequestForm({ name: "", phone: "", products: "", location: "" });
    setRequestLoading(false);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "verified":
        return <Badge className="bg-primary text-primary-foreground gap-1"><CheckCircle2 className="w-3 h-3" /> Vérifié</Badge>;
      case "pending":
        return <Badge variant="secondary" className="gap-1"><Clock className="w-3 h-3" /> En attente</Badge>;
      case "in-transit":
        return <Badge variant="outline" className="gap-1 border-blue-500 text-blue-600"><Truck className="w-3 h-3" /> En transit</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20 lg:pb-0">
      <SEO url="/tracabilite" title="Traçabilité des Produits" description="Vérifiez l'origine et le parcours de vos produits agricoles. Traçabilité complète de la production à la livraison." image="https://images.unsplash.com/photo-1574943320219-553eb213f72d?w=1200&h=630&fit=crop&q=80" />
      <Header />

      {/* Hero */}
      <section className="pt-20 pb-10 bg-gradient-earth relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(var(--primary)/0.08),transparent_70%)]" />
        <div className="container mx-auto px-4 relative">
          <div className="max-w-3xl mx-auto text-center">
            <Badge variant="secondary" className="mb-4 gap-1">
              <QrCode className="w-3 h-3" />
              Traçabilité NUKUCONNECT
            </Badge>
            <h1 className="font-heading text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground mb-3">
              De la ferme à votre table
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground mb-6 max-w-xl mx-auto">
              Suivez le parcours complet de chaque produit : semis, récolte, contrôle qualité, conditionnement, transport et livraison. Transparence totale.
            </p>

            {/* Search */}
            <div className="flex flex-col sm:flex-row gap-2 max-w-xl mx-auto">
              <div className="relative flex-1">
                <QrCode className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Code de traçabilité (ex: TRC-001)"
                  value={searchCode}
                  onChange={(e) => setSearchCode(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  className="pl-11 h-11 text-sm"
                />
              </div>
              <Button variant="outline" size="lg" onClick={() => setShowScanner(true)} className="gap-2 h-11">
                <Scan className="w-4 h-4" />Scanner
              </Button>
              <Button variant="hero" size="lg" onClick={handleSearch} className="gap-2 h-11">
                <Search className="w-4 h-4" />Rechercher
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              Essayez : TRC-001, TRC-002 ou TRC-003
            </p>
          </div>
        </div>
      </section>

      {/* Main Tabs */}
      <section className="py-6">
        <div className="container mx-auto px-4">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="max-w-5xl mx-auto">
            <TabsList className="grid w-full grid-cols-4 h-auto">
              <TabsTrigger value="trace" className="text-xs sm:text-sm py-2">
                <Eye className="w-3.5 h-3.5 mr-1 hidden sm:inline" />Tracer
              </TabsTrigger>
              <TabsTrigger value="products" className="text-xs sm:text-sm py-2">
                <Package className="w-3.5 h-3.5 mr-1 hidden sm:inline" />Produits
              </TabsTrigger>
              <TabsTrigger value="request" className="text-xs sm:text-sm py-2">
                <FileText className="w-3.5 h-3.5 mr-1 hidden sm:inline" />Demander
              </TabsTrigger>
              <TabsTrigger value="pricing" className="text-xs sm:text-sm py-2">
                <Crown className="w-3.5 h-3.5 mr-1 hidden sm:inline" />Tarifs
              </TabsTrigger>
            </TabsList>

            {/* TAB: Trace result */}
            <TabsContent value="trace" className="mt-6">
              {searchResult ? (
                <Card className="overflow-hidden">
                  <CardHeader className="pb-3">
                    <div className="flex flex-col sm:flex-row items-start gap-4">
                      <img src={searchResult.image} alt={searchResult.name} className="w-20 h-20 rounded-xl object-cover" />
                      <div className="flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <CardTitle className="text-lg">{searchResult.name}</CardTitle>
                            <p className="text-sm text-muted-foreground">Code: {searchResult.id}</p>
                            {searchResult.batchNumber && (
                              <p className="text-xs text-muted-foreground font-mono">Lot: {searchResult.batchNumber}</p>
                            )}
                          </div>
                          {getStatusBadge(searchResult.status)}
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Info Grid */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                      <div className="flex items-start gap-2 p-3 bg-muted rounded-lg">
                        <MapPin className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-[10px] text-muted-foreground">Origine</p>
                          <p className="text-sm font-medium">{searchResult.origin}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2 p-3 bg-muted rounded-lg">
                        <Calendar className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-[10px] text-muted-foreground">Récolte</p>
                          <p className="text-sm font-medium">{new Date(searchResult.harvestDate).toLocaleDateString("fr-FR")}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2 p-3 bg-muted rounded-lg">
                        <Leaf className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-[10px] text-muted-foreground">Culture</p>
                          <p className="text-sm font-medium">{searchResult.isOrganic ? "Biologique 🌿" : "Conventionnel"}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2 p-3 bg-muted rounded-lg">
                        <Shield className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-[10px] text-muted-foreground">Producteur</p>
                          <p className="text-sm font-medium">{searchResult.producer}</p>
                        </div>
                      </div>
                    </div>

                    {/* Extra details */}
                    {(searchResult.weight || searchResult.temperature || searchResult.humidity) && (
                      <div className="grid grid-cols-3 gap-3">
                        {searchResult.weight && (
                          <div className="text-center p-3 bg-primary/5 rounded-lg">
                            <p className="text-[10px] text-muted-foreground">Poids</p>
                            <p className="text-sm font-bold text-primary">{searchResult.weight}</p>
                          </div>
                        )}
                        {searchResult.temperature && (
                          <div className="text-center p-3 bg-primary/5 rounded-lg">
                            <p className="text-[10px] text-muted-foreground">Température</p>
                            <p className="text-sm font-bold text-primary">{searchResult.temperature}</p>
                          </div>
                        )}
                        {searchResult.humidity && (
                          <div className="text-center p-3 bg-primary/5 rounded-lg">
                            <p className="text-[10px] text-muted-foreground">Humidité</p>
                            <p className="text-sm font-bold text-primary">{searchResult.humidity}</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Certifications */}
                    <div>
                      <h4 className="font-medium text-sm mb-2">Certifications</h4>
                      <div className="flex flex-wrap gap-2">
                        {searchResult.certifications.map((cert, i) => (
                          <Badge key={i} variant="secondary" className="gap-1 text-xs">
                            <CheckCircle2 className="w-3 h-3 text-primary" />{cert}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {/* Full timeline with stage progress bar */}
                    <div>
                      <h4 className="font-medium text-sm mb-3">Parcours complet du produit</h4>
                      
                      {/* Stage progress bar */}
                      <div className="mb-6 overflow-x-auto pb-2">
                        <div className="flex items-center min-w-[600px]">
                          {TRACE_STAGES.map((stage, i) => {
                            const StageIcon = stage.icon;
                            const isCompleted = i <= searchResult.currentStage;
                            const isCurrent = i === searchResult.currentStage;
                            return (
                              <div key={stage.id} className="flex items-center flex-1">
                                <div className="flex flex-col items-center">
                                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                    isCurrent ? "bg-primary text-primary-foreground ring-4 ring-primary/20" :
                                    isCompleted ? "bg-primary text-primary-foreground" :
                                    "bg-muted text-muted-foreground"
                                  }`}>
                                    <StageIcon className="w-3.5 h-3.5" />
                                  </div>
                                  <p className={`text-[9px] mt-1 text-center max-w-[60px] leading-tight ${
                                    isCompleted ? "text-primary font-medium" : "text-muted-foreground"
                                  }`}>{stage.label}</p>
                                </div>
                                {i < TRACE_STAGES.length - 1 && (
                                  <div className={`h-0.5 flex-1 mx-1 ${
                                    i < searchResult.currentStage ? "bg-primary" : "bg-border"
                                  }`} />
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Detailed timeline */}
                      <div className="relative">
                        {searchResult.timeline.map((event, i) => {
                          const stage = TRACE_STAGES[event.stageIndex];
                          const StageIcon = stage?.icon || Package;
                          return (
                            <div key={i} className="flex gap-3 pb-4 last:pb-0">
                              <div className="relative flex flex-col items-center">
                                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                                  <StageIcon className="w-3.5 h-3.5 text-primary" />
                                </div>
                                {i < searchResult.timeline.length - 1 && (
                                  <div className="w-0.5 flex-1 bg-primary/20 mt-1" />
                                )}
                              </div>
                              <div className="flex-1 pb-2">
                                <div className="flex items-center gap-2 mb-0.5">
                                  <p className="text-xs text-muted-foreground font-mono">
                                    {new Date(event.date).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}
                                  </p>
                                  <Badge variant="outline" className="text-[9px] px-1.5 py-0">{stage?.label}</Badge>
                                </div>
                                <p className="text-sm font-medium text-foreground">{event.event}</p>
                                <p className="text-xs text-muted-foreground flex items-center gap-1">
                                  <MapPin className="w-3 h-3" />{event.location}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="p-8 text-center">
                    <QrCode className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                    <h3 className="font-heading font-bold text-lg mb-2">Recherchez un produit</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Entrez un code de traçabilité ou scannez un QR code pour voir le parcours complet d'un produit.
                    </p>
                    <div className="flex justify-center gap-2">
                      <Button variant="outline" onClick={() => setShowScanner(true)} className="gap-2">
                        <Camera className="w-4 h-4" />Scanner QR
                      </Button>
                      <Button variant="hero" onClick={() => { setSearchCode("TRC-001"); const p = traceableProducts[0]; setSearchResult(p); }} className="gap-2">
                        <Eye className="w-4 h-4" />Voir un exemple
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* TAB: Products list */}
            <TabsContent value="products" className="mt-6">
              <h2 className="font-heading text-lg font-bold mb-4">Produits traçables ({traceableProducts.length})</h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {traceableProducts.map((product) => (
                  <Card key={product.id} className="hover:shadow-elevated transition-all cursor-pointer" onClick={() => {
                    setSearchCode(product.id);
                    setSearchResult(product);
                    setActiveTab("trace");
                  }}>
                    <CardContent className="p-4">
                      <div className="flex gap-3">
                        <img src={product.image} alt={product.name} className="w-16 h-16 rounded-lg object-cover" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between mb-1 gap-1">
                            <h3 className="font-medium text-sm text-foreground truncate">{product.name}</h3>
                            {getStatusBadge(product.status)}
                          </div>
                          <p className="text-xs text-muted-foreground">{product.producer} • {product.origin}</p>
                          <div className="flex items-center gap-2 mt-1.5">
                            <p className="text-[10px] text-primary font-mono">{product.id}</p>
                            <Badge variant="outline" className="text-[9px] px-1.5 py-0">
                              {TRACE_STAGES[product.currentStage]?.label}
                            </Badge>
                          </div>
                          {/* Mini progress */}
                          <div className="flex gap-0.5 mt-2">
                            {TRACE_STAGES.map((_, i) => (
                              <div key={i} className={`h-1 flex-1 rounded-full ${
                                i <= product.currentStage ? "bg-primary" : "bg-muted"
                              }`} />
                            ))}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* TAB: Request traceability */}
            <TabsContent value="request" className="mt-6">
              <Card>
                <CardContent className="p-6">
                  <h3 className="font-heading text-lg font-semibold mb-2">
                    Demander la traçabilité pour vos produits
                  </h3>
                  <p className="text-sm text-muted-foreground mb-6">
                    Offrez la transparence à vos clients en rendant vos produits traçables sur NUKUCONNECT. Remplissez le formulaire et notre équipe vous contactera.
                  </p>

                  <div className="space-y-4">
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium mb-2 block">Nom complet *</label>
                        <Input placeholder="Votre nom" value={requestForm.name}
                          onChange={(e) => setRequestForm({ ...requestForm, name: e.target.value })} />
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-2 block">Téléphone *</label>
                        <Input placeholder="+228 XX XX XX XX" value={requestForm.phone}
                          onChange={(e) => setRequestForm({ ...requestForm, phone: e.target.value })} />
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">Type de produits</label>
                      <Input placeholder="Ex: Maïs, Tomates, Volailles..." value={requestForm.products}
                        onChange={(e) => setRequestForm({ ...requestForm, products: e.target.value })} />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">Localisation</label>
                      <Input placeholder="Votre région" value={requestForm.location}
                        onChange={(e) => setRequestForm({ ...requestForm, location: e.target.value })} />
                    </div>
                    <Button variant="hero" className="w-full gap-2" onClick={handleRequestSubmit} disabled={requestLoading}>
                      {requestLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                      Envoyer ma demande
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* TAB: Pricing */}
            <TabsContent value="pricing" className="mt-6">
              <div className="text-center mb-6">
                <h2 className="font-heading text-xl sm:text-2xl font-bold mb-2">Tarifs Traçabilité</h2>
                <p className="text-sm text-muted-foreground max-w-xl mx-auto">
                  Choisissez le plan adapté à votre activité. La traçabilité augmente la confiance de vos clients et vos ventes.
                </p>
              </div>

              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {tracePlans.map((plan) => {
                  const PlanIcon = plan.icon;
                  return (
                    <Card key={plan.id} className={`relative overflow-hidden ${plan.color} ${plan.popular ? "border-2 shadow-lg" : ""}`}>
                      {plan.popular && (
                        <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-[10px] font-bold px-3 py-1 rounded-bl-lg">
                          POPULAIRE
                        </div>
                      )}
                      <CardContent className="p-5">
                        <div className="flex items-center gap-2 mb-3">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                            plan.popular ? "bg-primary text-primary-foreground" : "bg-muted"
                          }`}>
                            <PlanIcon className="w-5 h-5" />
                          </div>
                          <div>
                            <h3 className="font-heading font-bold text-base">{plan.name}</h3>
                            <p className="text-xs text-muted-foreground">{plan.description}</p>
                          </div>
                        </div>

                        <div className="mb-4">
                          <span className="text-2xl font-bold text-foreground">{formatPrice(plan.price)}</span>
                          <span className="text-sm text-muted-foreground">/{plan.period}</span>
                        </div>

                        <ul className="space-y-2 mb-5">
                          {plan.features.map((f, i) => (
                            <li key={i} className="flex items-start gap-2 text-xs">
                              <CheckCircle2 className="w-3.5 h-3.5 text-primary flex-shrink-0 mt-0.5" />
                              <span>{f}</span>
                            </li>
                          ))}
                          {plan.limitations.map((l, i) => (
                            <li key={`l-${i}`} className="flex items-start gap-2 text-xs text-muted-foreground">
                              <Lock className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                              <span>{l}</span>
                            </li>
                          ))}
                        </ul>

                        <Button
                          variant={plan.popular ? "hero" : "outline"}
                          className="w-full gap-2"
                          onClick={() => {
                            toast({ title: "Bientôt disponible", description: `Le plan ${plan.name} sera disponible très prochainement.` });
                          }}
                        >
                          <ArrowRight className="w-4 h-4" />
                          Souscrire
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {/* Custom pricing */}
              <Card className="mt-6 bg-muted/30">
                <CardContent className="p-5 text-center">
                  <Crown className="w-8 h-8 text-accent mx-auto mb-2" />
                  <h3 className="font-heading font-bold text-base mb-1">Besoin d'un plan sur mesure ?</h3>
                  <p className="text-xs text-muted-foreground mb-3">
                    Pour les coopératives, ONG et gouvernements : nous proposons des solutions personnalisées.
                  </p>
                  <Button variant="outline" onClick={() => navigate("/messages")} className="gap-2">
                    <MessageCircle className="w-4 h-4" />Nous contacter
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </section>

      {/* Why traceability */}
      <section className="py-10 bg-muted/50">
        <div className="container mx-auto px-4">
          <h2 className="font-heading text-xl font-bold text-center mb-6">
            Pourquoi la traçabilité ?
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-5xl mx-auto">
            {[
              { icon: Shield, title: "Confiance", desc: "Garantie d'origine et de qualité pour chaque produit." },
              { icon: Leaf, title: "Transparence", desc: "Méthodes de culture et certifications visibles." },
              { icon: Package, title: "Suivi complet", desc: "9 étapes de la production à la livraison." },
              { icon: CheckCircle2, title: "Qualité certifiée", desc: "Contrôles à chaque étape de la chaîne." },
            ].map((item, i) => {
              const Icon = item.icon;
              return (
                <Card key={i} className="text-center p-5">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="font-heading font-semibold text-sm mb-1">{item.title}</h3>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      <QRScanner 
        isOpen={showScanner} 
        onClose={() => setShowScanner(false)}
        onScan={(code) => {
          setSearchCode(code);
          const product = traceableProducts.find((p) => p.id === code.toUpperCase());
          setSearchResult(product || null);
          if (product) setActiveTab("trace");
        }}
      />

      <Footer />
      <MobileBottomNav />
    </div>
  );
};

export default Traceability;
