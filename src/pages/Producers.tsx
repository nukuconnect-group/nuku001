import { useState } from "react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import MobileBottomNav from "@/components/layout/MobileBottomNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Search, 
  MapPin, 
  Star, 
  ShieldCheck, 
  MessageCircle,
  Filter,
  Users,
  Package,
  Navigation
} from "lucide-react";
import { Link } from "react-router-dom";

const producers = [
  {
    id: "1",
    name: "Kofi Mensah",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200",
    location: "Kara, Togo",
    country: "Togo",
    rating: 4.8,
    verified: true,
    products: 15,
    sector: "Céréales & Légumineuses",
    bio: "Producteur de maïs et de soja depuis plus de 10 ans. Spécialisé dans l'agriculture biologique.",
  },
  {
    id: "2",
    name: "Ama Koffi",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200",
    location: "Lomé, Togo",
    country: "Togo",
    rating: 4.9,
    verified: true,
    products: 23,
    sector: "Maraîchage",
    bio: "Spécialisée dans les légumes frais. Livraison quotidienne à Lomé et environs.",
  },
  {
    id: "3",
    name: "Yao Agbeko",
    avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200",
    location: "Atakpamé, Togo",
    country: "Togo",
    rating: 4.7,
    verified: true,
    products: 8,
    sector: "Tubercules",
    bio: "Expert en culture d'igname et de manioc. Techniques traditionnelles et modernes.",
  },
  {
    id: "4",
    name: "Kwame Asante",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200",
    location: "Accra, Ghana",
    country: "Ghana",
    rating: 4.6,
    verified: true,
    products: 12,
    sector: "Fruits",
    bio: "Production de mangues et d'agrumes de qualité export.",
  },
  {
    id: "5",
    name: "Fatou Diallo",
    avatar: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=200",
    location: "Dakar, Sénégal",
    country: "Sénégal",
    rating: 4.9,
    verified: true,
    products: 18,
    sector: "Aviculture",
    bio: "Élevage de volailles en plein air. Œufs et poulets fermiers.",
  },
  {
    id: "6",
    name: "Ibrahim Ouédraogo",
    avatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200",
    location: "Ouagadougou, Burkina Faso",
    country: "Burkina Faso",
    rating: 4.5,
    verified: false,
    products: 6,
    sector: "Riz & Céréales",
    bio: "Riziculteur dans les bas-fonds. Production biologique certifiée.",
  },
];

const sectors = [
  "Tous",
  "Céréales & Légumineuses",
  "Maraîchage",
  "Tubercules",
  "Fruits",
  "Aviculture",
  "Élevage",
  "Riz & Céréales",
];

const countries = [
  "Tous les pays",
  "Togo",
  "Ghana",
  "Bénin",
  "Côte d'Ivoire",
  "Burkina Faso",
  "Sénégal",
  "Mali",
  "Niger",
];

const Producers = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSector, setSelectedSector] = useState("Tous");
  const [selectedCountry, setSelectedCountry] = useState("Tous les pays");
  const [useNearby, setUseNearby] = useState(false);

  const filteredProducers = producers.filter((producer) => {
    const matchesSearch =
      producer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      producer.location.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSector =
      selectedSector === "Tous" || producer.sector === selectedSector;
    const matchesCountry =
      selectedCountry === "Tous les pays" || producer.country === selectedCountry;
    return matchesSearch && matchesSector && matchesCountry;
  });

  return (
    <div className="min-h-screen bg-background pb-20 lg:pb-0">
      <Header />

      {/* Hero */}
      <section className="pt-24 pb-12 bg-gradient-earth">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <Badge variant="secondary" className="mb-4">
              <Users className="w-3 h-3 mr-1" />
              Réseau de producteurs
            </Badge>
            <h1 className="font-heading text-3xl lg:text-4xl font-bold text-foreground mb-4">
              Découvrez nos producteurs
            </h1>
            <p className="text-muted-foreground mb-8">
              Connectez-vous directement avec des agriculteurs locaux vérifiés et achetez en confiance.
            </p>

            {/* Search */}
            <div className="relative max-w-xl mx-auto">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                placeholder="Rechercher un producteur..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 h-12 text-base"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Filters */}
      <section className="py-6 border-b border-border bg-card">
        <div className="container mx-auto px-4">
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
            {/* Sectors */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 lg:pb-0 w-full lg:w-auto">
              <Filter className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              {sectors.slice(0, 5).map((sector) => (
                <Button
                  key={sector}
                  variant={selectedSector === sector ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedSector(sector)}
                  className="whitespace-nowrap"
                >
                  {sector}
                </Button>
              ))}
            </div>
            
            {/* Country & Location */}
            <div className="flex items-center gap-3">
              <Button 
                variant={useNearby ? "default" : "outline"} 
                size="sm"
                onClick={() => setUseNearby(!useNearby)}
                className="gap-2"
              >
                <Navigation className="w-4 h-4" />
                À proximité
              </Button>
              <Select value={selectedCountry} onValueChange={setSelectedCountry}>
                <SelectTrigger className="w-48">
                  <MapPin className="w-4 h-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {countries.map((country) => (
                    <SelectItem key={country} value={country}>
                      {country}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </section>

      {/* Producers Grid */}
      <section className="py-12">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <p className="text-muted-foreground">
              <span className="font-semibold text-foreground">{filteredProducers.length}</span> producteurs trouvés
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProducers.map((producer) => (
              <Card key={producer.id} className="group hover:shadow-elevated transition-all duration-300">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4 mb-4">
                    <img
                      src={producer.avatar}
                      alt={producer.name}
                      className="w-16 h-16 rounded-full object-cover"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-heading font-semibold text-foreground truncate">
                          {producer.name}
                        </h3>
                        {producer.verified && (
                          <ShieldCheck className="w-5 h-5 text-primary flex-shrink-0" />
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground mb-2">
                        <MapPin className="w-3 h-3" />
                        {producer.location}
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1">
                          <Star className="w-4 h-4 text-accent fill-accent" />
                          <span className="text-sm font-medium">{producer.rating}</span>
                        </div>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Package className="w-3 h-3" />
                          {producer.products} produits
                        </div>
                      </div>
                    </div>
                  </div>

                  <Badge variant="secondary" className="mb-3">
                    {producer.sector}
                  </Badge>

                  <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                    {producer.bio}
                  </p>

                  <div className="flex gap-2">
                    <Link to={`/producteurs/${producer.id}`} className="flex-1">
                      <Button variant="outline" className="w-full">
                        Voir profil
                      </Button>
                    </Link>
                    <Button variant="hero" className="gap-2">
                      <MessageCircle className="w-4 h-4" />
                      Contacter
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <Footer />
      <MobileBottomNav />
    </div>
  );
};

export default Producers;