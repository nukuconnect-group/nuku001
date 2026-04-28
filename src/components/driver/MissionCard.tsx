import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { MapPin, Clock, CheckCircle2, XCircle, Package, Navigation, DollarSign } from "lucide-react";

interface MissionCardProps {
  delivery: any;
  type: "new" | "active" | "completed";
  onAccept?: (id: string) => void;
  onReject?: (id: string) => void;
  onSelect?: (delivery: any) => void;
}

const statusConfig: Record<string, { label: string; color: string }> = {
  pending: { label: "En attente", color: "bg-amber-100 text-amber-800" },
  assigned: { label: "Assignée", color: "bg-blue-100 text-blue-800" },
  accepted: { label: "Acceptée", color: "bg-blue-100 text-blue-800" },
  picking: { label: "En route collecte", color: "bg-indigo-100 text-indigo-800" },
  picked_up: { label: "Récupérée", color: "bg-purple-100 text-purple-800" },
  delivering: { label: "En livraison", color: "bg-orange-100 text-orange-800" },
  in_transit: { label: "En livraison", color: "bg-orange-100 text-orange-800" },
  delivered: { label: "Livrée", color: "bg-emerald-100 text-emerald-800" },
  cancelled: { label: "Annulée", color: "bg-red-100 text-red-800" },
};

const MissionCard = ({ delivery, type, onAccept, onReject, onSelect }: MissionCardProps) => {
  const status = statusConfig[delivery.status] || statusConfig.pending;

  return (
    <Card
      className="overflow-hidden cursor-pointer hover:shadow-md transition-all active:scale-[0.99]"
      onClick={() => type !== "new" && onSelect?.(delivery)}
    >
      <CardContent className="p-3 space-y-2.5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <Package className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold">#{delivery.id.slice(0, 8)}</p>
              <p className="text-[10px] text-muted-foreground">
                {new Date(delivery.created_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm font-bold text-emerald-600">{(delivery.driver_fee || 0).toLocaleString("en-US")} F</p>
            <Badge className={`${status.color} text-[9px] px-1.5 py-0`}>{status.label}</Badge>
          </div>
        </div>

        {/* Route */}
        <div className="space-y-1.5">
          <div className="flex items-start gap-2">
            <div className="mt-1 flex flex-col items-center">
              <div className="w-2.5 h-2.5 rounded-full bg-blue-500 border-2 border-blue-200" />
              <div className="w-0.5 h-5 bg-muted-foreground/20" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-muted-foreground font-medium">COLLECTE</p>
              <p className="text-xs truncate">{delivery.pickup_address || "Adresse du vendeur"}</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <div className="mt-1">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-emerald-200" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-muted-foreground font-medium">LIVRAISON</p>
              <p className="text-xs truncate">{delivery.dropoff_address || "Adresse du client"}</p>
            </div>
          </div>
        </div>

        {/* Info chips */}
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
          {delivery.distance_km && (
            <span className="flex items-center gap-0.5 bg-muted/50 rounded-full px-2 py-0.5">
              <MapPin className="w-3 h-3" />
              {Number(delivery.distance_km).toFixed(1)} km
            </span>
          )}
          {delivery.estimated_minutes && (
            <span className="flex items-center gap-0.5 bg-muted/50 rounded-full px-2 py-0.5">
              <Clock className="w-3 h-3" />
              ~{delivery.estimated_minutes} min
            </span>
          )}
        </div>

        {/* Actions for new missions */}
        {type === "new" && (
          <div className="flex gap-2 pt-1" onClick={(e) => e.stopPropagation()}>
            <Button
              variant="default"
              size="sm"
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-9"
              onClick={() => onAccept?.(delivery.id)}
            >
              <CheckCircle2 className="w-4 h-4 mr-1" /> Accepter
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-red-600 border-red-200 hover:bg-red-50 text-xs h-9"
              onClick={() => onReject?.(delivery.id)}
            >
              <XCircle className="w-4 h-4 mr-1" /> Refuser
            </Button>
          </div>
        )}

        {/* Completed info */}
        {type === "completed" && (
          <div className="flex items-center justify-between pt-1 border-t border-border">
            <span className="text-[10px] text-muted-foreground">
              {delivery.delivered_at
                ? new Date(delivery.delivered_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })
                : "—"}
            </span>
            <span className="text-xs font-bold text-emerald-600">+{(delivery.driver_fee || 0).toLocaleString("en-US")} F</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default MissionCard;
