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
import { useCart } from "@/components/cart/CartContext";
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
  CheckCircle2,
  AlertTriangle,
  Send,
  User,
  ChevronLeft,
  ChevronRight,
  Zap,
  Tag
} from "lucide-react";
import { products } from "@/data/marketplace";
import { useToast } from "@/hooks/use-toast";
import QRScanner from "@/components/QRScanner";

const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { addItem } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [showContactForm, setShowContactForm] = useState(false);
  const [message, setMessage] = useState("");
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [showQRCode, setShowQRCode] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const product = products.find((p) => p.id === id);

  // Mock traceability status - some products are certified, some not
  const isTraceable = product ? ["1", "3", "5", "6", "8", "9", "10"].includes(product.id) : false;

  // Image carousel helpers
  const images = product?.images || (product ? [product.image] : []);
  const nextImage = () => setCurrentImageIndex((prev) => (prev + 1) % images.length);
  const prevImage = () => setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);

  const handleAddToCart = () => {
    if (product) {
      addItem(product, quantity);
      toast({
        title: "Ajouté au panier",
        description: `${quantity} ${product.unit}(s) de ${product.name}`,
      });
    }
  };

  const getPromoBadge = () => {
    if (!product?.promoType) return null;
    
    const badges: Record<string, { label: string; className: string; icon: any }> = {
      promo: { label: "PROMO", className: "bg-destructive text-destructive-foreground", icon: Tag },
      flash: { label: "FLASH", className: "bg-orange-500 text-white", icon: Zap },
      soldes: { label: "SOLDES", className: "bg-purple-500 text-white", icon: Tag },
      nouveau: { label: "NEW", className: "bg-blue-500 text-white", icon: Zap },
    };
    
    const badge = badges[product.promoType];
    if (!badge) return null;
    
    return (
      <Badge className={`${badge.className} gap-1 font-bold animate-pulse`}>
        <badge.icon className="w-3 h-3" />
        {badge.label}
      </Badge>
    );
  };

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

  const handleSendMessage = () => {
    if (!message.trim()) return;
    
    toast({
      title: "Message envoyé !",
      description: `Votre message a été envoyé à ${product.producer.name}. Vous recevrez une réponse dans vos messages.`,
    });
    setMessage("");
    setShowContactForm(false);
    
    // Redirect to messages after a short delay
    setTimeout(() => {
      navigate("/messages");
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-background pb-14 lg:pb-0">
      <Header />

      <main>
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
            {/* Image Section with Carousel */}
            <div className="space-y-4">
              <div className="relative aspect-square rounded-2xl overflow-hidden bg-muted">
                <img
                  src={images[currentImageIndex]}
                  alt={product.name}
                  className="w-full h-full object-cover transition-all duration-300"
                />
                
                {/* Carousel Navigation */}
                {images.length > 1 && (
                  <>
                    <button 
                      onClick={prevImage}
                      className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-card/80 backdrop-blur-sm flex items-center justify-center hover:bg-card transition-colors"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button 
                      onClick={nextImage}
                      className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-card/80 backdrop-blur-sm flex items-center justify-center hover:bg-card transition-colors"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                    
                    {/* Dots Indicator */}
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                      {images.map((_, idx) => (
                        <button
                          key={idx}
                          onClick={() => setCurrentImageIndex(idx)}
                          className={`w-2 h-2 rounded-full transition-all ${
                            idx === currentImageIndex 
                              ? "bg-primary w-6" 
                              : "bg-card/80"
                          }`}
                        />
                      ))}
                    </div>
                  </>
                )}

                {/* Badges */}
                <div className="absolute top-4 left-4 flex flex-col gap-2">
                  {getPromoBadge()}
                  {product.discount && (
                    <Badge className="bg-destructive text-destructive-foreground font-bold">
                      -{product.discount}%
                    </Badge>
                  )}
                  {product.isOrganic && (
                    <Badge className="bg-primary text-primary-foreground gap-1">
                      <Leaf className="w-3 h-3" />
                      BIO
                    </Badge>
                  )}
                  {isTraceable ? (
                    <Badge className="bg-green-600 text-white gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      Traçable
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500 gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      Non certifié
                    </Badge>
                  )}
                </div>

                <div className="absolute top-4 right-4 flex gap-2">
                  <button className="w-10 h-10 rounded-full bg-card/80 backdrop-blur-sm flex items-center justify-center hover:bg-card transition-colors">
                    <Heart className="w-5 h-5 text-muted-foreground hover:text-destructive" />
                  </button>
                  <button className="w-10 h-10 rounded-full bg-card/80 backdrop-blur-sm flex items-center justify-center hover:bg-card transition-colors">
                    <Share2 className="w-5 h-5 text-muted-foreground" />
                  </button>
                </div>
              </div>

              {/* Thumbnails */}
              {images.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {images.map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentImageIndex(idx)}
                      className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-all ${
                        idx === currentImageIndex 
                          ? "border-primary" 
                          : "border-transparent opacity-60 hover:opacity-100"
                      }`}
                    >
                      <img src={img} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
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
              <div className="flex items-baseline gap-3 flex-wrap">
                <span className="font-heading text-3xl lg:text-4xl font-bold text-primary">
                  {formatPrice(product.price)} FCFA
                </span>
                {product.originalPrice && (
                  <span className="text-xl text-muted-foreground line-through">
                    {formatPrice(product.originalPrice)} FCFA
                  </span>
                )}
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
                  <Button variant="hero" className="flex-1 gap-2" onClick={handleAddToCart}>
                    <ShoppingCart className="w-4 h-4" />
                    Ajouter au panier
                  </Button>
                </div>
              </div>

              {/* Contact Form */}
              {showContactForm && (
                <Card className="animate-fade-in">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <MessageCircle className="w-5 h-5 text-primary" />
                      Envoyer un message à {product.producer.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Textarea
                      placeholder={`Bonjour ${product.producer.name}, je suis intéressé par votre ${product.name}...`}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      className="min-h-[100px]"
                    />
                    <Button variant="hero" className="w-full gap-2" onClick={handleSendMessage}>
                      <Send className="w-4 h-4" />
                      Envoyer le message
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
                      <Button variant="outline" size="sm" className="gap-2">
                        <User className="w-4 h-4" />
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
            <Card className={isTraceable ? "border-primary/50" : "border-yellow-500/50"}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <QrCode className="w-5 h-5 text-primary" />
                  Traçabilité du produit
                  {isTraceable ? (
                    <Badge className="ml-2 bg-green-600">Certifié</Badge>
                  ) : (
                    <Badge variant="outline" className="ml-2 text-yellow-600 border-yellow-500">Non certifié</Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isTraceable ? (
                  <>
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
                    <div className="mt-6 pt-6 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
                      <p className="text-sm text-muted-foreground">
                        Scannez le QR code pour plus de détails sur ce produit
                      </p>
                      <div className="flex gap-2">
                        <Button variant="outline" className="gap-2" onClick={() => setShowQRCode(true)}>
                          <QrCode className="w-4 h-4" />
                          Afficher QR Code
                        </Button>
                        <Button variant="hero" className="gap-2" onClick={() => setShowQRScanner(true)}>
                          <QrCode className="w-4 h-4" />
                          Scanner
                        </Button>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-6">
                    <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
                    <h3 className="font-heading font-semibold text-lg mb-2">Produit non certifié traçable</h3>
                    <p className="text-muted-foreground mb-4 max-w-md mx-auto">
                      Ce produit n'a pas encore été certifié par notre système de traçabilité. 
                      Contactez le vendeur pour plus d'informations sur l'origine du produit.
                    </p>
                    <Button variant="outline" className="gap-2" onClick={() => setShowContactForm(true)}>
                      <MessageCircle className="w-4 h-4" />
                      Demander la traçabilité
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* QR Code Display Modal */}
          {showQRCode && (
            <div className="fixed inset-0 bg-foreground/50 flex items-center justify-center z-50 p-4" onClick={() => setShowQRCode(false)}>
              <Card className="max-w-sm w-full" onClick={e => e.stopPropagation()}>
                <CardHeader>
                  <CardTitle className="text-center">QR Code de traçabilité</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col items-center">
                  <div className="w-48 h-48 bg-white p-4 rounded-xl mb-4">
                    <img 
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=TRC-00${product.id}`} 
                      alt="QR Code"
                      className="w-full h-full"
                    />
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">Code: TRC-00{product.id}</p>
                  <p className="text-xs text-center text-muted-foreground">
                    Scannez ce code pour vérifier la traçabilité du produit
                  </p>
                  <Button variant="outline" className="mt-4" onClick={() => setShowQRCode(false)}>
                    Fermer
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </main>

      <QRScanner 
        isOpen={showQRScanner} 
        onClose={() => setShowQRScanner(false)}
        onScan={(code) => {
          console.log("Scanned code:", code);
        }}
      />

      <Footer />
      <MobileBottomNav />
    </div>
  );
};

export default ProductDetail;
