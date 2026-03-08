import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Star, ShieldCheck, GitCompareArrows, ShoppingCart, MapPin } from "lucide-react";
import { Product } from "@/data/marketplace";
import { useToast } from "@/hooks/use-toast";
import { useCart } from "@/components/cart/CartContext";
import { useLanguage } from "@/contexts/LanguageContext";

interface ProductCardProps {
  product: Product;
  viewMode?: "grid" | "list";
  onCompare?: (product: Product) => void;
}

const ProductCard = ({ product, viewMode = "grid", onCompare }: ProductCardProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { addItem } = useCart();
  const { formatPrice } = useLanguage();
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
      <Card variant="feature" className="group overflow-hidden h-full flex flex-col w-full max-w-[280px] mx-auto rounded-none sm:rounded-lg">
        {/* Compact image with square borders */}
        <div className="relative aspect-[4/3] overflow-hidden">
          <img src={product.image} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
          
          <div className="absolute top-1.5 left-1.5 flex gap-1">
            {product.discount && (
              <Badge className="bg-destructive text-destructive-foreground font-bold text-[9px] px-1 py-0 rounded-sm">-{product.discount}%</Badge>
            )}
            {isNew && <Badge className="bg-primary text-primary-foreground font-bold text-[9px] px-1 py-0 rounded-sm">NEW</Badge>}
            {product.isOrganic && <Badge className="bg-secondary text-secondary-foreground font-bold text-[9px] px-1 py-0 rounded-sm">BIO</Badge>}
          </div>

          {/* Compare button */}
          <button
            onClick={handleCompare}
            className="absolute top-1.5 right-1.5 w-6 h-6 rounded-sm bg-white/80 backdrop-blur-sm flex items-center justify-center text-muted-foreground hover:text-primary transition-colors sm:opacity-0 sm:group-hover:opacity-100"
          >
            <GitCompareArrows className="w-3 h-3" />
          </button>

          {/* Quick Add overlay */}
          <div className="absolute inset-x-0 bottom-0 p-1.5 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <Button variant="secondary" size="sm" className="w-full text-[10px] h-7 gap-1 rounded-sm" onClick={handleAddToCart}>
              <ShoppingCart className="w-3 h-3" />Ajouter
            </Button>
          </div>
        </div>

        <CardContent className="p-2 sm:p-2.5 flex-1 flex flex-col">
          {/* Title */}
          <h3 className="font-heading font-semibold text-foreground text-[11px] sm:text-xs mb-0.5 line-clamp-2 leading-tight group-hover:text-primary transition-colors">
            {product.name}
          </h3>

          {/* Reviews */}
          <div className="flex items-center gap-0.5 mb-0.5">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className={`w-2 h-2 sm:w-2.5 sm:h-2.5 ${i < Math.round(product.producer.rating) ? "text-accent fill-accent" : "text-muted"}`} />
            ))}
            <span className="text-[8px] sm:text-[9px] text-muted-foreground ml-0.5">({reviewCount})</span>
          </div>

          {/* Price */}
          <div className="flex items-center gap-1 flex-wrap mb-1 mt-auto">
            <span className="font-heading text-xs sm:text-sm font-bold text-primary">{formatPrice(product.price)}</span>
            {product.originalPrice && (
              <span className="text-[9px] text-muted-foreground line-through">{formatPrice(product.originalPrice)}</span>
            )}
            <span className="text-[9px] text-muted-foreground">/{product.unit}</span>
          </div>

          {/* Stock & Location */}
          <div className="flex items-center gap-1.5 text-[8px] sm:text-[9px] text-muted-foreground mb-1">
            <span className="flex items-center gap-0.5"><MapPin className="w-2 h-2 sm:w-2.5 sm:h-2.5" />{product.location}</span>
          </div>

          {/* Fournisseur */}
          <div className="flex items-center gap-1 pt-1 border-t border-border">
            <img src={product.producer.avatar} alt={product.producer.name} className="w-4 h-4 sm:w-5 sm:h-5 rounded-full object-cover" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-0.5">
                <span className="text-[9px] sm:text-[10px] font-medium text-foreground truncate">{product.producer.name}</span>
                {product.producer.verified && <ShieldCheck className="w-2 h-2 sm:w-2.5 sm:h-2.5 text-primary flex-shrink-0" />}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
};

export default ProductCard;
