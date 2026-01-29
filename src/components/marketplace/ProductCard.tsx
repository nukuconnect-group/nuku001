import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Star, MapPin, MessageCircle, Heart, ShieldCheck, Leaf } from "lucide-react";
import { Product } from "@/data/marketplace";

interface ProductCardProps {
  product: Product;
}

const ProductCard = ({ product }: ProductCardProps) => {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("fr-FR").format(price);
  };

  return (
    <Card variant="feature" className="group overflow-hidden">
      {/* Image */}
      <div className="relative h-48 overflow-hidden">
        <img
          src={product.image}
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        
        {/* Badges */}
        <div className="absolute top-3 left-3 flex gap-2">
          {product.isOrganic && (
            <Badge className="bg-primary text-primary-foreground border-0 gap-1">
              <Leaf className="w-3 h-3" />
              Bio
            </Badge>
          )}
        </div>

        {/* Wishlist */}
        <button className="absolute top-3 right-3 w-9 h-9 rounded-full bg-card/80 backdrop-blur-sm flex items-center justify-center hover:bg-card transition-colors group/heart">
          <Heart className="w-4 h-4 text-muted-foreground group-hover/heart:text-destructive transition-colors" />
        </button>
      </div>

      <CardContent className="p-4">
        {/* Category & Location */}
        <div className="flex items-center justify-between mb-2">
          <Badge variant="secondary" className="text-xs font-normal capitalize">
            {product.category}
          </Badge>
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <MapPin className="w-3 h-3" />
            {product.location}
          </span>
        </div>

        {/* Title */}
        <h3 className="font-heading font-semibold text-foreground mb-1 line-clamp-1 group-hover:text-primary transition-colors">
          {product.name}
        </h3>

        {/* Description */}
        <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
          {product.description}
        </p>

        {/* Price & Quantity */}
        <div className="flex items-baseline gap-2 mb-4">
          <span className="font-heading text-xl font-bold text-primary">
            {formatPrice(product.price)} FCFA
          </span>
          <span className="text-sm text-muted-foreground">
            / {product.unit}
          </span>
        </div>

        {/* Stock */}
        <div className="text-sm text-muted-foreground mb-4">
          Stock disponible: <span className="font-medium text-foreground">{product.quantity} {product.unit}s</span>
        </div>

        {/* Producer */}
        <div className="flex items-center gap-3 pt-4 border-t border-border">
          <img
            src={product.producer.avatar}
            alt={product.producer.name}
            className="w-10 h-10 rounded-full object-cover"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1">
              <span className="text-sm font-medium text-foreground truncate">
                {product.producer.name}
              </span>
              {product.producer.verified && (
                <ShieldCheck className="w-4 h-4 text-primary flex-shrink-0" />
              )}
            </div>
            <div className="flex items-center gap-1">
              <Star className="w-3 h-3 text-accent fill-accent" />
              <span className="text-xs text-muted-foreground">
                {product.producer.rating}
              </span>
            </div>
          </div>
          <Button size="sm" variant="outline" className="gap-1">
            <MessageCircle className="w-4 h-4" />
            <span className="hidden sm:inline">Contacter</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default ProductCard;
