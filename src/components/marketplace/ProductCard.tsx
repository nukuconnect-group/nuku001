import { Link, useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Star, MapPin, MessageCircle, ShoppingCart, ShieldCheck } from "lucide-react";
import { Product } from "@/data/marketplace";
import { useToast } from "@/hooks/use-toast";
import { useCart } from "@/components/cart/CartContext";

interface ProductCardProps {
  product: Product;
  viewMode?: "grid" | "list";
}

const ProductCard = ({ product, viewMode = "grid" }: ProductCardProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { addItem } = useCart();

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("fr-FR").format(price);
  };

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addItem(product);
    toast({
      title: "Ajouté au panier",
      description: `${product.name} a été ajouté à votre panier`,
    });
  };

  const handleContactClick = (e: React.MouseEvent) => {
    e.preventDefault();
    toast({
      title: "Contacter le vendeur",
      description: `Votre message sera envoyé à ${product.producer.name}`,
    });
    navigate(`/produit/${product.id}`);
  };

  // Get promo badge - only show text, no icons
  const getPromoBadge = () => {
    if (!product.promoType) return null;
    
    const badges: Record<string, { label: string; className: string }> = {
      promo: { label: "PROMO", className: "bg-destructive text-destructive-foreground" },
      flash: { label: "FLASH", className: "bg-orange-500 text-white" },
      soldes: { label: "SOLDES", className: "bg-purple-500 text-white" },
      nouveau: { label: "NEW", className: "bg-blue-500 text-white" },
    };
    
    const badge = badges[product.promoType];
    if (!badge) return null;
    
    return (
      <Badge className={`${badge.className} text-[10px] font-bold px-2 py-0.5 animate-pulse`}>
        {badge.label}
      </Badge>
    );
  };

  if (viewMode === "list") {
    return (
      <Card variant="feature" className="w-full overflow-hidden group hover:shadow-elevated transition-all duration-300">
        <div className="flex flex-col sm:flex-row">
          {/* Image */}
          <div className="relative w-full sm:w-48 h-48 sm:h-auto flex-shrink-0">
            <img
              src={product.image}
              alt={product.name}
              className="w-full h-full object-cover"
            />
            <div className="absolute top-2 left-2 flex flex-col gap-1">
              {getPromoBadge()}
            </div>
            {product.discount && (
              <Badge className="absolute top-2 right-2 bg-destructive text-destructive-foreground font-bold">
                -{product.discount}%
              </Badge>
            )}
          </div>

          {/* Content */}
          <CardContent className="flex-1 p-4">
            <div className="flex flex-col h-full justify-between">
              <div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                  <Badge variant="secondary" className="text-xs font-normal capitalize">
                    {product.category}
                  </Badge>
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {product.location}
                  </span>
                </div>
                <h3 className="font-heading font-semibold text-foreground text-lg mb-1 line-clamp-1">
                  {product.name}
                </h3>
                <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                  {product.description}
                </p>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-heading text-xl font-bold text-primary">
                      {formatPrice(product.price)} FCFA
                    </p>
                    {product.originalPrice && (
                      <p className="text-sm text-muted-foreground line-through">
                        {formatPrice(product.originalPrice)}
                      </p>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">/{product.unit}</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleContactClick}>
                    Contacter
                  </Button>
                  <Button variant="hero" size="sm" onClick={handleAddToCart}>
                    Ajouter
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
      <Card variant="feature" className="group overflow-hidden h-full flex flex-col w-full max-w-[280px]">
        {/* Image */}
        <div className="relative aspect-[4/3] overflow-hidden">
          <img
            src={product.image}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
          
          {/* Promo Badge - Only show if promoType exists */}
          {product.promoType && (
            <div className="absolute top-2 left-2">
              {getPromoBadge()}
            </div>
          )}

          {/* Discount Badge */}
          {product.discount && (
            <Badge className="absolute top-2 right-2 bg-destructive text-destructive-foreground font-bold text-xs">
              -{product.discount}%
            </Badge>
          )}

          {/* Quick Actions Overlay */}
          <div className="absolute inset-0 bg-foreground/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-2">
            <Button variant="secondary" size="sm" className="text-xs" onClick={handleContactClick}>
              Contacter
            </Button>
            <Button variant="hero" size="sm" className="text-xs" onClick={handleAddToCart}>
              Ajouter
            </Button>
          </div>
        </div>

        <CardContent className="p-2.5 sm:p-3 lg:p-4 flex-1 flex flex-col">
          {/* Category & Location */}
          <div className="flex items-center justify-between mb-1.5 sm:mb-2">
            <Badge variant="secondary" className="text-[10px] sm:text-xs font-normal capitalize px-1.5 sm:px-2">
              {product.category}
            </Badge>
            <span className="text-[10px] sm:text-xs text-muted-foreground flex items-center gap-0.5">
              <MapPin className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
              <span className="truncate max-w-[50px] sm:max-w-none">{product.location}</span>
            </span>
          </div>

          {/* Title */}
          <h3 className="font-heading font-semibold text-foreground text-xs sm:text-sm lg:text-base mb-0.5 sm:mb-1 line-clamp-2 group-hover:text-primary transition-colors">
            {product.name}
          </h3>

          {/* Price & Quantity */}
          <div className="flex flex-col gap-0.5 mb-2 mt-auto">
            <div className="flex items-center gap-1 flex-wrap">
              <span className="font-heading text-sm sm:text-base lg:text-lg font-bold text-primary">
                {formatPrice(product.price)}
              </span>
              <span className="text-[10px] sm:text-xs text-muted-foreground">FCFA</span>
              {product.originalPrice && (
                <span className="text-[10px] sm:text-xs text-muted-foreground line-through">
                  {formatPrice(product.originalPrice)}
                </span>
              )}
            </div>
            <span className="text-[10px] sm:text-xs text-muted-foreground">
              / {product.unit}
            </span>
          </div>

          {/* Producer - Clean, minimal */}
          <div className="flex items-center gap-2 pt-2 border-t border-border">
            <Link 
              to={`/producteur/${product.producer.id || product.id}`}
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-2 flex-1 min-w-0 hover:opacity-80 transition-opacity"
            >
              <img
                src={product.producer.avatar}
                alt={product.producer.name}
                className="w-6 h-6 sm:w-7 sm:h-7 rounded-full object-cover"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-0.5">
                  <span className="text-[10px] sm:text-xs font-medium text-foreground truncate">
                    {product.producer.name}
                  </span>
                  {product.producer.verified && (
                    <ShieldCheck className="w-3 h-3 text-primary flex-shrink-0" />
                  )}
                </div>
                <div className="flex items-center gap-0.5">
                  <Star className="w-2.5 h-2.5 text-accent fill-accent" />
                  <span className="text-[10px] text-muted-foreground">
                    {product.producer.rating}
                  </span>
                </div>
              </div>
            </Link>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
};

export default ProductCard;
