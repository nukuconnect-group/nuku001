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
import { useWishlist } from "@/hooks/useWishlist";
import { 
  ArrowLeft, Leaf, MapPin, Star, ShieldCheck, MessageCircle, ShoppingCart,
  Heart, Share2, Truck, Package, Send, User, ChevronLeft, ChevronRight,
  Loader2, DollarSign, CreditCard
} from "lucide-react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { type CurrencyCode } from "@/contexts/LanguageContext";
import { products as mockProducts } from "@/data/marketplace";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import ReviewSection from "@/components/product/ReviewSection";

const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { addItem } = useCart();
  const { t, formatPrice, currency, setCurrency } = useLanguage();
  const { isInWishlist, toggleWishlist, isAuthenticated } = useWishlist();
  const [quantity, setQuantity] = useState(1);
  const [showContactForm, setShowContactForm] = useState(false);
  const [message, setMessage] = useState("");
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isSending, setIsSending] = useState(false);

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

  const handleBuyNow = () => {
    if (product) {
      addItem(product, quantity);
      navigate("/panier");
    }
  };

  const handleOpenChat = () => {
    if (!product) return;
    const autoMessage = `Bonjour, je suis intéressé(e) par "${product.name}" (${formatPrice(product.price)}/${product.unit}) disponible à ${product.location}. Est-ce toujours disponible ?`;
    setMessage(autoMessage);
    setShowContactForm(true);
  };

  const handleSendAndRedirect = async () => {
    if (!product || !message.trim()) return;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      toast({ title: "Connexion requise", description: "Connectez-vous pour contacter le fournisseur", variant: "destructive" });
      navigate("/auth");
      return;
    }
    setIsSending(true);
    try {
      const { data: buyerProfile } = await supabase.from("profiles").select("id").eq("user_id", session.user.id).single();
      if (!buyerProfile) throw new Error("Profile not found");
      const sellerId = product.producer.id;
      const { data: existingConv } = await supabase.from("conversations").select("id").eq("buyer_id", buyerProfile.id).eq("seller_id", sellerId).maybeSingle();
      let conversationId = existingConv?.id;
      if (!conversationId) {
        const { data: newConv, error: convError } = await supabase.from("conversations").insert({ buyer_id: buyerProfile.id, seller_id: sellerId, product_id: product.id }).select("id").single();
        if (convError) throw convError;
        conversationId = newConv.id;
      }
      await supabase.from("messages").insert({ conversation_id: conversationId, sender_id: buyerProfile.id, content: message });
      toast({ title: "Message envoyé ✓", description: `Votre message a été envoyé à ${product.producer.name}` });
      setMessage("");
      setShowContactForm(false);
      navigate(`/messages?product=${product.id}&seller=${encodeURIComponent(product.producer.name)}`);
    } catch (error: any) {
      console.error("Send message error:", error);
      toast({ title: "Erreur", description: "Impossible d'envoyer le message", variant: "destructive" });
    } finally {
      setIsSending(false);
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
    <div className="min-h-screen bg-background pb-20 lg:pb-0">
      <Header />
      <main>
        {/* Back button */}
        <div className="container mx-auto px-3 sm:px-4 py-2 sm:py-4">
          <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" /><span className="text-xs sm:text-sm">{t("product.back")}</span>
          </button>
        </div>

        <div className="container mx-auto px-3 sm:px-4 pb-6 sm:pb-12">
          <div className="grid lg:grid-cols-2 gap-4 sm:gap-6 lg:gap-10">

            {/* ===== IMAGE SECTION ===== */}
            <div className="space-y-2 sm:space-y-3">
              {/* Main image — square, no rounded corners on mobile */}
              <div className="relative aspect-square overflow-hidden bg-muted rounded-none sm:rounded-lg">
                <img
                  src={images[currentImageIndex] || product.image}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
                {images.length > 1 && (
                  <>
                    <button onClick={prevImage} className="absolute left-1.5 sm:left-3 top-1/2 -translate-y-1/2 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-card/80 backdrop-blur-sm flex items-center justify-center hover:bg-card transition-colors">
                      <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
                    </button>
                    <button onClick={nextImage} className="absolute right-1.5 sm:right-3 top-1/2 -translate-y-1/2 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-card/80 backdrop-blur-sm flex items-center justify-center hover:bg-card transition-colors">
                      <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
                    </button>
                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                      {images.map((_, idx) => (
                        <button key={idx} onClick={() => setCurrentImageIndex(idx)}
                          className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full transition-all ${idx === currentImageIndex ? "bg-primary w-4 sm:w-6" : "bg-card/80"}`} />
                      ))}
                    </div>
                  </>
                )}
                {/* Badges */}
                <div className="absolute top-2 sm:top-3 left-2 sm:left-3 flex flex-col gap-1.5">
                  {product.isOrganic && (
                    <Badge className="bg-primary text-primary-foreground gap-1 text-[10px] sm:text-xs px-1.5 py-0.5"><Leaf className="w-2.5 h-2.5 sm:w-3 sm:h-3" />BIO</Badge>
                  )}
                  {product.discount && (
                    <Badge className="bg-destructive text-destructive-foreground font-bold text-[10px] sm:text-xs px-1.5 py-0.5">-{product.discount}%</Badge>
                  )}
                </div>
                <div className="absolute top-2 sm:top-3 right-2 sm:right-3 flex gap-1.5">
                  <button
                    onClick={() => {
                      if (!isAuthenticated) {
                        toast({ title: "Connexion requise", description: "Connectez-vous pour ajouter aux favoris", variant: "destructive" });
                        navigate("/auth");
                        return;
                      }
                      toggleWishlist(product.id);
                      toast({ title: isInWishlist(product.id) ? "Retiré des favoris" : "Ajouté aux favoris" });
                    }}
                    className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-card/80 backdrop-blur-sm flex items-center justify-center hover:bg-card transition-colors"
                  >
                    <Heart className={`w-4 h-4 sm:w-5 sm:h-5 ${isInWishlist(product.id) ? "text-destructive fill-destructive" : "text-muted-foreground"}`} />
                  </button>
                  <button className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-card/80 backdrop-blur-sm flex items-center justify-center hover:bg-card transition-colors">
                    <Share2 className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground" />
                  </button>
                </div>
              </div>

              {/* Thumbnails — square, no rounded */}
              {images.length > 1 && (
                <div className="flex gap-1.5 sm:gap-2 overflow-x-auto px-1 pb-1">
                  {images.map((img, idx) => (
                    <button key={idx} onClick={() => setCurrentImageIndex(idx)}
                      className={`flex-shrink-0 w-14 h-14 sm:w-16 sm:h-16 overflow-hidden border-2 transition-all rounded-none sm:rounded ${idx === currentImageIndex ? "border-primary" : "border-transparent opacity-60 hover:opacity-100"}`}>
                      <img src={img} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* ===== DETAILS SECTION ===== */}
            <div className="space-y-4 sm:space-y-5 px-1 sm:px-0">
              {/* Category + location + currency */}
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="secondary" className="capitalize text-[10px] sm:text-xs">{product.category}</Badge>
                <span className="flex items-center gap-1 text-[10px] sm:text-sm text-muted-foreground"><MapPin className="w-3 h-3 sm:w-3.5 sm:h-3.5" />{product.location}</span>
                <Select value={currency} onValueChange={(v) => setCurrency(v as CurrencyCode)}>
                  <SelectTrigger className="w-20 sm:w-24 h-6 sm:h-7 text-[9px] sm:text-[10px] ml-auto"><DollarSign className="w-3 h-3 mr-0.5" /><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="XOF" className="text-xs">FCFA</SelectItem>
                    <SelectItem value="USD" className="text-xs">USD $</SelectItem>
                    <SelectItem value="EUR" className="text-xs">EUR €</SelectItem>
                    <SelectItem value="GBP" className="text-xs">GBP £</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Title */}
              <h1 className="font-heading text-lg sm:text-2xl lg:text-3xl font-bold text-foreground leading-tight">{product.name}</h1>

              {/* Price */}
              <div className="flex items-baseline gap-2 flex-wrap">
                <span className="font-heading text-xl sm:text-2xl lg:text-3xl font-bold text-primary">{formatPrice(product.price)}</span>
                {product.originalPrice && (
                  <span className="text-sm sm:text-lg text-muted-foreground line-through">{formatPrice(product.originalPrice)}</span>
                )}
                <span className="text-xs sm:text-sm text-muted-foreground">/ {product.unit}</span>
              </div>

              {/* Description */}
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">{product.description}</p>

              {/* Stock + delivery */}
              <div className="flex items-center gap-4 sm:gap-6 py-3 border-y border-border">
                <div className="flex items-center gap-1.5">
                  <Package className="w-4 h-4 text-primary" />
                  <span className="text-xs sm:text-sm"><span className="font-semibold text-foreground">{product.quantity}</span> {product.unit}s {t("product.available")}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Truck className="w-4 h-4 text-primary" />
                  <span className="text-xs sm:text-sm text-muted-foreground">{t("product.deliveryAvailable")}</span>
                </div>
              </div>

              {/* Quantity selector + total */}
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <label className="text-xs sm:text-sm font-medium text-foreground">{t("product.quantity")}</label>
                  <div className="flex items-center">
                    <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="w-8 h-8 sm:w-10 sm:h-10 rounded-l-lg border border-border bg-muted hover:bg-muted/80 flex items-center justify-center text-sm">-</button>
                    <Input type="number" value={quantity} onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))} className="w-14 sm:w-20 h-8 sm:h-10 text-center rounded-none border-x-0 text-sm" min={1} max={product.quantity} />
                    <button onClick={() => setQuantity(Math.min(product.quantity, quantity + 1))} className="w-8 h-8 sm:w-10 sm:h-10 rounded-r-lg border border-border bg-muted hover:bg-muted/80 flex items-center justify-center text-sm">+</button>
                  </div>
                </div>

                <div className="p-3 bg-muted rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-xs sm:text-sm text-muted-foreground">{t("product.estimatedTotal")}</span>
                    <span className="font-heading text-lg sm:text-xl font-bold text-primary">{formatPrice(totalPrice)}</span>
                  </div>
                </div>

                {/* Action buttons — marketplace style */}
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" className="gap-2 h-10 sm:h-11 text-xs sm:text-sm" onClick={handleAddToCart}>
                    <ShoppingCart className="w-4 h-4" />Ajouter au panier
                  </Button>
                  <Button variant="hero" className="gap-2 h-10 sm:h-11 text-xs sm:text-sm" onClick={handleBuyNow}>
                    <CreditCard className="w-4 h-4" />Acheter maintenant
                  </Button>
                </div>
                <Button variant="secondary" className="w-full gap-2 h-10 sm:h-11 text-xs sm:text-sm" onClick={handleOpenChat}>
                  <MessageCircle className="w-4 h-4" />Discuter avec le fournisseur
                </Button>
              </div>

              {/* Inline chat form */}
              {showContactForm && (
                <Card className="animate-fade-in border-primary/30">
                  <CardHeader className="p-3 pb-2">
                    <CardTitle className="text-xs sm:text-sm flex items-center gap-2">
                      <MessageCircle className="w-4 h-4 text-primary" />
                      Message à {product.producer.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 pt-0 space-y-2">
                    <Textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      className="min-h-[80px] text-xs sm:text-sm resize-none"
                      placeholder="Votre message..."
                    />
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" className="text-xs" onClick={() => setShowContactForm(false)}>
                        Annuler
                      </Button>
                      <Button variant="hero" size="sm" className="flex-1 gap-1.5 text-xs sm:text-sm" onClick={handleSendAndRedirect} disabled={isSending || !message.trim()}>
                        {isSending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                        Envoyer et ouvrir la conversation
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Seller card */}
              <Card>
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-center gap-2.5 sm:gap-4">
                    <img src={product.producer.avatar} alt={product.producer.name} className="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-heading font-semibold text-xs sm:text-sm text-foreground truncate">{product.producer.name}</span>
                        {product.producer.verified && <ShieldCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary flex-shrink-0" />}
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <Star className="w-3 h-3 text-accent fill-accent" />
                        <span className="text-[10px] sm:text-xs font-medium">{product.producer.rating}</span>
                      </div>
                      <span className="text-[9px] sm:text-[10px] text-muted-foreground">Fournisseur</span>
                    </div>
                    <Link to={`/producteurs/${product.producer.name}`}>
                      <Button variant="outline" size="sm" className="gap-1 text-[10px] sm:text-xs h-7 sm:h-8 px-2 sm:px-3">
                        <User className="w-3 h-3 sm:w-3.5 sm:h-3.5" /><span className="hidden sm:inline">{t("product.viewProfile")}</span><span className="sm:hidden">Profil</span>
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>

              {/* Reviews */}
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
