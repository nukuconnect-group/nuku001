import { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import MobileBottomNav from "@/components/layout/MobileBottomNav";
import ProductCard from "@/components/marketplace/ProductCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { 
  ArrowLeft, 
  MapPin, 
  Star, 
  ShieldCheck, 
  MessageCircle, 
  Calendar,
  Package,
  ShoppingBag,
  Send
} from "lucide-react";
import { products } from "@/data/marketplace";
import { useToast } from "@/hooks/use-toast";

const ProducerProfile = () => {
  const { name } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [message, setMessage] = useState("");
  const [showContactForm, setShowContactForm] = useState(false);

  // Find producer by name (URL encoded)
  const decodedName = decodeURIComponent(name || "");
  const producerProducts = products.filter(p => p.producer.name === decodedName);
  const producer = producerProducts[0]?.producer;

  if (!producer) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-20 text-center">
          <h1 className="font-heading text-2xl font-bold text-foreground mb-4">
            Producteur non trouvé
          </h1>
          <Link to="/producteurs">
            <Button variant="hero">Voir tous les producteurs</Button>
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  const handleSendMessage = () => {
    if (!message.trim()) return;
    
    toast({
      title: "Message envoyé !",
      description: `Votre message a été envoyé à ${producer.name}`,
    });
    setMessage("");
    setShowContactForm(false);
    
    setTimeout(() => {
      navigate("/messages");
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-background pb-14 lg:pb-0">
      <Header />

      <main>
        {/* Back Button */}
        <div className="container mx-auto px-4 py-4">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">Retour</span>
          </button>
        </div>

        <div className="container mx-auto px-4 pb-12">
          {/* Producer Header */}
          <Card className="mb-8">
            <CardContent className="p-6 lg:p-8">
              <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
                <img
                  src={producer.avatar}
                  alt={producer.name}
                  className="w-24 h-24 lg:w-32 lg:h-32 rounded-full object-cover border-4 border-primary/20"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h1 className="font-heading text-2xl lg:text-3xl font-bold text-foreground">
                      {producer.name}
                    </h1>
                    {producer.verified && (
                      <Badge className="bg-primary text-primary-foreground gap-1">
                        <ShieldCheck className="w-3 h-3" />
                        Vérifié
                      </Badge>
                    )}
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-4">
                    <span className="flex items-center gap-1">
                      <Star className="w-4 h-4 text-accent fill-accent" />
                      <span className="font-medium text-foreground">{producer.rating}</span>
                      /5
                    </span>
                    {producer.joinedDate && (
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        Membre depuis {new Date(producer.joinedDate).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
                      </span>
                    )}
                  </div>

                  {producer.bio && (
                    <p className="text-muted-foreground mb-4">{producer.bio}</p>
                  )}

                  <div className="flex flex-wrap gap-4">
                    <Button variant="hero" className="gap-2" onClick={() => navigate(`/messages?seller=${encodeURIComponent(producer.name)}`)}>
                      <MessageCircle className="w-4 h-4" />
                      Discuter
                    </Button>
                  </div>
                </div>

                {/* Stats */}
                <div className="flex md:flex-col gap-6 md:gap-4">
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-2 mb-1">
                      <Package className="w-5 h-5 text-primary" />
                      <span className="font-heading text-2xl font-bold text-foreground">
                        {producer.totalProducts || producerProducts.length}
                      </span>
                    </div>
                    <span className="text-sm text-muted-foreground">Produits</span>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-2 mb-1">
                      <ShoppingBag className="w-5 h-5 text-primary" />
                      <span className="font-heading text-2xl font-bold text-foreground">
                        {producer.totalSales || 0}
                      </span>
                    </div>
                    <span className="text-sm text-muted-foreground">Ventes</span>
                  </div>
                </div>
              </div>

              {/* Contact Form */}
              {showContactForm && (
                <div className="mt-6 p-4 bg-muted rounded-xl animate-fade-in">
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <MessageCircle className="w-4 h-4 text-primary" />
                    Envoyer un message
                  </h3>
                  <Textarea
                    placeholder={`Bonjour ${producer.name}, je suis intéressé par vos produits...`}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="mb-3"
                    rows={3}
                  />
                  <Button variant="hero" className="gap-2" onClick={handleSendMessage}>
                    <Send className="w-4 h-4" />
                    Envoyer
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Location Card */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-primary" />
                Localisation
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-muted rounded-xl p-4 flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <MapPin className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-foreground">
                    {producerProducts[0]?.location || "Togo"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Livraison disponible dans la région
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Products Section */}
          <div>
            <h2 className="font-heading text-xl lg:text-2xl font-bold text-foreground mb-6">
              Produits de {producer.name} ({producerProducts.length})
            </h2>
            
            {producerProducts.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
                {producerProducts.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-muted rounded-xl">
                <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  Aucun produit disponible pour le moment
                </p>
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />
      <MobileBottomNav />
    </div>
  );
};

export default ProducerProfile;
