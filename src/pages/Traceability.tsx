import { useState } from "react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import MobileBottomNav from "@/components/layout/MobileBottomNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  QrCode, 
  Search, 
  MapPin, 
  Calendar, 
  Leaf, 
  Truck,
  CheckCircle2,
  Clock,
  Package,
  Shield,
  Camera,
  FileText
} from "lucide-react";

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
  timeline: {
    date: string;
    event: string;
    location: string;
  }[];
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
    certifications: ["Bio Certifié", "Sans OGM"],
    status: "verified",
    timeline: [
      { date: "2025-01-10", event: "Semis effectué", location: "Ferme Mensah, Kara" },
      { date: "2025-01-15", event: "Récolte", location: "Ferme Mensah, Kara" },
      { date: "2025-01-16", event: "Contrôle qualité", location: "Centre de tri, Kara" },
      { date: "2025-01-18", event: "Stockage", location: "Entrepôt NUKUCONNECT" },
      { date: "2025-01-20", event: "Disponible à la vente", location: "Marketplace" },
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
    certifications: ["Qualité Standard"],
    status: "in-transit",
    timeline: [
      { date: "2025-01-25", event: "Récolte", location: "Ferme Koffi, Lomé" },
      { date: "2025-01-26", event: "Conditionnement", location: "Centre de tri, Lomé" },
      { date: "2025-01-28", event: "Expédition en cours", location: "En transit" },
    ],
  },
];

const Traceability = () => {
  const [searchCode, setSearchCode] = useState("");
  const [searchResult, setSearchResult] = useState<TraceableProduct | null>(null);

  const handleSearch = () => {
    const product = traceableProducts.find((p) => p.id === searchCode);
    setSearchResult(product || null);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "verified":
        return <Badge className="bg-primary text-primary-foreground gap-1"><CheckCircle2 className="w-3 h-3" /> Vérifié</Badge>;
      case "pending":
        return <Badge variant="secondary" className="gap-1"><Clock className="w-3 h-3" /> En attente</Badge>;
      case "in-transit":
        return <Badge variant="outline" className="gap-1"><Truck className="w-3 h-3" /> En transit</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20 lg:pb-0">
      <Header />

      {/* Hero */}
      <section className="pt-24 pb-12 bg-gradient-earth">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <Badge variant="secondary" className="mb-4">
              <QrCode className="w-3 h-3 mr-1" />
              Traçabilité
            </Badge>
            <h1 className="font-heading text-3xl lg:text-4xl font-bold text-foreground mb-4">
              Traçabilité des produits
            </h1>
            <p className="text-muted-foreground mb-8">
              Suivez le parcours de vos produits de la ferme à votre table. 
              Transparence et confiance garanties.
            </p>

            {/* Search */}
            <div className="flex gap-2 max-w-xl mx-auto">
              <div className="relative flex-1">
                <QrCode className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  placeholder="Entrez le code de traçabilité (ex: TRC-001)"
                  value={searchCode}
                  onChange={(e) => setSearchCode(e.target.value.toUpperCase())}
                  className="pl-12 h-12 text-base"
                />
              </div>
              <Button variant="hero" size="lg" onClick={handleSearch} className="gap-2">
                <Search className="w-4 h-4" />
                Rechercher
              </Button>
            </div>

            <p className="text-sm text-muted-foreground mt-4">
              Essayez avec: TRC-001 ou TRC-002
            </p>
          </div>
        </div>
      </section>

      {/* Search Result */}
      {searchResult && (
        <section className="py-12">
          <div className="container mx-auto px-4">
            <Card className="max-w-4xl mx-auto">
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <img
                      src={searchResult.image}
                      alt={searchResult.name}
                      className="w-20 h-20 rounded-xl object-cover"
                    />
                    <div>
                      <CardTitle className="text-xl">{searchResult.name}</CardTitle>
                      <p className="text-muted-foreground">Code: {searchResult.id}</p>
                    </div>
                  </div>
                  {getStatusBadge(searchResult.status)}
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Info Grid */}
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                    <MapPin className="w-5 h-5 text-primary flex-shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">Origine</p>
                      <p className="font-medium">{searchResult.origin}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                    <Calendar className="w-5 h-5 text-primary flex-shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">Date de récolte</p>
                      <p className="font-medium">{searchResult.harvestDate}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                    <Leaf className="w-5 h-5 text-primary flex-shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">Type de culture</p>
                      <p className="font-medium">{searchResult.isOrganic ? "Biologique" : "Conventionnel"}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                    <Shield className="w-5 h-5 text-primary flex-shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">Producteur</p>
                      <p className="font-medium">{searchResult.producer}</p>
                    </div>
                  </div>
                </div>

                {/* Certifications */}
                <div>
                  <h4 className="font-medium mb-2">Certifications</h4>
                  <div className="flex flex-wrap gap-2">
                    {searchResult.certifications.map((cert, i) => (
                      <Badge key={i} variant="secondary" className="gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        {cert}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Timeline */}
                <div>
                  <h4 className="font-medium mb-4">Historique du produit</h4>
                  <div className="relative">
                    {searchResult.timeline.map((event, i) => (
                      <div key={i} className="flex gap-4 pb-4 last:pb-0">
                        <div className="relative">
                          <div className="w-3 h-3 rounded-full bg-primary" />
                          {i < searchResult.timeline.length - 1 && (
                            <div className="absolute top-3 left-1/2 -translate-x-1/2 w-0.5 h-full bg-border" />
                          )}
                        </div>
                        <div className="flex-1 pb-4">
                          <p className="text-sm text-muted-foreground">{event.date}</p>
                          <p className="font-medium">{event.event}</p>
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {event.location}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      )}

      {/* Tabs Section */}
      <section className="py-12">
        <div className="container mx-auto px-4">
          <Tabs defaultValue="verify" className="max-w-4xl mx-auto">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="verify">Vérifier un produit</TabsTrigger>
              <TabsTrigger value="request">Demander la traçabilité</TabsTrigger>
            </TabsList>

            <TabsContent value="verify" className="mt-6">
              <Card>
                <CardContent className="p-6">
                  <div className="grid md:grid-cols-2 gap-8">
                    <div>
                      <h3 className="font-heading text-lg font-semibold mb-4">Scanner le QR Code</h3>
                      <p className="text-muted-foreground mb-4">
                        Utilisez l'appareil photo de votre téléphone pour scanner le QR code présent sur l'emballage du produit.
                      </p>
                      <Button variant="outline" className="gap-2 w-full sm:w-auto">
                        <Camera className="w-4 h-4" />
                        Ouvrir le scanner
                      </Button>
                    </div>
                    <div className="border-t md:border-t-0 md:border-l border-border pt-6 md:pt-0 md:pl-8">
                      <h3 className="font-heading text-lg font-semibold mb-4">Entrer le code manuellement</h3>
                      <p className="text-muted-foreground mb-4">
                        Saisissez le code de traçabilité visible sur l'étiquette du produit.
                      </p>
                      <div className="flex gap-2">
                        <Input placeholder="TRC-XXXXX" />
                        <Button variant="hero">Vérifier</Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="request" className="mt-6">
              <Card>
                <CardContent className="p-6">
                  <h3 className="font-heading text-lg font-semibold mb-4">
                    Demander la traçabilité pour vos produits
                  </h3>
                  <p className="text-muted-foreground mb-6">
                    Vous êtes producteur et souhaitez offrir la traçabilité à vos clients ? 
                    Remplissez ce formulaire pour être contacté par notre équipe.
                  </p>

                  <div className="space-y-4">
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium mb-2 block">Nom complet</label>
                        <Input placeholder="Votre nom" />
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-2 block">Téléphone</label>
                        <Input placeholder="+228 XX XX XX XX" />
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">Type de produits</label>
                      <Input placeholder="Ex: Maïs, Tomates, Volailles..." />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">Localisation</label>
                      <Input placeholder="Votre région" />
                    </div>
                    <Button variant="hero" className="w-full gap-2">
                      <FileText className="w-4 h-4" />
                      Envoyer ma demande
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </section>

      {/* Features */}
      <section className="py-12 bg-muted/50">
        <div className="container mx-auto px-4">
          <h2 className="font-heading text-2xl font-bold text-center mb-8">
            Pourquoi la traçabilité ?
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
            <Card className="text-center p-6">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Shield className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-heading font-semibold mb-2">Confiance</h3>
              <p className="text-sm text-muted-foreground">
                Garantie d'origine et de qualité pour chaque produit.
              </p>
            </Card>
            <Card className="text-center p-6">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Leaf className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-heading font-semibold mb-2">Transparence</h3>
              <p className="text-sm text-muted-foreground">
                Méthodes de culture et certifications visibles.
              </p>
            </Card>
            <Card className="text-center p-6">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Package className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-heading font-semibold mb-2">Suivi</h3>
              <p className="text-sm text-muted-foreground">
                Historique complet du parcours du produit.
              </p>
            </Card>
            <Card className="text-center p-6">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-heading font-semibold mb-2">Qualité</h3>
              <p className="text-sm text-muted-foreground">
                Contrôles à chaque étape de la chaîne.
              </p>
            </Card>
          </div>
        </div>
      </section>

      <Footer />
      <MobileBottomNav />
    </div>
  );
};

export default Traceability;
