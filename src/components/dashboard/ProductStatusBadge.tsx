import { Badge } from "@/components/ui/badge";
import { Clock, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface ProductStatusBadgeProps {
  status: string;
  reason?: string | null;
  scheduledAt?: string | null;
  className?: string;
}

/**
 * Badge clair affichant l'état de modération d'un produit
 * (En attente / Approuvé / Rejeté) + raison si rejeté.
 */
export const ProductStatusBadge = ({ status, reason, scheduledAt, className = "" }: ProductStatusBadgeProps) => {
  if (status === "approved") {
    return (
      <Badge className={`bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 gap-1 text-[9px] sm:text-[10px] ${className}`}>
        <CheckCircle2 className="w-2.5 h-2.5" /> Approuvé
      </Badge>
    );
  }

  if (status === "rejected") {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge className={`bg-destructive/15 text-destructive border-destructive/30 gap-1 text-[9px] sm:text-[10px] cursor-help ${className}`}>
            <XCircle className="w-2.5 h-2.5" /> Rejeté
          </Badge>
        </TooltipTrigger>
        {reason && (
          <TooltipContent className="max-w-xs">
            <p className="text-xs"><strong>Raison :</strong> {reason}</p>
          </TooltipContent>
        )}
      </Tooltip>
    );
  }

  // pending
  const minutesLeft = scheduledAt
    ? Math.max(0, Math.round((new Date(scheduledAt).getTime() - Date.now()) / 60000))
    : null;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge className={`bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30 gap-1 text-[9px] sm:text-[10px] cursor-help ${className}`}>
          <Clock className="w-2.5 h-2.5" /> En attente
          {minutesLeft !== null && minutesLeft > 0 && <span className="ml-0.5">({minutesLeft}m)</span>}
        </Badge>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs">
        <p className="text-xs">
          <AlertCircle className="w-3 h-3 inline mr-1" />
          Analyse IA en cours. Visible sur la marketplace dès l'approbation
          {scheduledAt ? ` (vers ${new Date(scheduledAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })})` : ""}.
        </p>
      </TooltipContent>
    </Tooltip>
  );
};

export default ProductStatusBadge;
