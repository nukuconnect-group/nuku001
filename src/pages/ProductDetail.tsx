import { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import MobileBottomNav from "@/components/layout/MobileBottomNav";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
  ArrowLeft, 
  Leaf, 
  MapPin, 
  Star, 
  ShieldCheck, 
  MessageCircle, 
  ShoppingCart,
  Heart,
  Share2,
  QrCode,
  Truck,
  Clock,
  Package,
  CheckCircle2
} from "lucide-react";
import { products } from "@/data/marketplace";

const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [quantity, setQuantity] = useState(1);
  const [showContactForm, setShowContactForm] = useState(false);
  const [message, setMessage] = useState("");

  const product = products.find((p) => p.id === id);

  if (!product) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-20 text-center">
          <h1 className="font-heading text-2xl font-bold text-foreground mb-4">
            Produit non trouvé
          </h1>
          <Link to="/marketplace">
            <Button variant="hero">Retour au marketplace</Button>
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("fr-FR").format(price);
  };

  const totalPrice = product.price * quantity;

  return (
    <div className="min-h-screen bg-background pb-20 lg:pb-0">
      <Header />

      <main className="pt-20 lg:pt-24">
        {/* Breadcrumb */}
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
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12">
            {/* Image Section */}
            <div className="space-y-4">
              <div className="relative aspect-square rounded-2xl overflow-hidden bg-muted">
                <img
                  src={product.image}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
                {product.isOrganic && (
                  <Badge className="absolute top-4 left-4 bg-primary text-primary-foreground gap-1">
                    <Leaf className="w-3 h-3" />
                    BIO
                  </Badge>
                )}
                <div className="absolute top-4 right-4 flex gap-2">
                  <button className="w-10 h-10 rounded-full bg-card/80 backdrop-blur-sm flex items-center justify-center hover:bg-card transition-colors">
                    <Heart className="w-5 h-5 text-muted-foreground hover:text-destructive" />
                  </button>
                  <button className="w-10 h-10 rounded-full bg-card/80 backdrop-blur-sm flex items-center justify-center hover:bg-card transition-colors">
                    <Share2 className="w-5 h-5 text-muted-foreground" />
                  </button>
                </div>
              </div>
            </div>

            {/* Details Section */}
            <div className="space-y-6">
              {/* Category & Location */}
              <div className="flex items-center gap-3 flex-wrap">
                <Badge variant="secondary" className="capitalize">
                  {product.category}
                </Badge>
                <span className="flex items-center gap-1 text-sm text-muted-foreground">
                  <MapPin className="w-4 h-4" />
                  {product.location}
                </span>
              </div>

              {/* Title */}
              <h1 className="font-heading text-3xl lg:text-4xl font-bold text-foreground">
                {product.name}
              </h1>

              {/* Price */}
              <div className="flex items-baseline gap-2">
                <span className="font-heading text-3xl lg:text-4xl font-bold text-primary">
                  {formatPrice(product.price)} FCFA
                </span>
                <span className="text-muted-foreground">/ {product.unit}</span>
              </div>

              {/* Description */}
              <p className="text-muted-foreground leading-relaxed">
                {product.description}
              </p>

              {/* Stock Info */}
              <div className="flex items-center gap-6 py-4 border-y border-border">
                <div className="flex items-center gap-2">
                  <Package className="w-5 h-5 text-primary" />
                  <span className="text-sm">
                    <span className="font-semibold text-foreground">{product.quantity}</span>{" "}
                    {product.unit}s disponibles
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Truck className="w-5 h-5 text-primary" />
                  <span className="text-sm text-muted-foreground">Livraison disponible</span>
                </div>
              </div>

              {/* Quantity & Order */}
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <label className="text-sm font-medium text-foreground">Quantité:</label>
                  <div className="flex items-center">
                    <button
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="w-10 h-10 rounded-l-lg border border-border bg-muted hover:bg-muted/80 flex items-center justify-center"
                    >
                      -
                    </button>
                    <Input
                      type="number"
                      value={quantity}
                      onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-20 h-10 text-center rounded-none border-x-0"
                      min={1}
                      max={product.quantity}
                    />
                    <button
                      onClick={() => setQuantity(Math.min(product.quantity, quantity + 1))}
                      className="w-10 h-10 rounded-r-lg border border-border bg-muted hover:bg-muted/80 flex items-center justify-center"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div className="p-4 bg-muted rounded-xl">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-muted-foreground">Total estimé:</span>
                    <span className="font-heading text-2xl font-bold text-primary">
                      {formatPrice(totalPrice)} FCFA
                    </span>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    className="flex-1 gap-2"
                    onClick={() => setShowContactForm(!showContactForm)}
                  >
                    <MessageCircle className="w-4 h-4" />
                    Contacter le vendeur
                  </Button>
                  <Button variant="hero" className="flex-1 gap-2">
                    <ShoppingCart className="w-4 h-4" />
                    Commander
                  </Button>
                </div>
              </div>

              {/* Contact Form */}
              {showContactForm && (
                <Card className="animate-fade-in">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Envoyer un message</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Textarea
                      placeholder="Bonjour, je suis intéressé par votre produit..."
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      className="min-h-[100px]"
                    />
                    <Button variant="hero" className="w-full gap-2">
                      <MessageCircle className="w-4 h-4" />
                      Envoyer
                    </Button>
                  </CardContent>
                </Card>
              )}

              {/* Producer Card */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <img
                      src={product.producer.avatar}
                      alt={product.producer.name}
                      className="w-14 h-14 rounded-full object-cover"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-heading font-semibold text-foreground">
                          {product.producer.name}
                        </span>
                        {product.producer.verified && (
                          <ShieldCheck className="w-5 h-5 text-primary" />
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <Star className="w-4 h-4 text-accent fill-accent" />
                        <span className="text-sm font-medium">{product.producer.rating}</span>
                        <span className="text-sm text-muted-foreground">· Producteur vérifié</span>
                      </div>
                    </div>
                    <Link to={`/producteurs/${product.producer.name}`}>
                      <Button variant="outline" size="sm">
                        Voir profil
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Traceability Section */}
          <div className="mt-12">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <QrCode className="w-5 h-5 text-primary" />
                  Traçabilité du produit
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <MapPin className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-medium text-foreground">Origine</h4>
                      <p className="text-sm text-muted-foreground">{product.location}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Clock className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-medium text-foreground">Date de récolte</h4>
                      <p className="text-sm text-muted-foreground">{product.createdAt}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Leaf className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-medium text-foreground">Mode de culture</h4>
                      <p className="text-sm text-muted-foreground">
                        {product.isOrganic ? "Agriculture biologique" : "Agriculture conventionnelle"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <CheckCircle2 className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-medium text-foreground">Certifications</h4>
                      <p className="text-sm text-muted-foreground">
                        {product.isOrganic ? "Bio certifié" : "Standard qualité"}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="mt-6 pt-6 border-t border-border flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    Scannez le QR code pour plus de détails sur ce produit
                  </p>
                  <Button variant="outline" className="gap-2">
                    <QrCode className="w-4 h-4" />
                    Afficher QR Code
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <Footer />
      <MobileBottomNav />
    </div>
  );
};

export default ProductDetail;
