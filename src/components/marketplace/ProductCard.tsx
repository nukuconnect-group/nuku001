import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Star, ShieldCheck, GitCompareArrows, ShoppingCart, MapPin, Heart } from "lucide-react";
import { Product } from "@/data/marketplace";
import { useToast } from "@/hooks/use-toast";
import { useCart } from "@/components/cart/CartContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useWishlist } from "@/hooks/useWishlist";

interface ProductCardProps {
  product: Product;
  viewMode?: "grid" | "list";
  onCompare?: (product: Product) => void;
  hideProducer?: boolean;
}

const ProductCard = ({ product, viewMode = "grid", onCompare, hideProducer = false }: ProductCardProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { addItem } = useCart();
  const { formatPrice } = useLanguage();
  const { isInWishlist, toggleWishlist, isAuthenticated } = useWishlist();
  const [showReviews, setShowReviews] = useState(false);

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

  if (viewMode === "list") {
    return (
      <Card variant="feature" className="w-full overflow-hidden group hover:shadow-elevated transition-all duration-300 rounded-none sm:rounded-lg">
        <div className="flex flex-col sm:flex-row">
          <div className="relative w-full sm:w-48 aspect-square sm:aspect-auto sm:h-auto flex-shrink-0">
            <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
            <div className="absolute top-2 left-2 flex gap-1">
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
                {/* Reviews */}
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
    <Link to={`/produit/${product.id}`} className="block">
      <Card variant="feature" className="group overflow-hidden h-full flex flex-col w-full max-w-[280px] mx-auto rounded-none sm:rounded-lg shadow-soft hover:shadow-elevated transition-all duration-300 hover:-translate-y-1">
        {/* Image with smooth zoom */}
        <div className="relative aspect-[4/3] overflow-hidden">
          <img src={product.image} alt={product.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out" />
          
          {/* Gradient overlay on hover */}
          <div className="absolute inset-0 bg-gradient-to-t from-foreground/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          
          <div className="absolute top-1.5 left-1.5 flex gap-1">
            {product.discount && (
              <Badge className="bg-destructive text-destructive-foreground font-bold text-[9px] px-1.5 py-0.5 rounded-md shadow-sm animate-fade-in">-{product.discount}%</Badge>
            )}
            {isNew && <Badge className="bg-primary text-primary-foreground font-bold text-[9px] px-1.5 py-0.5 rounded-md shadow-sm">NEW</Badge>}
          </div>

          {/* Compare & Wishlist buttons */}
          <div className="absolute top-1.5 right-1.5 flex flex-col gap-1">
            <button
              onClick={handleCompare}
              className="w-7 h-7 rounded-full bg-card/90 backdrop-blur-sm flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-card transition-all duration-200 shadow-sm sm:opacity-0 sm:group-hover:opacity-100 sm:translate-x-2 sm:group-hover:translate-x-0"
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
              className="w-7 h-7 rounded-full bg-card/90 backdrop-blur-sm flex items-center justify-center transition-all duration-200 shadow-sm sm:opacity-0 sm:group-hover:opacity-100 sm:translate-x-2 sm:group-hover:translate-x-0 sm:delay-75"
            >
              <Heart className={`w-3.5 h-3.5 transition-colors duration-200 ${isInWishlist(product.id) ? "text-destructive fill-destructive" : "text-muted-foreground hover:text-destructive"}`} />
            </button>
          </div>

        </div>

        <CardContent className="p-2.5 sm:p-3 flex-1 flex flex-col gap-0.5">
          {/* Category */}
          <span className="text-[8px] sm:text-[9px] font-medium text-primary uppercase tracking-wide">{product.category}</span>

          {/* Title */}
          <h3 className="font-heading font-semibold text-foreground text-[11px] sm:text-xs leading-tight line-clamp-2 group-hover:text-primary transition-colors duration-200">
            {product.name}
          </h3>

          {/* Reviews */}
          <div className="flex items-center gap-0.5">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className={`w-2.5 h-2.5 sm:w-3 sm:h-3 ${i < Math.round(product.producer.rating) ? "text-accent fill-accent" : "text-muted"}`} />
            ))}
            <span className="text-[8px] sm:text-[9px] text-muted-foreground ml-0.5">({reviewCount})</span>
          </div>

          {/* Price */}
          <div className="flex items-center gap-1 flex-wrap mt-auto">
            <span className="font-heading text-sm sm:text-base font-bold text-primary">{formatPrice(product.price)}</span>
            {product.originalPrice && (
              <span className="text-[9px] text-muted-foreground line-through">{formatPrice(product.originalPrice)}</span>
            )}
            <span className="text-[9px] text-muted-foreground">/{product.unit}</span>
          </div>

          {/* Location */}
          <div className="flex items-center gap-1 text-[8px] sm:text-[9px] text-muted-foreground">
            <MapPin className="w-2.5 h-2.5" />
            <span>{product.location}</span>
          </div>

          {/* Fournisseur */}
          {!hideProducer && (
            <div className="flex items-center gap-1.5 pt-1.5 mt-1 border-t border-border">
              <img src={product.producer.avatar} alt={product.producer.name} className="w-5 h-5 rounded-full object-cover ring-1 ring-border" />
              <span className="text-[9px] sm:text-[10px] font-medium text-foreground truncate">{product.producer.name}</span>
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
};

export default ProductCard;
