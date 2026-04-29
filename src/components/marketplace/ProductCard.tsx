import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Star, ShieldCheck, GitCompareArrows, ShoppingCart, MapPin, Heart, Rocket, HandCoins, MessageCircle, Truck, Package } from "lucide-react";
import { Product } from "@/data/marketplace";
import { useToast } from "@/hooks/use-toast";
import { useCart } from "@/components/cart/CartContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useWishlist } from "@/hooks/useWishlist";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import defaultAvatar from "@/assets/default-producer-avatar.png";
import { useProductPriceTiers } from "@/hooks/useProductPriceTiers";
import ShippingDelayBadge from "@/components/marketplace/ShippingDelayBadge";
import { getCategoryFallbackImage } from "@/lib/categoryFallbackImage";


interface ProductCardProps {
  product: Product;
  viewMode?: "grid" | "list";
  onCompare?: (product: Product) => void;
  /** Hide the supplier/producer row. Implied by `minimal`. */
  hideProducer?: boolean;
  isBoosted?: boolean;
  /** Ultra-minimal layout for sponsored cards: only image, price (+ promo), title, location. Implies hideProducer. */
  minimal?: boolean;
}

const ProductCard = ({ product, viewMode = "grid", onCompare, hideProducer: hideProducerProp = false, isBoosted = false, minimal = false }: ProductCardProps) => {
  // Refactor: minimal always hides producer to avoid redundant props & accidental display
  const hideProducer = hideProducerProp || minimal;
  const navigate = useNavigate();
  const { toast } = useToast();
  const { addItem } = useCart();
  const { formatPrice } = useLanguage();
  const { isInWishlist, toggleWishlist, isAuthenticated } = useWishlist();
  const [showReviews, setShowReviews] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [listImgError, setListImgError] = useState(false);

  // Wholesale tiers : on récupère seulement le prix le plus bas pour afficher "dès X F"
  const { data: tiers = [] } = useProductPriceTiers(product.id);
  const lowestTierPrice = tiers.length > 0 ? Math.min(...tiers.map((t) => t.price)) : null;
  const shippingDays = product.shippingDelayDays;

  // Promo : remise visuelle déterministe pour TOUS les produits sans promo réelle
  // Sponsorisés : 10–25% (plus visible). Autres : 5–15%.
  const hashId = (product.id || product.name || "").split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const syntheticDiscount = isBoosted ? 10 + (hashId % 16) : 5 + (hashId % 11); // 10..25 vs 5..15
  const computedOriginalPrice =
    product.originalPrice ??
    (syntheticDiscount > 0 ? Math.round(product.price / (1 - syntheticDiscount / 100)) : undefined);
  const computedDiscount =
    product.discount ??
    (computedOriginalPrice && computedOriginalPrice > product.price
      ? Math.round(((computedOriginalPrice - product.price) / computedOriginalPrice) * 100)
      : 0);

  const { data: matchingDemands = 0 } = useQuery({
    queryKey: ["demand-count", product.category],
    queryFn: async () => {
      const { count } = await supabase
        .from("demands")
        .select("id", { count: "exact", head: true })
        .eq("status", "active")
        .ilike("category", `%${product.category}%`);
      return count || 0;
    },
    staleTime: 1000 * 60 * 5,
  });

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addItem(product);
    toast({ title: "Ajouté au panier", description: `${product.name} a été ajouté à votre panier` });
  };

  const handleCompare = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onCompare?.(product);
    toast({ title: "Comparaison", description: `${product.name} ajouté à la comparaison` });
  };

  const isNew = product.promoType === "nouveau";
  const reviewCount = Math.floor(product.producer.rating * 12);
  const totalSales = product.producer.totalSales || Math.floor(Math.random() * 500 + 50);

  if (viewMode === "list") {
    return (
      <Card variant="feature" className="w-full overflow-hidden group hover:shadow-elevated transition-all duration-300 rounded-none sm:rounded-xl border-border/50">
        <div className="flex flex-col sm:flex-row">
          <div className="relative w-full sm:w-52 aspect-square sm:aspect-auto sm:h-auto flex-shrink-0 bg-muted">
            <SmartWatermarkedImage
              originalSrc={listImgError || !product.image ? getCategoryFallbackImage(product.category, product.name) : product.image}
              alt={product.name}
              loading="lazy"
              className="w-full h-full object-cover"
              onError={() => setListImgError(true)}
            />
            <div className="absolute top-2 left-2 flex gap-1">
              <Badge className="bg-primary text-primary-foreground font-bold text-[10px]">VENTE</Badge>
              {product.discount && (
                <Badge className="bg-destructive text-destructive-foreground font-bold text-[10px]">-{product.discount}%</Badge>
              )}
              {isNew && <Badge className="bg-primary text-primary-foreground font-bold text-[10px]">NEW</Badge>}
            </div>
          </div>
          <CardContent className="flex-1 p-4">
            <div className="flex flex-col h-full justify-between">
              <div>
                <h3 className="font-heading font-semibold text-foreground text-lg mb-1 line-clamp-1">{product.name}</h3>
                <p className="text-sm text-muted-foreground line-clamp-2 mb-2">{product.description}</p>
                <div className="flex items-center gap-1 mb-2">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className={`w-3 h-3 ${i < Math.round(product.producer.rating) ? "text-accent fill-accent" : "text-muted"}`} />
                  ))}
                  <span className="text-[10px] text-muted-foreground ml-1">({reviewCount} avis)</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-heading text-xl font-bold text-primary">{formatPrice(product.price)}</p>
                    {product.originalPrice && <p className="text-sm text-muted-foreground line-through">{formatPrice(product.originalPrice)}</p>}
                  </div>
                  <p className="text-xs text-muted-foreground">/{product.unit}</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleCompare} className="gap-1">
                    <GitCompareArrows className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="hero" size="sm" onClick={handleAddToCart} className="gap-1">
                    <ShoppingCart className="w-3.5 h-3.5" />Ajouter
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </div>
      </Card>
    );
  }

  return (
    <Link to={`/produit/${product.slug || product.id}`} className="block h-full">
      <Card variant="feature" className="group overflow-hidden h-full flex flex-col w-full rounded-none sm:rounded-xl shadow-none hover:shadow-elevated transition-all duration-300 border-border/40 hover:border-primary/20 bg-card">
        {/* Image — fallback Unsplash automatique par catégorie si l'image casse */}
        <div className="relative aspect-square overflow-hidden bg-muted">
          <SmartWatermarkedImage
            originalSrc={imgError || !product.image ? getCategoryFallbackImage(product.category, product.name) : product.image}
            alt={product.name}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
            onError={() => setImgError(true)}
          />
          
          {/* Top-left badges (sale / sponsored / new / status) */}
          <div className="absolute top-1.5 left-1.5 flex flex-col gap-1">
            {!minimal && (
              <Badge className="bg-primary text-primary-foreground font-bold text-[8px] px-1.5 py-0.5 rounded-md shadow-sm">
                VENTE
              </Badge>
            )}
            {isBoosted && (
              <Badge className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground font-bold text-[8px] px-1.5 py-0.5 rounded-md shadow-sm gap-0.5">
                <Rocket className="w-2.5 h-2.5" />Sponsorisé
              </Badge>
            )}
            {isNew && (
              <Badge className="bg-accent text-accent-foreground font-bold text-[8px] px-1.5 py-0.5 rounded-md shadow-sm">NOUVEAU</Badge>
            )}
            {(product as any).is_negotiable && (
              <Badge className="bg-secondary text-secondary-foreground font-bold text-[8px] px-1.5 py-0.5 rounded-md shadow-sm">NÉGOCIABLE</Badge>
            )}
            {(product as any).stock_status === "out_of_stock" && (
              <Badge className="bg-red-600 text-white font-bold text-[8px] px-1.5 py-0.5 rounded-md shadow-sm">RUPTURE</Badge>
            )}
            {(product as any).stock_status === "low_stock" && (
              <Badge className="bg-orange-500 text-white font-bold text-[8px] px-1.5 py-0.5 rounded-md shadow-sm">STOCK FAIBLE</Badge>
            )}
            {(product as any).stock_status === "restocking" && (
              <Badge className="bg-blue-500 text-white font-bold text-[8px] px-1.5 py-0.5 rounded-md shadow-sm">RÉAPPRO.</Badge>
            )}
          </div>

          {/* Top-right area: discount badge (opposite side) + action buttons */}
          <div className="absolute top-1.5 right-1.5 flex flex-col items-end gap-1">
            {computedDiscount > 0 && (
              <Badge className="bg-destructive text-destructive-foreground font-bold text-[9px] px-1.5 py-0.5 rounded-md shadow-sm">
                -{computedDiscount}%
              </Badge>
            )}
            {!minimal && (
              <>
                <button
                  onClick={handleCompare}
                  className="w-7 h-7 rounded-full bg-card/90 backdrop-blur-sm flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-card transition-all duration-200 shadow-sm sm:opacity-0 sm:group-hover:opacity-100"
                >
                  <GitCompareArrows className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (!isAuthenticated) {
                      toast({ title: "Connexion requise", description: "Connectez-vous pour ajouter aux favoris", variant: "destructive" });
                      navigate("/auth");
                      return;
                    }
                    toggleWishlist(product.id);
                  }}
                  className="w-7 h-7 rounded-full bg-card/90 backdrop-blur-sm flex items-center justify-center transition-all duration-200 shadow-sm sm:opacity-0 sm:group-hover:opacity-100"
                >
                  <Heart className={`w-3.5 h-3.5 transition-colors duration-200 ${isInWishlist(product.id) ? "text-destructive fill-destructive" : "text-muted-foreground hover:text-destructive"}`} />
                </button>
              </>
            )}
          </div>

          {/* Quick add to cart — bottom of image */}
          <div className="absolute bottom-0 left-0 right-0 p-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 hidden sm:block">
            <button onClick={handleAddToCart} className="w-full py-1.5 rounded-lg bg-primary/95 backdrop-blur-sm text-primary-foreground text-[10px] font-semibold flex items-center justify-center gap-1 hover:bg-primary transition-colors">
              <ShoppingCart className="w-3 h-3" />Ajouter au panier
            </button>
          </div>
        </div>

        <CardContent className="p-2 sm:p-2.5 flex-1 flex flex-col gap-0.5 min-h-0 overflow-hidden">
          {/* Price — aligned single line, promo barrée à côté du prix */}
          <div className="flex items-baseline gap-1 flex-nowrap whitespace-nowrap overflow-hidden">
            <span className={`font-heading font-bold text-destructive ${minimal ? 'text-xs sm:text-sm' : 'text-sm sm:text-base'}`}>
              {formatPrice(product.price)}
            </span>
            {computedOriginalPrice && computedOriginalPrice > product.price && (
              <span className={`text-muted-foreground line-through ${minimal ? 'text-[8px]' : 'text-[9px] sm:text-[10px]'}`}>
                {formatPrice(computedOriginalPrice)}
              </span>
            )}
            {!minimal && <span className="text-[9px] text-muted-foreground">/{product.unit}</span>}
          </div>

          {/* Title */}
          <h3 className="font-medium text-foreground text-[11px] sm:text-xs leading-snug line-clamp-2 group-hover:text-primary transition-colors duration-200">
            {product.name}
          </h3>

          {!minimal && (
            <>
              {/* Min order + shipping delay */}
              <div className="flex items-center gap-1.5 text-[8px] sm:text-[9px] text-muted-foreground truncate">
                <span>Min. 1 {product.unit}</span>
                <span className="text-border">•</span>
                <ShippingDelayBadge days={shippingDays} />
              </div>

              {/* Reviews + Sales */}
              <div className="flex items-center gap-1 mt-auto">
                <Star className="w-2.5 h-2.5 text-accent fill-accent flex-shrink-0" />
                <span className="text-[9px] font-medium text-foreground">{product.producer.rating.toFixed(1)}</span>
                <span className="text-[8px] text-muted-foreground">({reviewCount})</span>
                <span className="text-border text-[8px]">|</span>
                <span className="text-[8px] text-muted-foreground truncate">{totalSales}+ vendus</span>
              </div>

              {/* Supplier info */}
              {!hideProducer && (
                <div className="flex items-center gap-1 pt-1 mt-0.5 border-t border-border/50 min-w-0">
                  <img
                    src={product.producer.avatar || defaultAvatar}
                    alt={product.producer.name}
                    className="w-4 h-4 rounded-sm object-cover border border-border/60 flex-shrink-0"
                    onError={(e) => { (e.currentTarget as HTMLImageElement).src = defaultAvatar; }}
                  />
                  {product.producer.verified && (
                    <ShieldCheck className="w-3 h-3 text-emerald-500 flex-shrink-0" />
                  )}
                  <span className="text-[9px] sm:text-[10px] text-foreground truncate font-medium">{product.producer.name}</span>
                </div>
              )}
            </>
          )}

          {/* Location */}
          <div className={`flex items-center gap-1 text-[8px] text-muted-foreground truncate ${minimal ? 'mt-auto' : ''}`}>
            <MapPin className="w-2 h-2 flex-shrink-0" />
            <span className="truncate">{product.location}</span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
};

export default ProductCard;
