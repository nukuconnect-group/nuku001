import { Link, useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Star, MapPin, MessageCircle, Heart, ShieldCheck, Leaf, ShoppingCart, AlertTriangle, CheckCircle2, Zap, Tag, Sparkles } from "lucide-react";
import { Product } from "@/data/marketplace";
import { useToast } from "@/hooks/use-toast";
import { useCart } from "@/components/cart/CartContext";

interface ProductCardProps {
  product: Product;
  viewMode?: "grid" | "list";
}

// Products with traceability certification
const traceableProducts = ["1", "3", "5", "6", "8", "9", "10"];

const ProductCard = ({ product, viewMode = "grid" }: ProductCardProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { addItem } = useCart();
  const isTraceable = traceableProducts.includes(product.id);

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

  const getPromoBadge = () => {
    if (!product.promoType) return null;
    
    const badges = {
      promo: { label: "PROMO", className: "bg-destructive text-destructive-foreground", icon: Tag },
      flash: { label: "FLASH", className: "bg-orange-500 text-white", icon: Zap },
      soldes: { label: "SOLDES", className: "bg-purple-500 text-white", icon: Tag },
      nouveau: { label: "NEW", className: "bg-blue-500 text-white", icon: Sparkles },
    };
    
    const badge = badges[product.promoType];
    if (!badge) return null;
    
    return (
      <Badge className={`${badge.className} gap-1 text-[10px] font-bold px-1.5 py-0.5 animate-pulse`}>
        <badge.icon className="w-3 h-3" />
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
              {product.isOrganic && (
                <Badge className="bg-primary text-primary-foreground text-xs">
                  <Leaf className="w-3 h-3 mr-1" />
                  BIO
                </Badge>
              )}
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
                    <MessageCircle className="w-4 h-4 mr-1" />
                    Contacter
                  </Button>
                  <Button variant="hero" size="sm" onClick={handleAddToCart}>
                    <ShoppingCart className="w-4 h-4 mr-1" />
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
          
          {/* Badges */}
          <div className="absolute top-2 left-2 flex flex-col gap-1">
            {getPromoBadge()}
            {product.isOrganic && (
              <Badge className="bg-primary text-primary-foreground border-0 gap-1 text-xs px-2 py-0.5">
                <Leaf className="w-3 h-3" />
                <span className="hidden sm:inline">Bio</span>
              </Badge>
            )}
            {isTraceable ? (
              <Badge className="bg-green-600 text-white border-0 gap-1 text-xs px-2 py-0.5">
                <CheckCircle2 className="w-3 h-3" />
                <span className="hidden sm:inline">Traçable</span>
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-yellow-500/20 text-yellow-700 border-yellow-500 gap-1 text-xs px-1.5 py-0.5">
                <AlertTriangle className="w-3 h-3" />
              </Badge>
            )}
          </div>

          {/* Discount Badge */}
          {product.discount && (
            <Badge className="absolute top-2 right-10 bg-destructive text-destructive-foreground font-bold text-xs">
              -{product.discount}%
            </Badge>
          )}

          {/* Wishlist */}
          <button 
            onClick={(e) => e.preventDefault()}
            className="absolute top-2 right-2 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-card/80 backdrop-blur-sm flex items-center justify-center hover:bg-card transition-colors group/heart"
          >
            <Heart className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground group-hover/heart:text-destructive transition-colors" />
          </button>

          {/* Quick Actions Overlay */}
          <div className="absolute inset-0 bg-foreground/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-2">
            <Button variant="secondary" size="sm" className="text-xs" onClick={handleContactClick}>
              <MessageCircle className="w-3.5 h-3.5 mr-1" />
              Contacter
            </Button>
            <Button variant="hero" size="sm" className="text-xs" onClick={handleAddToCart}>
              <ShoppingCart className="w-3.5 h-3.5 mr-1" />
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
            <span className="truncate max-w-[60px] sm:max-w-none">{product.location}</span>
          </span>
        </div>

        {/* Title */}
        <h3 className="font-heading font-semibold text-foreground text-sm sm:text-base mb-0.5 sm:mb-1 line-clamp-1 group-hover:text-primary transition-colors">
          {product.name}
        </h3>

        {/* Description - hidden on mobile for space */}
        <p className="hidden sm:block text-xs sm:text-sm text-muted-foreground line-clamp-2 mb-2 lg:mb-3 flex-1">
          {product.description}
        </p>

        {/* Price & Quantity */}
        <div className="flex flex-col sm:flex-row sm:items-baseline gap-0.5 sm:gap-2 mb-2 sm:mb-3 mt-auto">
          <div className="flex items-center gap-2">
            <span className="font-heading text-base sm:text-lg lg:text-xl font-bold text-primary">
              {formatPrice(product.price)} <span className="text-xs sm:text-sm">FCFA</span>
            </span>
            {product.originalPrice && (
              <span className="text-xs text-muted-foreground line-through">
                {formatPrice(product.originalPrice)}
              </span>
            )}
          </div>
          <span className="text-[10px] sm:text-sm text-muted-foreground">
            / {product.unit}
          </span>
        </div>

        {/* Stock - simplified on mobile */}
        <div className="text-[10px] sm:text-sm text-muted-foreground mb-2 sm:mb-3">
          <span className="sm:hidden">Stock: {product.quantity}</span>
          <span className="hidden sm:inline">Stock: <span className="font-medium text-foreground">{product.quantity} {product.unit}s</span></span>
        </div>

        {/* Producer - simplified on mobile */}
        <div className="flex items-center gap-2 sm:gap-3 pt-2 sm:pt-3 lg:pt-4 border-t border-border">
          <img
            src={product.producer.avatar}
            alt={product.producer.name}
            className="w-6 h-6 sm:w-8 sm:h-8 rounded-full object-cover"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-0.5 sm:gap-1">
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
        </div>
      </CardContent>
    </Card>
  </Link>
  );
};

export default ProductCard;
