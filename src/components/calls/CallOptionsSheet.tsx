import { useMemo } from "react";
import { Sheet, SheetContent, SheetHeader } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Phone, Video, Clock, X, ShieldCheck } from "lucide-react";

interface CallOptionsSheetProps {
  open: boolean;
  onClose: () => void;
  peerName: string;
  peerAvatar: string;
  peerLocation?: string;
  peerTimezone?: string;
  availabilityStart?: string; // "HH:MM"
  availabilityEnd?: string;
  isVerified?: boolean;
  yearsActive?: number;
  /** Présence temps réel : true = connecté à NukuConnect maintenant */
  isOnline?: boolean;
  onVoiceCall: () => void;
  onVideoCall?: () => void;
  onScheduleCall?: () => void;
}

function getLocalTime(timezone?: string): { time: string; valid: boolean } {
  try {
    const tz = timezone || "Africa/Lome";
    const fmt = new Intl.DateTimeFormat("fr-FR", {
      timeZone: tz,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    return { time: fmt.format(new Date()), valid: true };
  } catch {
    return { time: "—", valid: false };
  }
}

function isWithinHours(start: string, end: string, now: string): boolean {
  // All HH:MM strings
  const toMin = (s: string) => {
    const [h, m] = s.split(":").map(Number);
    return (h || 0) * 60 + (m || 0);
  };
  const s = toMin(start), e = toMin(end), n = toMin(now);
  if (s <= e) return n >= s && n <= e;
  // Wrap (e.g. 22:00 -> 06:00)
  return n >= s || n <= e;
}

export default function CallOptionsSheet({
  open, onClose, peerName, peerAvatar, peerLocation, peerTimezone,
  availabilityStart = "08:00", availabilityEnd = "20:00",
  isVerified, yearsActive,
  onVoiceCall, onVideoCall, onScheduleCall,
}: CallOptionsSheetProps) {
  const { time: localTime } = useMemo(() => getLocalTime(peerTimezone), [peerTimezone]);
  const available = useMemo(
    () => isWithinHours(availabilityStart, availabilityEnd, localTime),
    [availabilityStart, availabilityEnd, localTime]
  );

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent
        side="bottom"
        className="rounded-t-3xl p-0 max-h-[90vh] overflow-y-auto border-0 w-full sm:max-w-md sm:mx-auto"
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-2.5 pb-1">
          <div className="w-10 h-1.5 rounded-full bg-muted-foreground/30" />
        </div>

        {/* Header with avatar (kept inside the sheet, fully visible) */}
        <SheetHeader className="pt-3 pb-4 px-4 sm:px-6 text-center space-y-2">
          <div className="mx-auto w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden border-4 border-background shadow-xl bg-card ring-1 ring-border">
            {peerAvatar ? (
              <img src={peerAvatar} alt={peerName} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-primary/20 flex items-center justify-center text-2xl sm:text-3xl font-bold text-primary">
                {peerName.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <h2 className="text-base font-semibold text-foreground break-words">{peerName}</h2>

          <div className="flex items-center justify-center gap-2 flex-wrap text-[11px]">
            {peerLocation && (
              <span className="text-muted-foreground break-words max-w-full">{peerLocation}</span>
            )}
            {yearsActive !== undefined && yearsActive > 0 && (
              <span className="px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-medium">
                {yearsActive} ans
              </span>
            )}
            {isVerified && (
              <span className="inline-flex items-center gap-1 text-emerald-600 font-medium">
                <ShieldCheck className="w-3 h-3" />
                Vérifié
              </span>
            )}
          </div>
        </SheetHeader>

        {/* Availability message */}
        <div className="px-4 sm:px-6 pb-3">
          <div className={`text-xs leading-relaxed text-center px-3 py-2.5 rounded-xl ${
            available
              ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300"
              : "bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300"
          }`}>
            {available ? (
              <>N'hésitez pas à m'appeler. Il est actuellement <strong>{localTime}</strong> chez moi.</>
            ) : (
              <>Je suis hors ligne pour le moment. Il est <strong>{localTime}</strong> chez moi (dispo {availabilityStart} – {availabilityEnd}).</>
            )}
          </div>
        </div>

        <div className="border-t border-border" />

        {/* Options */}
        <div className="py-2">
          {onVideoCall && (
            <button
              onClick={() => { onClose(); onVideoCall(); }}
              className="w-full flex items-center gap-4 px-4 sm:px-6 py-3.5 hover:bg-muted/50 transition-colors text-left"
            >
              <Video className="w-5 h-5 text-foreground/70 shrink-0" />
              <span className="text-sm font-medium text-foreground">Appel vidéo</span>
            </button>
          )}
          <button
            onClick={() => { onClose(); onVoiceCall(); }}
            className="w-full flex items-center gap-4 px-4 sm:px-6 py-3.5 hover:bg-muted/50 transition-colors text-left"
          >
            <Phone className="w-5 h-5 text-foreground/70 shrink-0" />
            <span className="text-sm font-medium text-foreground">Appel vocal</span>
          </button>
          {onScheduleCall && (
            <button
              onClick={() => { onClose(); onScheduleCall(); }}
              className="w-full flex items-center gap-4 px-4 sm:px-6 py-3.5 hover:bg-muted/50 transition-colors text-left"
            >
              <Clock className="w-5 h-5 text-foreground/70 shrink-0" />
              <span className="text-sm font-medium text-foreground">Programmer un appel</span>
            </button>
          )}
        </div>

        <div className="border-t border-border" />

        <Button
          onClick={onClose}
          variant="ghost"
          className="w-full h-12 text-orange-500 hover:text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-950/30 rounded-none text-sm font-semibold"
        >
          Annuler
        </Button>
      </SheetContent>
    </Sheet>
  );
}
