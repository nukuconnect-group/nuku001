import { useEffect, useRef, useState } from "react";
import { useCall } from "@/contexts/CallContext";
import { Phone, PhoneOff, Mic, MicOff, Video, VideoOff, Gauge, Wifi, WifiOff, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import type { QualityTier } from "@/lib/adaptiveCallQuality";

function fmtDuration(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function CallModal() {
  const {
    status, meta, remoteStream, localStream, isMuted, isCameraOff,
    durationSec, qualityTier, qualityReason, dataSaver, setDataSaver,
    acceptCall, declineCall, hangup, toggleMute, toggleCamera,
  } = useCall();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [showQualityDetails, setShowQualityDetails] = useState(false);
  const [isSpeaker, setIsSpeaker] = useState(false);
  const [videoSwapped, setVideoSwapped] = useState(false);
  const [orientation, setOrientation] = useState<"portrait" | "landscape">(
    typeof window !== "undefined" && window.matchMedia("(orientation: landscape)").matches
      ? "landscape" : "portrait"
  );

  const isVideo = !!meta?.withVideo;

  // Speaker toggle: use setSinkId when available
  useEffect(() => {
    if (audioRef.current && typeof (audioRef.current as any).setSinkId === "function") {
      (audioRef.current as any).setSinkId(isSpeaker ? "default" : "").catch(() => {});
    }
  }, [isSpeaker]);

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

  // Gestion de la rotation : on suit l'orientation pour ré-appliquer object-fit
  // et garder la vidéo cadrée correctement sans interrompre le flux WebRTC.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mql = window.matchMedia("(orientation: landscape)");
    const handler = (e: MediaQueryListEvent | MediaQueryList) => {
      setOrientation(("matches" in e ? e.matches : (e as MediaQueryList).matches) ? "landscape" : "portrait");
      // Force un reflow doux des <video> pour réajuster le cadrage
      requestAnimationFrame(() => {
        if (remoteVideoRef.current) {
          // touche minime pour redéclencher le layout
          remoteVideoRef.current.style.transform = "translateZ(0)";
        }
        if (localVideoRef.current) {
          localVideoRef.current.style.transform = "translateZ(0)";
        }
      });
    };
    if (mql.addEventListener) mql.addEventListener("change", handler);
    else mql.addListener(handler as (e: MediaQueryListEvent) => void);
    // Capacitor / iOS : screen.orientation est plus fiable que matchMedia
    const orientationListener = () => handler(mql);
    window.addEventListener("orientationchange", orientationListener);
    return () => {
      if (mql.removeEventListener) mql.removeEventListener("change", handler);
      else mql.removeListener(handler as (e: MediaQueryListEvent) => void);
      window.removeEventListener("orientationchange", orientationListener);
    };
  }, []);

  // Ferme le panneau qualité si l'appel se termine
  useEffect(() => {
    if (status === "idle") setShowQualityDetails(false);
  }, [status]);

  if (status === "idle" || !meta) return null;

  const isIncoming = status === "incoming";
  const isOutgoing = status === "outgoing";
  const isInCall = status === "in-call";

  return (
    <div
      ref={containerRef}
      role="dialog"
      aria-modal="true"
      data-orientation={orientation}
      aria-label={isIncoming ? `Appel ${isVideo ? "vidéo " : ""}entrant de ${meta.peerName}` : isOutgoing ? `Appel ${isVideo ? "vidéo " : ""}sortant vers ${meta.peerName}` : `En communication avec ${meta.peerName}`}
      className="fixed inset-0 z-[100] bg-gradient-to-b from-emerald-900/95 to-slate-950/95 backdrop-blur-sm flex flex-col items-center justify-between py-8 sm:py-12 px-4 sm:px-6 animate-fade-in"
    >
      {/* Hidden audio element (always for fallback audio playback) */}
      <audio ref={audioRef} autoPlay playsInline />

      {/* Main video (remote or local based on swap) */}
      {isVideo && isInCall && (
        <video
          ref={videoSwapped ? localVideoRef : remoteVideoRef}
          autoPlay
          playsInline
          muted={videoSwapped}
          className={cn(
            "absolute inset-0 w-full h-full bg-black z-0 transition-[object-position] duration-300",
            orientation === "landscape" ? "object-contain" : "object-cover"
          )}
        />
      )}

      {/* PiP video (tap to swap) */}
      {isVideo && localStream && (
        <video
          ref={videoSwapped ? remoteVideoRef : localVideoRef}
          autoPlay
          playsInline
          muted={!videoSwapped}
          onClick={() => isInCall && setVideoSwapped(!videoSwapped)}
          className={cn(
            "absolute z-10 rounded-2xl border-2 border-white/30 shadow-xl object-cover bg-black transition-all duration-300 cursor-pointer active:scale-95",
            isInCall
              ? orientation === "landscape"
                ? "top-4 right-4 w-32 h-20 sm:w-44 sm:h-28"
                : "top-6 right-6 w-24 h-32 sm:w-32 sm:h-44"
              : "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-56 h-72 sm:w-80 sm:h-96"
          )}
        />
      )}

      {/* Top: avatar + name + status — masqué pendant un appel vidéo en cours */}
      {!(isVideo && isInCall) && (
        <div className="relative z-10 flex flex-col items-center gap-4 text-white text-center pt-4 sm:pt-8">
          <div className={cn(
            "relative w-24 h-24 sm:w-32 sm:h-32 rounded-full overflow-hidden border-4 border-white/20",
            (isIncoming || isOutgoing) && "animate-pulse"
          )}>
            {meta.peerAvatar ? (
              <img src={meta.peerAvatar} alt={meta.peerName} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-emerald-700 flex items-center justify-center text-3xl sm:text-4xl font-bold" aria-hidden="true">
                {meta.peerName.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <h2 className="text-xl sm:text-2xl font-semibold">{meta.peerName}</h2>
          <p className="text-sm text-white/70" aria-live="assertive" aria-atomic="true">
            {isIncoming && (isVideo ? "📹 Appel vidéo entrant…" : "📞 Appel entrant…")}
            {isOutgoing && (isVideo ? "Appel vidéo en cours…" : "Appel en cours…")}
            {isInCall && fmtDuration(durationSec)}
          </p>
        </div>
      )}

      {/* Overlay name+timer + indicateur qualité pour appel vidéo en cours */}
      {isVideo && isInCall && (
        <div className="relative z-10 flex flex-col items-center gap-1 text-white text-center pt-4 px-3 py-2 rounded-2xl bg-black/40 backdrop-blur-sm">
          <h2 className="text-base sm:text-lg font-semibold">{meta.peerName}</h2>
          <div className="flex items-center gap-2 text-xs text-white/80">
            <span>{fmtDuration(durationSec)}</span>
            <QualityBadge
              tier={qualityTier}
              dataSaver={dataSaver}
              onClick={() => setShowQualityDetails(v => !v)}
            />
          </div>
        </div>
      )}

      {/* Indicateur qualité discret pour les appels audio */}
      {!isVideo && isInCall && (
        <div className="relative z-10 -mt-4">
          <QualityBadge
            tier={qualityTier}
            dataSaver={dataSaver}
            onClick={() => setShowQualityDetails(v => !v)}
          />
        </div>
      )}

      {/* Panneau détaillé qualité — affiché au tap sur le badge */}
      {isInCall && showQualityDetails && (
        <QualityDetailsPanel
          tier={qualityTier}
          reason={qualityReason}
          dataSaver={dataSaver}
          onToggleDataSaver={setDataSaver}
          onClose={() => setShowQualityDetails(false)}
        />
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
      <div className="relative z-10 flex items-center gap-3 sm:gap-6 pb-4 sm:pb-8">
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
                  "w-12 h-12 sm:w-14 sm:h-14 rounded-full shadow-lg",
                  isMuted ? "bg-white/20 hover:bg-white/30" : "bg-white/10 hover:bg-white/20"
                )}
                aria-label={isMuted ? "Activer le micro" : "Couper le micro"}
              >
                {isMuted ? <MicOff className="w-5 h-5 sm:w-6 sm:h-6 text-white" /> : <Mic className="w-5 h-5 sm:w-6 sm:h-6 text-white" />}
              </Button>
            )}
            {isInCall && (
              <Button
                onClick={() => setIsSpeaker(!isSpeaker)}
                className={cn(
                  "w-12 h-12 sm:w-14 sm:h-14 rounded-full shadow-lg",
                  isSpeaker ? "bg-emerald-500/80 hover:bg-emerald-500" : "bg-white/10 hover:bg-white/20"
                )}
                aria-label={isSpeaker ? "Désactiver le haut-parleur" : "Activer le haut-parleur"}
              >
                <Volume2 className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </Button>
            )
            {isInCall && isVideo && (
              <Button
                onClick={toggleCamera}
                className={cn(
                  "w-12 h-12 sm:w-14 sm:h-14 rounded-full shadow-lg",
                  isCameraOff ? "bg-white/20 hover:bg-white/30" : "bg-white/10 hover:bg-white/20"
                )}
                aria-label={isCameraOff ? "Activer la caméra" : "Couper la caméra"}
              >
                {isCameraOff ? <VideoOff className="w-5 h-5 sm:w-6 sm:h-6 text-white" /> : <Video className="w-5 h-5 sm:w-6 sm:h-6 text-white" />}
              </Button>
            )}
            {isInCall && (
              <Button
                onClick={() => setDataSaver(!dataSaver)}
                className={cn(
                  "w-12 h-12 sm:w-14 sm:h-14 rounded-full shadow-lg",
                  dataSaver
                    ? "bg-amber-500/80 hover:bg-amber-500"
                    : "bg-white/10 hover:bg-white/20"
                )}
                aria-label={dataSaver ? "Désactiver l'économie de données" : "Activer l'économie de données"}
                title={dataSaver ? "Économie de données activée" : "Activer l'économie de données"}
              >
                {dataSaver
                  ? <WifiOff className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                  : <Wifi className="w-5 h-5 sm:w-6 sm:h-6 text-white" />}
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
// Quality badge — bouton tappable qui ouvre le panneau de détails
// ─────────────────────────────────────────────────────────────────────────────
const TIER_LABELS: Record<QualityTier, { label: string; dotClass: string; full: string }> = {
  high: { label: "HD", dotClass: "bg-emerald-400", full: "Haute définition" },
  medium: { label: "SD", dotClass: "bg-yellow-400", full: "Définition standard" },
  low: { label: "Faible", dotClass: "bg-orange-400", full: "Qualité réduite" },
  "audio-only": { label: "Audio seul", dotClass: "bg-red-400", full: "Vidéo coupée — audio seul" },
};

function QualityBadge({
  tier,
  dataSaver,
  onClick,
}: {
  tier: QualityTier;
  dataSaver: boolean;
  onClick: () => void;
}) {
  const { label, dotClass } = TIER_LABELS[tier];
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-white/15 hover:bg-white/25 active:bg-white/30 text-white text-[10px] font-medium uppercase tracking-wider transition-colors touch-manipulation"
      aria-label={`Qualité réseau : ${label}. Toucher pour les détails.`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${dotClass} animate-pulse`} />
      {label}
      {dataSaver && (
        <span className="ml-1 px-1 rounded bg-amber-400/90 text-amber-950 text-[9px]">ÉCO</span>
      )}
    </button>
  );
}

function QualityDetailsPanel({
  tier,
  reason,
  dataSaver,
  onToggleDataSaver,
  onClose,
}: {
  tier: QualityTier;
  reason: string;
  dataSaver: boolean;
  onToggleDataSaver: (enabled: boolean) => void;
  onClose: () => void;
}) {
  const { label, full, dotClass } = TIER_LABELS[tier];
  return (
    <div
      role="dialog"
      aria-label="Détails de qualité d'appel"
      className="absolute z-30 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(92vw,360px)] rounded-2xl bg-slate-900/95 backdrop-blur border border-white/15 shadow-2xl text-white p-4 animate-scale-in"
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <Gauge className="w-5 h-5 text-emerald-400" />
          <h3 className="font-semibold text-sm">Qualité de l'appel</h3>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Fermer"
          className="text-white/60 hover:text-white text-lg leading-none px-1"
        >
          ×
        </button>
      </div>

      <div className="flex items-center gap-2 mb-2">
        <span className={`w-2 h-2 rounded-full ${dotClass} animate-pulse`} />
        <span className="text-base font-bold">{label}</span>
        <span className="text-xs text-white/60">— {full}</span>
      </div>

      <p className="text-xs text-white/70 mb-4 leading-relaxed">
        <span className="font-semibold text-white/90">Raison : </span>
        {reason || "Connexion stable."}
      </p>

      <div className="text-[10px] uppercase tracking-wider text-white/50 mb-2">
        Indicateurs surveillés
      </div>
      <ul className="text-xs text-white/75 space-y-1 mb-4 leading-relaxed">
        <li>• Pertes de paquets vidéo</li>
        <li>• Latence aller-retour (RTT)</li>
        <li>• Bande-passante disponible</li>
        <li>• Type de réseau (4G/3G/Wi-Fi)</li>
      </ul>

      <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-white/5 border border-white/10">
        <div className="min-w-0">
          <div className="text-sm font-semibold flex items-center gap-1.5">
            {dataSaver ? <WifiOff className="w-4 h-4 text-amber-300" /> : <Wifi className="w-4 h-4" />}
            Économie de données
          </div>
          <p className="text-[11px] text-white/60 mt-0.5">
            Plafonne la qualité à basse résolution / audio seul.
          </p>
        </div>
        <Switch
          checked={dataSaver}
          onCheckedChange={onToggleDataSaver}
          aria-label="Activer ou désactiver l'économie de données"
        />
      </div>
    </div>
  );
}
