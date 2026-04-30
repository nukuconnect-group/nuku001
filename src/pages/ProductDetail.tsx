import SEO from "@/components/SEO";
import { useState, useMemo, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import MobileBottomNav from "@/components/layout/MobileBottomNav";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useCart } from "@/components/cart/CartContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useProduct, useProductBySlug } from "@/hooks/useProducts";
import { ProductDetailSkeleton, CachedDataBanner } from "@/components/marketplace/ProductDetailSkeleton";
import OfflineFallback from "@/components/layout/OfflineFallback";
import SmartWatermarkedImage from "@/components/marketplace/SmartWatermarkedImage";
import { useWishlist } from "@/hooks/useWishlist";
import { 
  ArrowLeft, Leaf, MapPin, Star, ShieldCheck, MessageCircle, ShoppingCart,
  Heart, Share2, Truck, Package, Send, User, ChevronLeft, ChevronRight,
  Loader2, DollarSign, CreditCard, ZoomIn, X, QrCode, Download, Copy,
  Building2, Award, Clock, TrendingUp,
} from "lucide-react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { type CurrencyCode } from "@/contexts/LanguageContext";
import SellerCard from "@/components/seller/SellerCard";
import { producerShopUrl } from "@/lib/producerLinks";

import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import ReviewSection from "@/components/product/ReviewSection";
import WholesalePricingPanel from "@/components/marketplace/WholesalePricingPanel";
import EffectivePriceCalculator from "@/components/marketplace/EffectivePriceCalculator";
import OwnerBatchQRGenerator from "@/components/product/OwnerBatchQRGenerator";

import SimilarProducts from "@/components/product/SimilarProducts";
import BuyerDeliveryZone from "@/components/marketplace/BuyerDeliveryZone";

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
  const [zoomOpen, setZoomOpen] = useState(false);
  const [traceabilityOpen, setTraceabilityOpen] = useState(false);

  const isUUID = id ? /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id) : false;
  const { data: dbProductById, isLoading: loadingById } = useProduct(isUUID ? id! : "");
  const { data: dbProductBySlug, isLoading: loadingBySlug } = useProductBySlug(!isUUID && id ? id : "");
  
  const product = dbProductById || dbProductBySlug || null;
  const isLoading = isUUID ? loadingById : loadingBySlug;

  const images = product?.images?.length ? product.images : (product ? [product.image] : []);
  const nextImage = () => setCurrentImageIndex((prev) => (prev + 1) % images.length);
  const prevImage = () => setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);

  // Track product view by canonical UUID for boost stats reliability
  useEffect(() => {
    if (!product?.id) return;
    const productUUID = product.id;
    const isUUIDProduct = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(productUUID);
    if (!isUUIDProduct) return;
    let sid = sessionStorage.getItem("nuku-session-id");
    if (!sid) {
      sid = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      sessionStorage.setItem("nuku-session-id", sid);
    }
    // Dedupe: only one view per product per session per 30 min
    const dedupeKey = `nuku-prod-view-${productUUID}`;
    const last = sessionStorage.getItem(dedupeKey);
    if (last && Date.now() - Number(last) < 30 * 60 * 1000) return;
    sessionStorage.setItem(dedupeKey, String(Date.now()));
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        await supabase.from("analytics_visits").insert({
          user_id: session?.user?.id || null,
          session_id: sid!,
          page_path: `/produit/${productUUID}`,
          referrer: document.referrer || null,
          user_agent: navigator.userAgent,
        } as any);
      } catch {
        // silent
      }
    })();
  }, [product?.id]);

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
    // Direct redirect: create conversation, send the prefilled message, then go to /messages
    void handleSendAndRedirect(autoMessage);
  };

  const handleSendAndRedirect = async (overrideMessage?: string) => {
    const content = (overrideMessage ?? message).trim();
    if (!product || !content) return;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      toast({ title: "Connexion requise", description: "Connectez-vous pour contacter le fournisseur", variant: "destructive" });
      navigate(`/auth?returnTo=${encodeURIComponent(`/produit/${id}`)}`);
      return;
    }
    setIsSending(true);
    try {
      const { data: buyerProfile } = await supabase.from("profiles").select("id").eq("user_id", session.user.id).single();
      if (!buyerProfile) throw new Error("Profile not found");

      // For DB products, producer.id is the profile ID (producer_id)
      // For mock products, producer.id is like "p1" — not a valid UUID
      let sellerId = product.producer.id;
      const isValidUUID = sellerId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(sellerId);

      if (!isValidUUID) {
        // Mock product — try to find a real seller by name
        const { data: sellerProfile } = await supabase
          .from("profiles")
          .select("id")
          .eq("user_type", "producer")
          .limit(1)
          .maybeSingle();

        if (!sellerProfile) {
          toast({ title: "Fournisseur introuvable", description: "Ce produit de démonstration n'a pas de fournisseur réel associé.", variant: "destructive" });
          setIsSending(false);
          return;
        }
        sellerId = sellerProfile.id;
      }

      // Check if buyer is trying to message themselves
      if (sellerId === buyerProfile.id) {
        toast({ title: "Action impossible", description: "Vous ne pouvez pas vous envoyer un message à vous-même.", variant: "destructive" });
        setIsSending(false);
        return;
      }

      // Look for existing conversation between buyer and seller
      const { data: existingConv } = await supabase
        .from("conversations")
        .select("id")
        .eq("buyer_id", buyerProfile.id)
        .eq("seller_id", sellerId)
        .maybeSingle();

      let conversationId = existingConv?.id;
      if (!conversationId) {
        const productId = isValidUUID || /^[0-9a-f]{8}-/i.test(product.id) ? product.id : null;
        const { data: newConv, error: convError } = await supabase
          .from("conversations")
          .insert({ buyer_id: buyerProfile.id, seller_id: sellerId, product_id: productId })
          .select("id")
          .single();
        if (convError) throw convError;
        conversationId = newConv.id;
      }

      const { error: msgError } = await supabase
        .from("messages")
        .insert({ conversation_id: conversationId, sender_id: buyerProfile.id, content });
      if (msgError) throw msgError;

      toast({ title: "Message envoyé ✓", description: `Votre message a été envoyé à ${product.producer.name}` });
      setMessage("");
      setShowContactForm(false);
      navigate(`/messages?product=${product.id}&seller=${encodeURIComponent(product.producer.name)}`);
    } catch (error: any) {
      console.error("Send message error:", error);
      toast({ title: "Erreur", description: error?.message || "Impossible d'envoyer le message", variant: "destructive" });
    } finally {
      setIsSending(false);
    }
  };

  if (isLoading && !product) {
    return (
      <div className="min-h-screen bg-background pb-20 lg:pb-0">
        <Header />
        <ProductDetailSkeleton />
        <MobileBottomNav />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <OfflineFallback
          title={t("product.notFound")}
          description="Ce produit n'a pas pu être chargé. Vérifiez votre connexion et réessayez."
          queryKeys={[["product", id || ""], ["product-slug", id || ""]]}
        />
        <Footer />
      </div>
    );
  }

  const totalPrice = product.price * quantity;

  return (
    <div className="min-h-screen bg-background pb-20 lg:pb-0">
      <SEO
        url={`/produit/${product.slug || id}`}
        title={product.name}
        description={product.description || `${product.name} - ${product.price} FCFA/${product.unit}. Disponible à ${product.location}.`}
        image={images[0] || undefined}
        type="product"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "Product",
          "name": product.name,
          "description": product.description || product.name,
          "image": images[0] || "",
          "offers": {
            "@type": "Offer",
            "price": product.price,
            "priceCurrency": "XOF",
            "availability": product.quantity > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
            "seller": {
              "@type": "Organization",
              "name": product.producer?.name || "NUKUCONNECT"
            }
          }
        }}
      />
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
              {/* Main image — 4:3 ratio, compact on mobile */}
              <div className="relative aspect-[4/3] sm:aspect-[4/3] lg:aspect-square overflow-hidden bg-muted rounded-none sm:rounded-lg cursor-zoom-in" onClick={() => setZoomOpen(true)}>
                <SmartWatermarkedImage
                  originalSrc={images[currentImageIndex] || product.image}
                  alt={product.name}
                  className="w-full h-full object-cover"
                  onError={(e) => { (e.target as HTMLImageElement).src = "/placeholder.svg"; }}
                />
                {images.length > 1 && (
                  <>
                    <button onClick={(e) => { e.stopPropagation(); prevImage(); }} className="absolute left-1.5 sm:left-3 top-1/2 -translate-y-1/2 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-card/80 backdrop-blur-sm flex items-center justify-center hover:bg-card transition-colors">
                      <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); nextImage(); }} className="absolute right-1.5 sm:right-3 top-1/2 -translate-y-1/2 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-card/80 backdrop-blur-sm flex items-center justify-center hover:bg-card transition-colors">
                      <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
                    </button>
                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                      {images.map((_, idx) => (
                        <button key={idx} onClick={(e) => { e.stopPropagation(); setCurrentImageIndex(idx); }}
                          className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full transition-all ${idx === currentImageIndex ? "bg-primary w-4 sm:w-6" : "bg-card/80"}`} />
                      ))}
                    </div>
                  </>
                )}
                {/* Zoom hint */}
                <div className="absolute bottom-3 right-3 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-card/80 backdrop-blur-sm flex items-center justify-center">
                  <ZoomIn className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground" />
                </div>
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
                    onClick={(e) => {
                      e.stopPropagation();
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
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      const shareData = {
                        title: product.name,
                        text: `${product.name} — ${formatPrice(product.price)}/${product.unit} sur NukuConnect`,
                        url: window.location.href,
                      };
                      if (navigator.share) {
                        navigator.share(shareData).catch(() => {});
                      } else {
                        navigator.clipboard.writeText(window.location.href);
                        toast({ title: "Lien copié ✓", description: "Le lien du produit a été copié dans le presse-papier" });
                      }
                    }}
                    className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-card/80 backdrop-blur-sm flex items-center justify-center hover:bg-card transition-colors"
                  >
                    <Share2 className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground" />
                  </button>
                </div>
              </div>

              {/* Zoom Dialog */}
              <Dialog open={zoomOpen} onOpenChange={setZoomOpen}>
                <DialogContent className="max-w-[95vw] sm:max-w-3xl p-0 bg-black/95 border-none overflow-hidden">
                  <div className="relative w-full h-[80vh] flex items-center justify-center touch-pinch-zoom">
                    <img
                      src={images[currentImageIndex] || product.image}
                      alt={product.name}
                      className="max-w-full max-h-full object-contain select-none"
                      style={{ touchAction: "pinch-zoom" }}
                    />
                    {images.length > 1 && (
                      <>
                        <button onClick={prevImage} className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center hover:bg-white/30 transition-colors">
                          <ChevronLeft className="w-5 h-5 text-white" />
                        </button>
                        <button onClick={nextImage} className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center hover:bg-white/30 transition-colors">
                          <ChevronRight className="w-5 h-5 text-white" />
                        </button>
                      </>
                    )}
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                      {images.map((_, idx) => (
                        <button key={idx} onClick={() => setCurrentImageIndex(idx)}
                          className={`w-2.5 h-2.5 rounded-full transition-all ${idx === currentImageIndex ? "bg-white w-6" : "bg-white/40"}`} />
                      ))}
                    </div>
                    <p className="absolute top-4 left-1/2 -translate-x-1/2 text-white/60 text-xs">Pincez pour zoomer</p>
                  </div>
                </DialogContent>
              </Dialog>

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

              {/* Caractéristiques — affichées juste sous les images pour combler l'espace vide en desktop */}
              <Card className="hidden lg:block mt-2">
                <CardContent className="p-4">
                  <h3 className="text-sm font-bold text-foreground mb-3">Caractéristiques du produit</h3>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                    <div className="border-b border-border pb-2">
                      <p className="text-[10px] text-muted-foreground">Catégorie</p>
                      <p className="text-xs font-medium text-foreground capitalize">{product.category}</p>
                    </div>
                    <div className="border-b border-border pb-2">
                      <p className="text-[10px] text-muted-foreground">Unité</p>
                      <p className="text-xs font-medium text-foreground">{product.unit}</p>
                    </div>
                    <div className="border-b border-border pb-2">
                      <p className="text-[10px] text-muted-foreground">Origine</p>
                      <p className="text-xs font-medium text-foreground">{product.location || "Togo"}</p>
                    </div>
                    <div className="border-b border-border pb-2">
                      <p className="text-[10px] text-muted-foreground">Certification</p>
                      <p className="text-xs font-medium text-foreground">{product.isOrganic ? "Biologique" : "Standard"}</p>
                    </div>
                    <div className="border-b border-border pb-2">
                      <p className="text-[10px] text-muted-foreground">Stock</p>
                      <p className="text-xs font-medium text-foreground">{product.quantity} {product.unit}(s)</p>
                    </div>
                    <div className="border-b border-border pb-2">
                      <p className="text-[10px] text-muted-foreground">Fournisseur</p>
                      <p className="text-xs font-medium text-foreground truncate">{product.producer.name}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Traçabilité — compacte, directement sous Caractéristiques (desktop) */}
              <Card className="hidden lg:block border-primary/30">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <QrCode className="w-4 h-4 text-primary" />
                    <span className="font-heading font-semibold text-sm text-foreground">Traçabilité du produit</span>
                    {product.producer.verified && (
                      <Badge className="bg-primary/10 text-primary border-primary/20 text-[8px] gap-0.5">
                        <ShieldCheck className="w-2.5 h-2.5" />Vérifié
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="bg-white p-1.5 rounded-lg border border-border flex-shrink-0">
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(
                          `${window.location.origin}/tracabilite?product=${product.id}&name=${encodeURIComponent(product.name)}&producer=${encodeURIComponent(product.producer.name)}`
                        )}`}
                        alt="QR Code traçabilité"
                        className="w-20 h-20"
                      />
                    </div>
                    <div className="flex-1 space-y-2 min-w-0">
                      <p className="text-[11px] text-muted-foreground leading-snug">
                        Scannez ce QR code pour suivre le parcours complet de ce produit.
                      </p>
                      <Button
                        variant="hero"
                        size="sm"
                        className="gap-1.5 text-[11px] h-8 w-full"
                        onClick={() => setTraceabilityOpen(true)}
                      >
                        <ShieldCheck className="w-3.5 h-3.5" />Voir la traçabilité complète
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Avis — directement sous Traçabilité (desktop) */}
              <div className="hidden lg:block">
                <ReviewSection productId={product.id} />
              </div>
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
                {(product as any).is_negotiable && (
                  <Badge className="bg-amber-500 text-white text-[10px] gap-1 ml-auto">À négocier</Badge>
                )}
              </div>

              {/* Wholesale pricing — style Aliexpress (Prêt à expédié + tranches de prix) */}
              <WholesalePricingPanel
                productId={product.id}
                unit={product.unit}
                basePrice={product.price}
                minOrder={(product as any).min_order || 1}
                shippingDays={product.shippingDelayDays}
              />

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

              {/* Seller card — moved right after stock + delivery summary */}
              <SellerCard
                businessName={product.producer.name}
                avatarUrl={product.producer.avatar}
                verified={product.producer.verified}
                rating={product.producer.rating}
                location={product.location}
                onContact={handleOpenChat}
              />


              {/* Delivery options */}
              <Card className="border-primary/20">
                <CardContent className="p-3 space-y-2">
                  <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <Truck className="w-4 h-4 text-primary" />
                    Options de livraison
                  </p>
                  <div className="grid grid-cols-1 gap-2">
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 border border-border">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Package className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex-1">
                        <p className="text-[10px] font-medium text-foreground">Retrait sur place</p>
                        <p className="text-[9px] text-muted-foreground">Gratuit — {product.location}</p>
                      </div>
                      <Badge variant="secondary" className="text-[8px]">Gratuit</Badge>
                    </div>
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 border border-primary/20">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Truck className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex-1">
                        <p className="text-[10px] font-medium text-foreground">Livreur NukuConnect</p>
                        <p className="text-[9px] text-muted-foreground">Nos livreurs partenaires</p>
                      </div>
                      <Badge className="text-[8px] bg-primary/10 text-primary border-primary/20">Recommandé</Badge>
                    </div>
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 border border-accent/30">
                      <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0">
                        <Send className="w-4 h-4 text-accent" />
                      </div>
                      <div className="flex-1">
                        <p className="text-[10px] font-medium text-foreground">Livraison internationale</p>
                        <p className="text-[9px] text-muted-foreground">Export hors zone — devis sur demande</p>
                      </div>
                      <Badge variant="outline" className="text-[8px]">Sur devis</Badge>
                    </div>
                  </div>
                  <p className="text-[8px] text-muted-foreground text-center">
                    Les livreurs disponibles seront affichés lors du checkout
                  </p>
                </CardContent>
              </Card>

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

                <EffectivePriceCalculator productId={product.id} unit={product.unit} basePrice={product.price} quantity={quantity} />

                {/* Action buttons — marketplace style */}
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" className="gap-2 h-10 sm:h-11 text-xs sm:text-sm" onClick={handleAddToCart}>
                    <ShoppingCart className="w-4 h-4" />Ajouter au panier
                  </Button>
                  <Button variant="hero" className="gap-2 h-10 sm:h-11 text-xs sm:text-sm" onClick={handleBuyNow}>
                    <CreditCard className="w-4 h-4" />Acheter maintenant
                  </Button>
                </div>
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
                      <Button variant="hero" size="sm" className="flex-1 gap-1.5 text-xs sm:text-sm" onClick={() => handleSendAndRedirect()} disabled={isSending || !message.trim()}>
                        {isSending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                        Envoyer et ouvrir la conversation
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
            {/* ===== END GRID ===== */}
          </div>

          {/* ===== FULL-WIDTH SECTIONS BELOW (fix desktop empty space under images) ===== */}
          <div className="mt-6 sm:mt-10 grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 lg:gap-10">
            {/* Left column (2/3) — Caractéristiques + Traçabilité + Avis */}
            <div className="space-y-4 sm:space-y-6">
              {/* Characteristics — visible mobile/tablet uniquement (desktop: affiché sous les images) */}
              <Card className="lg:hidden">
                <CardContent className="p-3 sm:p-5">
                  <div className="flex items-center justify-between mb-3 sm:mb-4">
                    <h3 className="text-sm sm:text-base font-bold text-foreground">Caractéristiques du produit</h3>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-3">
                    <div className="border-b border-border pb-2">
                      <p className="text-[10px] text-muted-foreground">Catégorie</p>
                      <p className="text-xs sm:text-sm font-medium text-foreground capitalize">{product.category}</p>
                    </div>
                    <div className="border-b border-border pb-2">
                      <p className="text-[10px] text-muted-foreground">Unité</p>
                      <p className="text-xs sm:text-sm font-medium text-foreground">{product.unit}</p>
                    </div>
                    <div className="border-b border-border pb-2">
                      <p className="text-[10px] text-muted-foreground">Origine</p>
                      <p className="text-xs sm:text-sm font-medium text-foreground">{product.location || "Togo"}</p>
                    </div>
                    <div className="border-b border-border pb-2">
                      <p className="text-[10px] text-muted-foreground">Certification</p>
                      <p className="text-xs sm:text-sm font-medium text-foreground">{product.isOrganic ? "Biologique" : "Standard"}</p>
                    </div>
                    <div className="border-b border-border pb-2">
                      <p className="text-[10px] text-muted-foreground">Stock disponible</p>
                      <p className="text-xs sm:text-sm font-medium text-foreground">{product.quantity} {product.unit}(s)</p>
                    </div>
                    <div className="border-b border-border pb-2">
                      <p className="text-[10px] text-muted-foreground">Fournisseur</p>
                      <p className="text-xs sm:text-sm font-medium text-foreground">{product.producer.name}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Owner: Batch QR generator (only visible to product owner) */}
              <OwnerBatchQRGenerator productId={product.id} producerId={product.producer.id} productName={product.name} />

              {/* QR Code — Traçabilité */}
              <Card className="border-primary/30 lg:hidden">
                <CardContent className="p-3 sm:p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <QrCode className="w-4 h-4 text-primary" />
                    <span className="font-heading font-semibold text-xs sm:text-sm text-foreground">
                      Traçabilité du produit
                    </span>
                    {product.producer.verified && (
                      <Badge className="bg-primary/10 text-primary border-primary/20 text-[8px] gap-0.5">
                        <ShieldCheck className="w-2.5 h-2.5" />Vérifié
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="bg-white p-2 rounded-lg border border-border flex-shrink-0">
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
                          `${window.location.origin}/tracabilite?product=${product.id}&name=${encodeURIComponent(product.name)}&producer=${encodeURIComponent(product.producer.name)}&origin=${encodeURIComponent(product.location || '')}&organic=${product.isOrganic}&verified=${product.producer.verified}`
                        )}`}
                        alt="QR Code traçabilité"
                        className="w-24 h-24 sm:w-28 sm:h-28"
                      />
                    </div>
                    <div className="flex-1 space-y-2">
                      <p className="text-[10px] sm:text-xs text-muted-foreground">
                        Scannez ce QR code pour suivre le parcours complet de ce produit.
                      </p>
                      <div className="flex gap-2 flex-wrap">
                        <Button
                          variant="hero"
                          size="sm"
                          className="gap-1.5 text-[10px] sm:text-xs h-8 sm:h-9"
                          onClick={() => setTraceabilityOpen(true)}
                        >
                          <ShieldCheck className="w-3.5 h-3.5" />Voir la traçabilité
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1.5 text-[10px] sm:text-xs h-7 sm:h-8"
                          onClick={() => {
                            const link = document.createElement("a");
                            link.href = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(
                              `${window.location.origin}/tracabilite?product=${product.id}&name=${encodeURIComponent(product.name)}&producer=${encodeURIComponent(product.producer.name)}`
                            )}`;
                            link.download = `qr-tracabilite-${product.name.replace(/\s+/g, "-")}.png`;
                            link.click();
                          }}
                        >
                          <Download className="w-3 h-3" />QR
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1.5 text-[10px] sm:text-xs h-7 sm:h-8"
                          onClick={() => {
                            const url = `${window.location.origin}/tracabilite?product=${product.id}`;
                            navigator.clipboard.writeText(url).then(() => {
                              toast({ title: "Lien copié !", description: "Le lien de traçabilité a été copié." });
                            });
                          }}
                        >
                          <Copy className="w-3 h-3" />Lien
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Traceability Sheet */}
              <Sheet open={traceabilityOpen} onOpenChange={setTraceabilityOpen}>
                <SheetContent side="bottom" className="h-[80vh] sm:h-[70vh] rounded-t-2xl">
                  <SheetHeader className="pb-3">
                    <SheetTitle className="flex items-center gap-2 text-sm sm:text-base">
                      <ShieldCheck className="w-5 h-5 text-primary" />
                      Traçabilité complète
                    </SheetTitle>
                  </SheetHeader>
                  <ScrollArea className="h-[calc(80vh-80px)] sm:h-[calc(70vh-80px)]">
                    <div className="space-y-4 pr-4 pb-6">
                      <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-xl">
                        <img src={images[0] || product.image} alt={product.name} className="w-16 h-16 rounded-lg object-cover" />
                        <div>
                          <h3 className="font-semibold text-sm">{product.name}</h3>
                          <p className="text-xs text-muted-foreground">{product.category}</p>
                          <p className="text-xs text-primary font-medium">{formatPrice(product.price)}/{product.unit}</p>
                        </div>
                      </div>
                      <div className="space-y-0">
                        {[
                          { step: "Production", icon: "🌱", desc: `Produit par ${product.producer.name}`, detail: product.location || "Togo", status: "done" },
                          { step: "Contrôle qualité", icon: "🔍", desc: product.isOrganic ? "Certifié biologique" : "Contrôle standard", detail: product.producer.verified ? "Fournisseur vérifié ✓" : "En cours de vérification", status: product.producer.verified ? "done" : "pending" },
                          { step: "Stockage", icon: "📦", desc: "Conditions de conservation respectées", detail: `${product.quantity} ${product.unit}(s) disponibles`, status: "done" },
                          { step: "Mise en vente", icon: "🏪", desc: "Publié sur NukuConnect", detail: `Catégorie: ${product.category}`, status: "done" },
                          { step: "Livraison", icon: "🚚", desc: "Prêt à être expédié", detail: "Retrait / Livreur NukuConnect", status: "active" },
                        ].map((item, i) => (
                          <div key={i} className="flex gap-3">
                            <div className="flex flex-col items-center">
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${
                                item.status === "done" ? "bg-primary/10" : item.status === "active" ? "bg-accent/10" : "bg-muted"
                              }`}>
                                {item.icon}
                              </div>
                              {i < 4 && <div className={`w-0.5 h-8 ${item.status === "done" ? "bg-primary/30" : "bg-border"}`} />}
                            </div>
                            <div className="pb-4">
                              <p className="text-sm font-semibold text-foreground">{item.step}</p>
                              <p className="text-xs text-muted-foreground">{item.desc}</p>
                              <p className="text-[10px] text-muted-foreground/70">{item.detail}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="p-3 bg-primary/5 rounded-xl border border-primary/20 space-y-2">
                        <p className="text-xs font-semibold text-foreground">Certifications & garanties</p>
                        <div className="flex flex-wrap gap-2">
                          {product.isOrganic && <Badge className="bg-accent/10 text-accent border-accent/20 text-[10px]">🌿 Biologique</Badge>}
                          {product.producer.verified && <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px]">✓ Fournisseur vérifié</Badge>}
                          <Badge variant="secondary" className="text-[10px]">📍 Origine: {product.location || "Togo"}</Badge>
                          <Badge variant="secondary" className="text-[10px]">📦 {product.unit}</Badge>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        className="w-full gap-2 text-xs"
                        onClick={() => {
                          setTraceabilityOpen(false);
                          navigate(`/tracabilite?product=${product.id}&name=${encodeURIComponent(product.name)}&producer=${encodeURIComponent(product.producer.name)}&origin=${encodeURIComponent(product.location || '')}&organic=${product.isOrganic}&verified=${product.producer.verified}`);
                        }}
                      >
                        <QrCode className="w-4 h-4" />
                        Voir la page traçabilité complète
                      </Button>
                    </div>
                  </ScrollArea>
                </SheetContent>
              </Sheet>

              {/* Reviews — visible mobile/tablet uniquement (desktop: affiché sous Traçabilité dans la colonne gauche) */}
              <div className="lg:hidden">
                <ReviewSection productId={product.id} />
              </div>
            </div>

            {/* Right column (1/3) — Protection + adresse livraison */}
            <div className="space-y-4 sm:space-y-6">
              {/* Order Protection */}
              <Card className="border-primary/20 bg-primary/5">
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs sm:text-sm font-semibold text-foreground">Protection NukuConnect</h3>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <p className="text-[10px] sm:text-xs text-muted-foreground mb-3">
                    Seules les commandes passées et payées via NukuConnect sont protégées gratuitement.
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { icon: <ShieldCheck className="w-5 h-5 text-primary" />, label: "Paiements sécurisés" },
                      { icon: <CreditCard className="w-5 h-5 text-primary" />, label: "Protection remboursement" },
                      { icon: <Package className="w-5 h-5 text-primary" />, label: "Suivi commande" },
                      { icon: <Truck className="w-5 h-5 text-primary" />, label: "Livraison garantie" },
                    ].map((item, i) => (
                      <div key={i} className="flex flex-col items-center text-center p-2 rounded-lg bg-card">
                        {item.icon}
                        <span className="text-[9px] sm:text-[10px] text-muted-foreground mt-1 leading-tight">{item.label}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Adresse livraison + temps de traitement */}
              <BuyerDeliveryZone productLocation={product.location} />
              <Card className="border-primary/20 bg-primary/5">
                <CardContent className="p-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0">
                      <Clock className="w-4 h-4 text-primary" aria-hidden="true" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] uppercase tracking-wide font-bold text-muted-foreground">
                        Temps de traitement
                      </p>
                      <p className="text-xs sm:text-sm font-semibold text-foreground">
                        {(() => {
                          const d = product.shippingDelayDays ?? 1;
                          if (d === 0) return "Expédition immédiate";
                          if (d === 1) return "Expédié sous 24 heures";
                          if (d <= 3) return `Expédié sous ${d} jours ouvrés`;
                          return `Expédié sous ${d} jours`;
                        })()}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        Préparé par {product.producer.name} avant remise au livreur NukuConnect.
                      </p>
                    </div>
                    <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/40 text-[9px] sm:text-[10px] font-bold">
                      {(product.shippingDelayDays ?? 1) <= 1 ? "Rapide" : "Standard"}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
          {/* ===== END FULL-WIDTH SECTIONS ===== */}

          {/* ===== SIMILAR PRODUCTS ===== */}
          <SimilarProducts currentProduct={product} />
        </div>
      </main>
      <Footer />
      <MobileBottomNav />
    </div>
  );
};

export default ProductDetail;
