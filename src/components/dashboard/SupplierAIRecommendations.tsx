import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAIRecommendations, SupplierRecommendations } from "@/hooks/useAIRecommendations";
import { Users, TrendingUp, Lightbulb, Plus, DollarSign, Truck, Sparkles, MessageCircle } from "lucide-react";
import { Link } from "react-router-dom";

interface Props {
  userId: string;
  profileId: string;
  location?: string;
  onAddProduct?: () => void;
}

const SupplierAIRecommendations = ({ userId, profileId, location, onAddProduct }: Props) => {
  const { data, isLoading } = useAIRecommendations("producer", userId, profileId, location);
  const recs = data?.recommendations as SupplierRecommendations | undefined;

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Skeleton className="w-5 h-5 rounded" />
                <Skeleton className="h-4 w-40" />
              </div>
              <div className="space-y-2">
                {[1, 2].map(j => <Skeleton key={j} className="h-16 rounded-lg" />)}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!recs) return null;

  const suggestionIcon = (type: string) => {
    switch (type) {
      case "add_product": return <Plus className="w-4 h-4 text-primary" />;
      case "adjust_price": return <DollarSign className="w-4 h-4 text-accent-foreground" />;
      case "enable_delivery": return <Truck className="w-4 h-4 text-green-600" />;
      default: return <Lightbulb className="w-4 h-4 text-primary" />;
    }
  };

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Potential Clients */}
      {recs.potential_clients?.length > 0 && (
        <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
          <CardHeader className="p-3 sm:p-4 pb-2">
            <CardTitle className="text-xs sm:text-sm font-semibold flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" />
              Clients potentiels
              <Badge variant="secondary" className="text-[8px] ml-auto">IA</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 pt-0">
            <div className="space-y-2">
              {recs.potential_clients.slice(0, 5).map((client, i) => (
                <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Users className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground">{client.buyer_name || "Acheteur"}</p>
                    <p className="text-[10px] text-muted-foreground line-clamp-1">💡 {client.reason}</p>
                  </div>
                  <Link to="/messages">
                    <Button variant="outline" size="sm" className="h-7 text-[10px] gap-1">
                      <MessageCircle className="w-3 h-3" />Contacter
                    </Button>
                  </Link>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Trending Products */}
      {recs.trending_products?.length > 0 && (
        <Card>
          <CardHeader className="p-3 sm:p-4 pb-2">
            <CardTitle className="text-xs sm:text-sm font-semibold flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-accent-foreground" />
              Produits à forte demande
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 pt-0">
            <div className="space-y-2">
              {recs.trending_products.slice(0, 5).map((trend, i) => (
                <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/50">
                  <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
                    <TrendingUp className="w-4 h-4 text-accent-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground">{trend.category}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {trend.demand_count} demandes • Prix moy. ~{trend.avg_price?.toLocaleString()} F
                    </p>
                    <p className="text-[9px] text-primary mt-0.5">💡 {trend.suggestion}</p>
                  </div>
                  {onAddProduct && (
                    <Button variant="outline" size="sm" className="h-7 text-[10px] gap-1" onClick={onAddProduct}>
                      <Plus className="w-3 h-3" />Ajouter
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* AI Suggestions */}
      {recs.ai_suggestions?.length > 0 && (
        <Card className="border-accent/20">
          <CardHeader className="p-3 sm:p-4 pb-2">
            <CardTitle className="text-xs sm:text-sm font-semibold flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              Suggestions IA
              <Badge className="bg-primary/10 text-primary text-[8px] ml-auto">Personnalisé</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 pt-0">
            <div className="space-y-2">
              {recs.ai_suggestions.slice(0, 5).map((suggestion, i) => (
                <div key={i} className="flex items-start gap-3 p-2.5 rounded-lg bg-gradient-to-r from-primary/5 to-transparent border border-primary/10">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    {suggestionIcon(suggestion.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-foreground">{suggestion.title}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{suggestion.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default SupplierAIRecommendations;
