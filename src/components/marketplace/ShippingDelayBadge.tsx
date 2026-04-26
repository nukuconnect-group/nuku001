import { Truck, Zap } from "lucide-react";

interface Props {
  days?: number | null;
  size?: "xs" | "sm";
  className?: string;
}

/** Affiche le délai d'expédition : "Expédition immédiate" / "Sous 24h" / "Sous N jours" */
export const formatShippingDelay = (days?: number | null) => {
  if (days == null) return "Expédition rapide";
  if (days <= 0) return "Expédition immédiate";
  if (days === 1) return "Expédition sous 24h";
  return `Expédition sous ${days} jours`;
};

export default function ShippingDelayBadge({ days, size = "xs", className = "" }: Props) {
  const isFast = (days ?? 1) <= 1;
  const Icon = isFast ? Zap : Truck;
  const text = formatShippingDelay(days);
  const sizeCls = size === "sm" ? "text-[10px] sm:text-xs" : "text-[8px] sm:text-[9px]";
  return (
    <span className={`inline-flex items-center gap-0.5 ${sizeCls} ${isFast ? "text-emerald-600 dark:text-emerald-400 font-medium" : "text-muted-foreground"} ${className}`}>
      <Icon className="w-2.5 h-2.5 flex-shrink-0" />
      <span className="truncate">{text}</span>
    </span>
  );
}
