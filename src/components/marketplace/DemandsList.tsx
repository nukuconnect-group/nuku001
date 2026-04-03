import { useDemands } from "@/hooks/useDemands";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { HandCoins, MapPin, MessageCircle, Loader2, User } from "lucide-react";
import { Link } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";

interface DemandsListProps {
  category?: string;
  limit?: number;
}

const DemandsList = ({ category, limit }: DemandsListProps) => {
  const { data: demands, isLoading } = useDemands(category);
  const { formatPrice } = useLanguage();

  if (isLoading) return <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>;

  const items = limit ? (demands || []).slice(0, limit) : (demands || []);

  if (items.length === 0) return null;

  return (
    <div className="space-y-2">
      {items.map((demand) => (
        <Card key={demand.id} className="overflow-hidden hover:shadow-md transition-all">
          <CardContent className="p-3">
            <div className="flex items-start gap-3">
              {(demand as any).image_url ? (
                <img src={(demand as any).image_url} alt="" className="w-14 h-14 rounded-lg object-cover flex-shrink-0 border border-border" />
              ) : (
                <div className="w-9 h-9 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0">
                  {demand.profile?.avatar_url ? (
                    <img src={demand.profile.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                  ) : (
                    <User className="w-4 h-4 text-accent-foreground" />
                  )}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <Badge className="bg-orange-500 text-white text-[9px] px-1.5 py-0 gap-0.5 font-bold">
                    <HandCoins className="w-2.5 h-2.5" />ACHAT
                  </Badge>
                  <Badge variant="secondary" className="text-[9px] px-1.5 py-0">{demand.category}</Badge>
                </div>
                <h4 className="font-semibold text-xs text-foreground line-clamp-1">{demand.title}</h4>
                {demand.description && (
                  <p className="text-[10px] text-muted-foreground line-clamp-2 mt-0.5">{demand.description}</p>
                )}
                <div className="flex items-center gap-2 mt-1 text-[9px] text-muted-foreground flex-wrap">
                  <span className="font-medium text-foreground">{demand.profile?.full_name || "Utilisateur"}</span>
                  {demand.quantity && <span>• {demand.quantity} {demand.unit}</span>}
                  {demand.budget && <span>• Budget: {formatPrice(demand.budget)}</span>}
                  {demand.location && <span className="flex items-center gap-0.5"><MapPin className="w-2 h-2" />{demand.location}</span>}
                </div>
              </div>
              <Button variant="outline" size="sm" className="text-[10px] h-7 gap-1 flex-shrink-0" asChild>
                <Link to="/messages">
                  <MessageCircle className="w-3 h-3" />Répondre
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default DemandsList;
