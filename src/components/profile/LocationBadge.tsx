import { MapPin } from "lucide-react";
import { parseLocation } from "@/lib/location";
import { cn } from "@/lib/utils";

interface LocationBadgeProps {
  location?: string | null;
  className?: string;
  size?: "sm" | "md";
}

/**
 * Unified location pill — ALWAYS renders something (city/country or fallback).
 * Used across producer/buyer/expert/driver profiles for visual consistency.
 */
const LocationBadge = ({ location, className, size = "md" }: LocationBadgeProps) => {
  const { city, country, display, flag, isFallback } = parseLocation(location);
  const text = city && country
    ? <>{city}<span className="opacity-70">, {country}</span></>
    : <>{display}</>;

  return (
    <div
      data-testid="location-badge"
      className={cn(
        "inline-flex items-center gap-1.5 rounded-none border",
        isFallback
          ? "bg-muted/50 border-muted-foreground/20 text-muted-foreground"
          : "bg-primary/10 border-primary/20 text-primary",
        size === "sm" ? "px-2 py-0.5" : "px-2.5 py-1",
        className,
      )}
    >
      <MapPin className={size === "sm" ? "w-3 h-3" : "w-3.5 h-3.5"} />
      <span className={cn("font-semibold", size === "sm" ? "text-[10px]" : "text-[11px] sm:text-xs")}>
        <span className="mr-1" aria-hidden>{flag}</span>
        {text}
      </span>
    </div>
  );
};

export default LocationBadge;
