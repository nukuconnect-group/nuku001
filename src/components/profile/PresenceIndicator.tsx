import { formatPresence } from "@/lib/location";
import { cn } from "@/lib/utils";

interface PresenceIndicatorProps {
  lastActiveAt?: string | Date | null;
  className?: string;
}

/**
 * Shows a green dot + "En ligne" when active in the last 5 minutes,
 * otherwise a grey dot + "Vu il y a X min/h/j".
 */
const PresenceIndicator = ({ lastActiveAt, className }: PresenceIndicatorProps) => {
  const { label, isOnline } = formatPresence(lastActiveAt);
  return (
    <span
      data-testid="presence-indicator"
      data-online={isOnline ? "true" : "false"}
      className={cn("inline-flex items-center gap-1 text-[10px] sm:text-xs", className)}
    >
      <span
        className={cn(
          "w-2 h-2 rounded-full",
          isOnline ? "bg-emerald-500 animate-pulse" : "bg-muted-foreground/50",
        )}
      />
      <span className={isOnline ? "text-emerald-600 font-medium" : "text-muted-foreground"}>
        {label}
      </span>
    </span>
  );
};

export default PresenceIndicator;
