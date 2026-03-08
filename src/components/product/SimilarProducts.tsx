import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/contexts/LanguageContext";
import { products as mockProducts, type Product } from "@/data/marketplace";
import { MapPin } from "lucide-react";

interface SimilarProductsProps {
  currentProduct: Product;
}

const SimilarProducts = ({ currentProduct }: SimilarProductsProps) => {
  const { formatPrice } = useLanguage();

  const similar = useMemo(() => {
    return mockProducts
      .filter(p => p.id !== currentProduct.id && (
        p.category === currentProduct.category ||
        p.location === currentProduct.location
      ))
      .slice(0, 6);
  }, [currentProduct]);

  if (similar.length === 0) return null;

  return (
    <div className="mt-8 sm:mt-12">
      <h2 className="font-heading text-base sm:text-lg font-bold text-foreground mb-3 sm:mb-4">
        Produits similaires
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-2 sm:gap-3">
        {similar.map(p => (
          <Link key={p.id} to={`/produit/${p.id}`} className="group block">
            <div className="overflow-hidden bg-muted rounded-none sm:rounded-lg">
              <div className="aspect-square overflow-hidden">
                <img
                  src={p.image}
                  alt={p.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>
              <div className="p-2 sm:p-2.5">
                <h3 className="text-[11px] sm:text-xs font-semibold text-foreground line-clamp-2 leading-tight mb-1">
                  {p.name}
                </h3>
                <p className="text-xs sm:text-sm font-bold text-primary">{formatPrice(p.price)}<span className="text-[9px] sm:text-[10px] text-muted-foreground font-normal">/{p.unit}</span></p>
                <div className="flex items-center gap-1 mt-1">
                  <MapPin className="w-2.5 h-2.5 text-muted-foreground" />
                  <span className="text-[9px] sm:text-[10px] text-muted-foreground truncate">{p.location}</span>
                </div>
                {p.discount && (
                  <Badge className="mt-1 bg-destructive text-destructive-foreground text-[8px] sm:text-[9px] px-1 py-0">-{p.discount}%</Badge>
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default SimilarProducts;
