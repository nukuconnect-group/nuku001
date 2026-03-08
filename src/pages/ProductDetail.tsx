import { useState, useMemo } from "react";
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
import { useLanguage } from "@/contexts/LanguageContext";
import { useProduct } from "@/hooks/useProducts";
import { 
  ArrowLeft, Leaf, MapPin, Star, ShieldCheck, MessageCircle, ShoppingCart,
  Heart, Share2, Truck, Package, Send, User, ChevronLeft, ChevronRight,
  Loader2
} from "lucide-react";
import { products as mockProducts } from "@/data/marketplace";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import ReviewSection from "@/components/product/ReviewSection";

const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { addItem } = useCart();
  const { t, formatPrice } = useLanguage();
  const [quantity, setQuantity] = useState(1);
  const [showContactForm, setShowContactForm] = useState(false);
  const [message, setMessage] = useState("");
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // Try DB product first, fallback to mock
  const isUUID = id && id.length > 10;
  const { data: dbProduct, isLoading } = useProduct(isUUID ? id! : "");
  const mockProduct = mockProducts.find((p) => p.id === id);
  const product = dbProduct || mockProduct;

  const images = product?.images?.length ? product.images : (product ? [product.image] : []);
  const nextImage = () => setCurrentImageIndex((prev) => (prev + 1) % images.length);
  const prevImage = () => setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);

  const handleAddToCart = () => {
    if (product) {
      addItem(product, quantity);
      toast({ title: t("product.addedToCart"), description: `${quantity} ${product.unit}(s) de ${product.name}` });
    }
  };

  const handleSendMessage = async () => {
    if (!message.trim() || !product) return;
    
    // Check if user is logged in
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      toast({ title: "Connexion requise", description: "Connectez-vous pour envoyer un message", variant: "destructive" });
      navigate("/auth");
      return;
    }

    try {
      // Get buyer profile
      const { data: buyerProfile } = await supabase.from("profiles").select("id").eq("user_id", session.user.id).single();
      if (!buyerProfile) throw new Error("Profile not found");

      const sellerId = product.producer.id;

      // Check for existing conversation
      const { data: existingConv } = await supabase
        .from("conversations")
        .select("id")
        .eq("buyer_id", buyerProfile.id)
        .eq("seller_id", sellerId)
        .maybeSingle();

      let conversationId = existingConv?.id;

      if (!conversationId) {
        // Create new conversation
        const { data: newConv, error: convError } = await supabase
          .from("conversations")
          .insert({ buyer_id: buyerProfile.id, seller_id: sellerId, product_id: product.id })
          .select("id")
          .single();
        if (convError) throw convError;
        conversationId = newConv.id;
      }

      // Send message
      const { error: msgError } = await supabase.from("messages").insert({
        conversation_id: conversationId,
        sender_id: buyerProfile.id,
        content: message,
      });
      if (msgError) throw msgError;

      toast({ title: t("product.messageSent"), description: `Message envoyé à ${product.producer.name}` });
      setMessage("");
      setShowContactForm(false);
      setTimeout(() => navigate("/messages"), 1000);
    } catch (error: any) {
      console.error("Send message error:", error);
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    }
  };

  if (isLoading && isUUID) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
        <MobileBottomNav />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-20 text-center">
          <h1 className="font-heading text-2xl font-bold text-foreground mb-4">{t("product.notFound")}</h1>
          <Link to="/marketplace"><Button variant="hero">{t("product.backToMp")}</Button></Link>
        </div>
        <Footer />
      </div>
    );
  }

  const totalPrice = product.price * quantity;

  return (
    <div className="min-h-screen bg-background pb-14 lg:pb-0">
      <Header />
      <main>
        <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4">
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" /><span className="text-xs sm:text-sm">{t("product.back")}</span>
          </button>
        </div>

        <div className="container mx-auto px-3 sm:px-4 pb-8 sm:pb-12">
          <div className="grid lg:grid-cols-2 gap-4 sm:gap-8 lg:gap-12">
            {/* Image Section */}
            <div className="space-y-4">
              <div className="relative aspect-square rounded-2xl overflow-hidden bg-muted">
                <img src={images[currentImageIndex] || product.image} alt={product.name} className="w-full h-full object-cover transition-all duration-300" />
                {images.length > 1 && (
                  <>
                    <button onClick={prevImage} className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-card/80 backdrop-blur-sm flex items-center justify-center hover:bg-card transition-colors">
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button onClick={nextImage} className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-card/80 backdrop-blur-sm flex items-center justify-center hover:bg-card transition-colors">
                      <ChevronRight className="w-5 h-5" />
                    </button>
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                      {images.map((_, idx) => (
                        <button key={idx} onClick={() => setCurrentImageIndex(idx)}
                          className={`w-2 h-2 rounded-full transition-all ${idx === currentImageIndex ? "bg-primary w-6" : "bg-card/80"}`} />
                      ))}
                    </div>
                  </>
                )}
                {/* Only 2 badges: BIO and discount */}
                <div className="absolute top-4 left-4 flex flex-col gap-2">
                  {product.isOrganic && (
                    <Badge className="bg-primary text-primary-foreground gap-1"><Leaf className="w-3 h-3" />BIO</Badge>
                  )}
                  {product.discount && (
                    <Badge className="bg-destructive text-destructive-foreground font-bold">-{product.discount}%</Badge>
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
              {images.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {images.map((img, idx) => (
                    <button key={idx} onClick={() => setCurrentImageIndex(idx)}
                      className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-all ${idx === currentImageIndex ? "border-primary" : "border-transparent opacity-60 hover:opacity-100"}`}>
                      <img src={img} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Details */}
            <div className="space-y-6">
              <div className="flex items-center gap-3 flex-wrap">
                <Badge variant="secondary" className="capitalize">{product.category}</Badge>
                <span className="flex items-center gap-1 text-sm text-muted-foreground"><MapPin className="w-4 h-4" />{product.location}</span>
              </div>
              <h1 className="font-heading text-xl sm:text-3xl lg:text-4xl font-bold text-foreground">{product.name}</h1>
              <div className="flex items-baseline gap-2 sm:gap-3 flex-wrap">
                <span className="font-heading text-2xl sm:text-3xl lg:text-4xl font-bold text-primary">{formatPrice(product.price)}</span>
                {product.originalPrice && (
                  <span className="text-xl text-muted-foreground line-through">{formatPrice(product.originalPrice)}</span>
                )}
                <span className="text-muted-foreground">/ {product.unit}</span>
              </div>
              <p className="text-muted-foreground leading-relaxed">{product.description}</p>

              <div className="flex items-center gap-6 py-4 border-y border-border">
                <div className="flex items-center gap-2">
                  <Package className="w-5 h-5 text-primary" />
                  <span className="text-sm"><span className="font-semibold text-foreground">{product.quantity}</span> {product.unit}s {t("product.available")}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Truck className="w-5 h-5 text-primary" />
                  <span className="text-sm text-muted-foreground">{t("product.deliveryAvailable")}</span>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <label className="text-sm font-medium text-foreground">{t("product.quantity")}</label>
                  <div className="flex items-center">
                    <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="w-10 h-10 rounded-l-lg border border-border bg-muted hover:bg-muted/80 flex items-center justify-center">-</button>
                    <Input type="number" value={quantity} onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))} className="w-20 h-10 text-center rounded-none border-x-0" min={1} max={product.quantity} />
                    <button onClick={() => setQuantity(Math.min(product.quantity, quantity + 1))} className="w-10 h-10 rounded-r-lg border border-border bg-muted hover:bg-muted/80 flex items-center justify-center">+</button>
                  </div>
                </div>
                <div className="p-4 bg-muted rounded-xl">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-muted-foreground">{t("product.estimatedTotal")}</span>
                    <span className="font-heading text-2xl font-bold text-primary">{formatPrice(totalPrice)}</span>
                  </div>
                </div>
                <div className="flex gap-3">
                  <Button variant="outline" className="flex-1 gap-2" onClick={() => setShowContactForm(!showContactForm)}>
                    <MessageCircle className="w-4 h-4" />{t("product.contactSeller")}
                  </Button>
                  <Button variant="hero" className="flex-1 gap-2" onClick={handleAddToCart}>
                    <ShoppingCart className="w-4 h-4" />{t("product.addToCart")}
                  </Button>
                </div>
              </div>

              {showContactForm && (
                <Card className="animate-fade-in">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <MessageCircle className="w-5 h-5 text-primary" />
                      {t("product.sendMessage")} {product.producer.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Textarea placeholder={`Bonjour ${product.producer.name}...`} value={message} onChange={(e) => setMessage(e.target.value)} className="min-h-[100px]" />
                    <Button variant="hero" className="w-full gap-2" onClick={handleSendMessage}>
                      <Send className="w-4 h-4" />{t("product.send")}
                    </Button>
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3 sm:gap-4">
                    <img src={product.producer.avatar} alt={product.producer.name} className="w-10 h-10 sm:w-14 sm:h-14 rounded-full object-cover" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-heading font-semibold text-sm sm:text-base text-foreground truncate">{product.producer.name}</span>
                        {product.producer.verified && <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5 text-primary flex-shrink-0" />}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Star className="w-3.5 h-3.5 text-accent fill-accent" />
                        <span className="text-xs sm:text-sm font-medium">{product.producer.rating}</span>
                      </div>
                      <span className="text-[10px] text-muted-foreground">Fournisseur</span>
                    </div>
                    <Link to={`/producteurs/${product.producer.name}`}>
                      <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                        <User className="w-3.5 h-3.5" /><span className="hidden sm:inline">{t("product.viewProfile")}</span>
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>

              {/* Reviews Section */}
              <ReviewSection productId={product.id} />
            </div>
          </div>
        </div>
      </main>
      <Footer />
      <MobileBottomNav />
    </div>
  );
};

export default ProductDetail;
