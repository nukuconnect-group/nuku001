import { useEffect, useRef } from "react";
import { useCall } from "@/contexts/CallContext";
import { Phone, PhoneOff, Mic, MicOff, Video, VideoOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function fmtDuration(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function CallModal() {
  const {
    status, meta, remoteStream, localStream, isMuted, isCameraOff,
    durationSec, qualityTier, acceptCall, declineCall, hangup, toggleMute, toggleCamera,
  } = useCall();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);

  const isVideo = !!meta?.withVideo;

  useEffect(() => {
    if (audioRef.current && remoteStream) {
      audioRef.current.srcObject = remoteStream;
      audioRef.current.play().catch(() => {});
    }
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
      remoteVideoRef.current.play().catch(() => {});
    }
  }, [remoteStream]);

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
      localVideoRef.current.play().catch(() => {});
    }
  }, [localStream]);

  if (status === "idle" || !meta) return null;

  const isIncoming = status === "incoming";
  const isOutgoing = status === "outgoing";
  const isInCall = status === "in-call";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={isIncoming ? `Appel ${isVideo ? "vidéo " : ""}entrant de ${meta.peerName}` : isOutgoing ? `Appel ${isVideo ? "vidéo " : ""}sortant vers ${meta.peerName}` : `En communication avec ${meta.peerName}`}
      className="fixed inset-0 z-[100] bg-gradient-to-b from-emerald-900/95 to-slate-950/95 backdrop-blur-sm flex flex-col items-center justify-between py-12 px-6 animate-fade-in"
    >
      {/* Hidden audio element (always for fallback audio playback) */}
      <audio ref={audioRef} autoPlay playsInline />

      {/* Remote video — fullscreen during in-call video */}
      {isVideo && isInCall && (
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className="absolute inset-0 w-full h-full object-cover bg-black z-0"
        />
      )}

      {/* Local video preview (PiP) — visible whenever we have local video */}
      {isVideo && localStream && (
        <video
          ref={localVideoRef}
          autoPlay
          playsInline
          muted
          className={cn(
            "absolute z-10 rounded-2xl border-2 border-white/30 shadow-xl object-cover bg-black",
            isInCall
              ? "top-6 right-6 w-28 h-40 sm:w-36 sm:h-52"
              : "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-80 sm:w-80 sm:h-96"
          )}
        />
      )}

      {/* Top: avatar + name + status — masqué pendant un appel vidéo en cours */}
      {!(isVideo && isInCall) && (
        <div className="relative z-10 flex flex-col items-center gap-4 text-white text-center pt-8">
          <div className={cn(
            "relative w-32 h-32 rounded-full overflow-hidden border-4 border-white/20",
            (isIncoming || isOutgoing) && "animate-pulse"
          )}>
            {meta.peerAvatar ? (
              <img src={meta.peerAvatar} alt={meta.peerName} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-emerald-700 flex items-center justify-center text-4xl font-bold" aria-hidden="true">
                {meta.peerName.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <h2 className="text-2xl font-semibold">{meta.peerName}</h2>
          <p className="text-sm text-white/70" aria-live="assertive" aria-atomic="true">
            {isIncoming && (isVideo ? "📹 Appel vidéo entrant…" : "📞 Appel entrant…")}
            {isOutgoing && (isVideo ? "Appel vidéo en cours…" : "Appel en cours…")}
            {isInCall && fmtDuration(durationSec)}
          </p>
        </div>
      )}

      {/* Overlay name+timer + indicateur qualité pour appel vidéo en cours */}
      {isVideo && isInCall && (
        <div className="relative z-10 flex flex-col items-center gap-1 text-white text-center pt-4 px-4 py-2 rounded-2xl bg-black/40 backdrop-blur-sm">
          <h2 className="text-lg font-semibold">{meta.peerName}</h2>
          <div className="flex items-center gap-2 text-xs text-white/80">
            <span>{fmtDuration(durationSec)}</span>
            <QualityBadge tier={qualityTier} />
          </div>
        </div>
      )}

      {/* Indicateur qualité discret pour les appels audio */}
      {!isVideo && isInCall && qualityTier !== "high" && (
        <div className="relative z-10 -mt-4">
          <QualityBadge tier={qualityTier} />
        </div>
      )}

      {/* Visual ringing animation */}
      {(isIncoming || isOutgoing) && (
        <div className="relative z-10 flex gap-2">
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
      <div className="relative z-10 flex items-center gap-4 sm:gap-6 pb-8">
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
              {isVideo ? <Video className="w-7 h-7 text-white" /> : <Phone className="w-7 h-7 text-white" />}
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
            {isInCall && isVideo && (
              <Button
                onClick={toggleCamera}
                className={cn(
                  "w-14 h-14 rounded-full shadow-lg",
                  isCameraOff ? "bg-white/20 hover:bg-white/30" : "bg-white/10 hover:bg-white/20"
                )}
                aria-label={isCameraOff ? "Activer la caméra" : "Couper la caméra"}
              >
                {isCameraOff ? <VideoOff className="w-6 h-6 text-white" /> : <Video className="w-6 h-6 text-white" />}
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

// ─────────────────────────────────────────────────────────────────────────────
// Quality badge — renvoie un petit indicateur visuel selon le palier adaptatif
// ─────────────────────────────────────────────────────────────────────────────
function QualityBadge({ tier }: { tier: "high" | "medium" | "low" | "audio-only" }) {
  const cfg: Record<typeof tier, { label: string; dotClass: string }> = {
    high: { label: "HD", dotClass: "bg-emerald-400" },
    medium: { label: "SD", dotClass: "bg-yellow-400" },
    low: { label: "Faible", dotClass: "bg-orange-400" },
    "audio-only": { label: "Audio seul", dotClass: "bg-red-400" },
  };
  const { label, dotClass } = cfg[tier];
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white/15 text-[10px] font-medium uppercase tracking-wider"
      title={`Qualité réseau : ${label}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${dotClass} animate-pulse`} />
      {label}
    </span>
  );
}
