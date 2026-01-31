import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowRight, Star, MapPin } from "lucide-react";
import { Link } from "react-router-dom";
import { products } from "@/data/marketplace";

const FeaturedProducts = () => {
  // Get first 8 products for featured display
  const featuredProducts = products.slice(0, 8);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("fr-FR").format(price);
  };

  return (
    <section className="py-16 lg:py-24 bg-muted/30">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-10">
          <div>
            <span className="inline-block px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-3">
              Produits Vedettes
            </span>
            <h2 className="font-heading text-2xl md:text-3xl lg:text-4xl font-bold text-foreground">
              Découvrez nos <span className="text-primary">meilleurs produits</span>
            </h2>
          </div>
          <Link to="/marketplace">
            <Button variant="outline" className="group">
              Voir tout
              <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 md:gap-6">
          {featuredProducts.map((product, index) => (
            <Link 
              to="/marketplace" 
              key={product.id}
              className="block animate-fade-in-up"
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              <Card 
                variant="feature" 
                className="h-full overflow-hidden group hover:shadow-elevated transition-all duration-300 cursor-pointer"
              >
                {/* Image */}
                <div className="relative aspect-square overflow-hidden">
                  <img
                    src={product.image}
                    alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                  {/* Overlay Gradient */}
                  <div className="absolute inset-0 bg-gradient-to-t from-foreground/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  
                  {/* Badges */}
                  {product.isOrganic && (
                    <Badge className="absolute top-2 left-2 bg-primary text-primary-foreground text-xs">
                      BIO
                    </Badge>
                  )}
                  
                  {/* Price on Hover */}
                  <div className="absolute bottom-2 left-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <span className="inline-block px-2 py-1 bg-card/90 backdrop-blur-sm rounded-lg font-heading font-bold text-primary text-sm">
                      {formatPrice(product.price)} FCFA
                    </span>
                  </div>
                </div>

                {/* Content */}
                <CardContent className="p-3">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                    <MapPin className="w-3 h-3" />
                    <span className="truncate">{product.location}</span>
                  </div>
                  <h3 className="font-medium text-foreground text-sm line-clamp-1 group-hover:text-primary transition-colors">
                    {product.name}
                  </h3>
                  <div className="flex items-center justify-between mt-2">
                    <span className="font-heading font-bold text-primary text-sm">
                      {formatPrice(product.price)} <span className="text-xs text-muted-foreground font-normal">/{product.unit}</span>
                    </span>
                    <div className="flex items-center gap-1">
                      <Star className="w-3 h-3 text-accent fill-accent" />
                      <span className="text-xs">{product.producer.rating}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        {/* CTA */}
        <div className="text-center mt-10">
          <Link to="/marketplace">
            <Button variant="hero" size="lg" className="group">
              Explorer la Marketplace
              <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
};

export default FeaturedProducts;
