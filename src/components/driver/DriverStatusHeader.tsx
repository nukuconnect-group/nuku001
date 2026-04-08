import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Loader2, Wifi, WifiOff } from "lucide-react";

interface DriverStatusHeaderProps {
  firstName: string;
  isAvailable: boolean;
  isToggling: boolean;
  isApproved: boolean;
  activeMissions: number;
  todayEarnings: number;
  rating: number;
  onToggle: () => void;
}

const DriverStatusHeader = ({
  firstName,
  isAvailable,
  isToggling,
  isApproved,
  activeMissions,
  todayEarnings,
  rating,
  onToggle,
}: DriverStatusHeaderProps) => {
  return (
    <div className="space-y-3">
      {/* Top bar: status toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isAvailable ? "bg-emerald-500" : "bg-muted"}`}>
            {isAvailable ? (
              <Wifi className="w-5 h-5 text-white" />
            ) : (
              <WifiOff className="w-5 h-5 text-muted-foreground" />
            )}
          </div>
          <div>
            <p className="text-base font-bold text-foreground">{firstName}</p>
            <div className="flex items-center gap-1.5">
              <div className={`w-2 h-2 rounded-full ${isAvailable ? "bg-emerald-500 animate-pulse" : "bg-red-500"}`} />
              <span className={`text-xs font-semibold ${isAvailable ? "text-emerald-600" : "text-red-500"}`}>
                {isAvailable ? "En ligne" : "Hors ligne"}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isToggling && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
          <Switch
            checked={isAvailable}
            onCheckedChange={onToggle}
            disabled={isToggling || !isApproved}
            className="data-[state=checked]:bg-emerald-500"
          />
        </div>
      </div>

      {/* Quick stats row */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-muted/50 rounded-xl p-3 text-center">
          <p className="text-lg font-bold text-foreground">{activeMissions}</p>
          <p className="text-[10px] text-muted-foreground">Missions actives</p>
        </div>
        <div className="bg-muted/50 rounded-xl p-3 text-center">
          <p className="text-lg font-bold text-emerald-600">{todayEarnings.toLocaleString()} F</p>
          <p className="text-[10px] text-muted-foreground">Gains du jour</p>
        </div>
        <div className="bg-muted/50 rounded-xl p-3 text-center">
          <p className="text-lg font-bold text-foreground">⭐ {rating.toFixed(1)}</p>
          <p className="text-[10px] text-muted-foreground">Note</p>
        </div>
      </div>
    </div>
  );
};

export default DriverStatusHeader;
