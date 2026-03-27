import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAIRecommendations, BuyerRecommendations } from "@/hooks/useAIRecommendations";
import { useProducts } from "@/hooks/useProducts";
import { useLanguage } from "@/contexts/LanguageContext";
import { Sparkles, MapPin, Star, GraduationCap, ShoppingBag, Users, Loader2 } from "lucide-react";

interface Props {
  userId: string;
  profileId: string;
  location?: string;
}

const BuyerAIRecommendations = ({ userId, profileId, location }: Props) => {
  const { data, isLoading } = useAIRecommendations("buyer", userId, profileId, location);
  const { data: allProducts } = useProducts();
  const { formatPrice } = useLanguage();

  const recs = data?.recommendations as BuyerRecommendations | undefined;
  const ctx = data?.context;

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2].map(i => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Skeleton className="w-5 h-5 rounded" />
                <Skeleton className="h-4 w-40" />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {[1, 2, 3].map(j => <Skeleton key={j} className="h-32 rounded-lg" />)}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!recs) return null;

  const getProduct = (id: string) => allProducts?.find(p => p.id === id) || ctx?.products?.find((p: any) => p.id === id);
  const getProducer = (id: string) => ctx?.producers?.find((p: any) => p.id === id);
  const getFormation = (id: string) => ctx?.formations?.find((f: any) => f.id === id);

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Recommended Products */}
      {recs.recommended_products?.length > 0 && (
        <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
          <CardHeader className="p-3 sm:p-4 pb-2">
            <CardTitle className="text-xs sm:text-sm font-semibold flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              Recommandé pour vous
              <Badge variant="secondary" className="text-[8px] ml-auto">IA</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 pt-0">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {recs.recommended_products.slice(0, 6).map((rec) => {
                const product = getProduct(rec.id);
                if (!product) return null;
                return (
                  <Link key={rec.id} to={`/produit/${rec.id}`} className="group block">
                    <div className="rounded-lg overflow-hidden bg-muted">
                      <div className="aspect-square overflow-hidden">
                        <img src={product.images?.[0] || product.image} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                      </div>
                      <div className="p-2">
                        <p className="text-[10px] sm:text-xs font-medium text-foreground line-clamp-1">{product.name}</p>
                        <p className="text-xs font-bold text-primary">{formatPrice(product.price)}<span className="text-[9px] text-muted-foreground font-normal">/{product.unit}</span></p>
                        <p className="text-[8px] text-muted-foreground mt-0.5 line-clamp-1">💡 {rec.reason}</p>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Similar Products */}
      {recs.similar_products?.length > 0 && (
        <Card>
          <CardHeader className="p-3 sm:p-4 pb-2">
            <CardTitle className="text-xs sm:text-sm font-semibold flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-accent-foreground" />
              Produits similaires à vos achats
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 pt-0">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {recs.similar_products.slice(0, 6).map((rec) => {
                const product = getProduct(rec.id);
                if (!product) return null;
                return (
                  <Link key={rec.id} to={`/produit/${rec.id}`} className="group block">
                    <div className="rounded-lg overflow-hidden bg-muted">
                      <div className="aspect-square overflow-hidden">
                        <img src={product.images?.[0] || product.image} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                      </div>
                      <div className="p-2">
                        <p className="text-[10px] sm:text-xs font-medium text-foreground line-clamp-1">{product.name}</p>
                        <p className="text-xs font-bold text-primary">{formatPrice(product.price)}</p>
                        <p className="text-[8px] text-muted-foreground mt-0.5 line-clamp-1">🔗 {rec.reason}</p>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Nearby Suppliers */}
      {recs.nearby_suppliers?.length > 0 && (
        <Card>
          <CardHeader className="p-3 sm:p-4 pb-2">
            <CardTitle className="text-xs sm:text-sm font-semibold flex items-center gap-2">
              <MapPin className="w-4 h-4 text-primary" />
              Fournisseurs proches
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 pt-0">
            <div className="space-y-2">
              {recs.nearby_suppliers.slice(0, 5).map((rec) => {
                const producer = getProducer(rec.id);
                if (!producer) return null;
                return (
                  <Link key={rec.id} to={`/producteurs/${encodeURIComponent(producer.full_name || "")}`} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted transition-colors">
                    <img src={producer.avatar_url || "/placeholder.svg"} alt="" className="w-10 h-10 rounded-full object-cover" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">{producer.full_name}</p>
                      <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <MapPin className="w-2.5 h-2.5" />{producer.location || "Non spécifié"}
                      </p>
                    </div>
                    {producer.is_verified && <Badge variant="secondary" className="text-[8px]">✓ Vérifié</Badge>}
                  </Link>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recommended Formations */}
      {recs.recommended_formations?.length > 0 && (
        <Card>
          <CardHeader className="p-3 sm:p-4 pb-2">
            <CardTitle className="text-xs sm:text-sm font-semibold flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-accent-foreground" />
              Formations recommandées
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 pt-0">
            <div className="space-y-2">
              {recs.recommended_formations.slice(0, 4).map((rec) => {
                const formation = getFormation(rec.id);
                if (!formation) return null;
                return (
                  <Link key={rec.id} to="/formations" className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted transition-colors">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <GraduationCap className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground line-clamp-1">{formation.title}</p>
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                        <span className="flex items-center gap-0.5"><Star className="w-2.5 h-2.5 text-accent fill-accent" />{formation.rating}</span>
                        <span>{formation.students_count} étudiants</span>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-[8px]">{formation.level}</Badge>
                  </Link>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default BuyerAIRecommendations;
