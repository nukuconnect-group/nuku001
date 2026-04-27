import { useEffect, useRef } from "react";
import { useCall } from "@/contexts/CallContext";
import { Phone, PhoneOff, Mic, MicOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function fmtDuration(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function CallModal() {
  const { status, meta, remoteStream, isMuted, durationSec, acceptCall, declineCall, hangup, toggleMute } = useCall();
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (audioRef.current && remoteStream) {
      audioRef.current.srcObject = remoteStream;
      audioRef.current.play().catch(() => {});
    }
  }, [remoteStream]);

  if (status === "idle" || !meta) return null;

  const isIncoming = status === "incoming";
  const isOutgoing = status === "outgoing";
  const isInCall = status === "in-call";

  return (
    <div className="fixed inset-0 z-[100] bg-gradient-to-b from-emerald-900/95 to-slate-950/95 backdrop-blur-sm flex flex-col items-center justify-between py-12 px-6 animate-fade-in">
      {/* Hidden audio element for remote stream */}
      <audio ref={audioRef} autoPlay playsInline />

      {/* Top: avatar + name + status */}
      <div className="flex flex-col items-center gap-4 text-white text-center pt-8">
        <div className={cn(
          "relative w-32 h-32 rounded-full overflow-hidden border-4 border-white/20",
          (isIncoming || isOutgoing) && "animate-pulse"
        )}>
          {meta.peerAvatar ? (
            <img src={meta.peerAvatar} alt={meta.peerName} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-emerald-700 flex items-center justify-center text-4xl font-bold">
              {meta.peerName.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        <h2 className="text-2xl font-semibold">{meta.peerName}</h2>
        <p className="text-sm text-white/70">
          {isIncoming && "📞 Appel entrant…"}
          {isOutgoing && "Appel en cours…"}
          {isInCall && fmtDuration(durationSec)}
        </p>
      </div>

      {/* Visual ringing animation */}
      {(isIncoming || isOutgoing) && (
        <div className="flex gap-2">
          {[0, 1, 2].map(i => (
            <span
              key={i}
              className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-bounce"
              style={{ animationDelay: `${i * 150}ms` }}
            />
          ))}
        </div>
      )}

      {/* Bottom controls */}
      <div className="flex items-center gap-6 pb-8">
        {isIncoming ? (
          <>
            <Button
              onClick={declineCall}
              className="w-16 h-16 rounded-full bg-red-600 hover:bg-red-700 shadow-lg"
              aria-label="Refuser"
            >
              <PhoneOff className="w-7 h-7 text-white" />
            </Button>
            <Button
              onClick={acceptCall}
              className="w-16 h-16 rounded-full bg-emerald-600 hover:bg-emerald-700 shadow-lg animate-pulse"
              aria-label="Accepter"
            >
              <Phone className="w-7 h-7 text-white" />
            </Button>
          </>
        ) : (
          <>
            {isInCall && (
              <Button
                onClick={toggleMute}
                className={cn(
                  "w-14 h-14 rounded-full shadow-lg",
                  isMuted ? "bg-white/20 hover:bg-white/30" : "bg-white/10 hover:bg-white/20"
                )}
                aria-label={isMuted ? "Activer le micro" : "Couper le micro"}
              >
                {isMuted ? <MicOff className="w-6 h-6 text-white" /> : <Mic className="w-6 h-6 text-white" />}
              </Button>
            )}
            <Button
              onClick={hangup}
              className="w-16 h-16 rounded-full bg-red-600 hover:bg-red-700 shadow-lg"
              aria-label="Raccrocher"
            >
              <PhoneOff className="w-7 h-7 text-white" />
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
