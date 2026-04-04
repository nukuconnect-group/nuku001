import { Badge } from "@/components/ui/badge";
import { Star, Zap, Shield, Award, Crown, TrendingUp } from "lucide-react";

interface DriverBadgesProps {
  rating: number | null;
  totalDeliveries: number | null;
  compact?: boolean;
}

const getBadges = (rating: number, deliveries: number) => {
  const badges: { label: string; icon: any; color: string; description: string }[] = [];

  if (rating >= 4.8) {
    badges.push({ label: "Top Livreur", icon: Crown, color: "bg-amber-500/15 text-amber-600 border-amber-500/30", description: "Note ≥ 4.8/5" });
  } else if (rating >= 4.5) {
    badges.push({ label: "Excellent", icon: Star, color: "bg-primary/15 text-primary border-primary/30", description: "Note ≥ 4.5/5" });
  }

  if (deliveries >= 100) {
    badges.push({ label: "Expert", icon: Shield, color: "bg-violet-500/15 text-violet-600 border-violet-500/30", description: "100+ livraisons" });
  } else if (deliveries >= 50) {
    badges.push({ label: "Confirmé", icon: Award, color: "bg-blue-500/15 text-blue-600 border-blue-500/30", description: "50+ livraisons" });
  } else if (deliveries >= 10) {
    badges.push({ label: "Actif", icon: TrendingUp, color: "bg-green-500/15 text-green-600 border-green-500/30", description: "10+ livraisons" });
  }

  if (rating >= 4.5 && deliveries >= 20) {
    badges.push({ label: "Ponctuel", icon: Zap, color: "bg-orange-500/15 text-orange-600 border-orange-500/30", description: "Fiable et rapide" });
  }

  return badges;
};

const DriverBadges = ({ rating, totalDeliveries, compact = false }: DriverBadgesProps) => {
  const r = rating ?? 0;
  const d = totalDeliveries ?? 0;
  const badges = getBadges(r, d);

  if (badges.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5">
      {badges.map((badge) => (
        <Badge
          key={badge.label}
          variant="outline"
          className={`${badge.color} gap-1 ${compact ? "text-[9px] py-0 px-1.5" : "text-[10px] py-0.5 px-2"} border`}
          title={badge.description}
        >
          <badge.icon className={compact ? "w-2.5 h-2.5" : "w-3 h-3"} />
          {badge.label}
        </Badge>
      ))}
    </div>
  );
};

export default DriverBadges;
