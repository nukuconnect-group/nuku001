/**
 * Adaptive call quality controller.
 *
 * Surveille périodiquement getStats() d'une RTCPeerConnection et ajuste la
 * résolution / bitrate / framerate de la piste vidéo sortante selon :
 *  - le packet-loss (perte de paquets sortants)
 *  - le RTT (latence aller-retour)
 *  - la bande-passante disponible signalée par le navigateur
 *  - les changements d'état réseau (`navigator.connection`)
 *
 * Conçu pour rester très conservateur : on baisse vite si ça se dégrade,
 * on remonte lentement quand la connexion redevient stable.
 */

export type QualityTier = "high" | "medium" | "low" | "audio-only";

interface TierProfile {
  maxBitrateBps: number;
  maxFramerate: number;
  scaleResolutionDownBy: number; // 1 = full res, 2 = half, 4 = quarter
}

const TIER_PROFILES: Record<QualityTier, TierProfile> = {
  high: { maxBitrateBps: 1_200_000, maxFramerate: 30, scaleResolutionDownBy: 1 },
  medium: { maxBitrateBps: 600_000, maxFramerate: 24, scaleResolutionDownBy: 1.5 },
  low: { maxBitrateBps: 250_000, maxFramerate: 15, scaleResolutionDownBy: 2 },
  // "audio-only" : on coupe simplement l'envoi vidéo via l'enabled=false
  "audio-only": { maxBitrateBps: 80_000, maxFramerate: 1, scaleResolutionDownBy: 4 },
};

interface ControllerOptions {
  pc: RTCPeerConnection;
  /** Callback informatif (UI) à chaque changement de palier — reçoit le palier + raison technique. */
  onTierChange?: (tier: QualityTier, reason: string) => void;
  /** Stream local pour pouvoir activer/désactiver la piste vidéo en mode audio-only */
  localStream: MediaStream;
  /** Si true au démarrage, force le mode économie de données (palier max = low). */
  initialDataSaver?: boolean;
}

export class AdaptiveCallQualityController {
  private pc: RTCPeerConnection;
  private localStream: MediaStream;
  private onTierChange?: (tier: QualityTier, reason: string) => void;
  private currentTier: QualityTier = "high";
  private currentReason = "init";
  private intervalId: number | null = null;
  private prevPacketsLost = 0;
  private prevPacketsSent = 0;
  private stableTicks = 0;
  private destroyed = false;
  private connectionListener: (() => void) | null = null;
  private dataSaver = false;

  constructor(opts: ControllerOptions) {
    this.pc = opts.pc;
    this.localStream = opts.localStream;
    this.onTierChange = opts.onTierChange;
    this.dataSaver = !!opts.initialDataSaver;
  }

  /** Démarre la boucle d'adaptation. */
  start(): void {
    if (this.intervalId !== null || this.destroyed) return;

    // 1) Initialise selon le type de réseau (si dispo)
    this.applyInitialTierFromConnection();

    // 2) Écoute les changements (4G→3G, etc.)
    const conn = (navigator as Navigator & { connection?: { addEventListener?: (e: string, cb: () => void) => void; removeEventListener?: (e: string, cb: () => void) => void } }).connection;
    if (conn?.addEventListener) {
      this.connectionListener = () => this.applyInitialTierFromConnection();
      conn.addEventListener("change", this.connectionListener);
    }

    // 3) Boucle principale : sonde stats toutes les 3s
    this.intervalId = window.setInterval(() => {
      void this.tick();
    }, 3000);
  }

  stop(): void {
    this.destroyed = true;
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    const conn = (navigator as Navigator & { connection?: { removeEventListener?: (e: string, cb: () => void) => void } }).connection;
    if (this.connectionListener && conn?.removeEventListener) {
      conn.removeEventListener("change", this.connectionListener);
    }
    this.connectionListener = null;
  }

  /** Renvoie le palier actuel (utile pour affichage debug). */
  getTier(): QualityTier {
    return this.currentTier;
  }

  /** Renvoie la dernière raison de changement (lisible humain). */
  getReason(): string {
    return this.currentReason;
  }

  /** Active/désactive le mode économie de données. Plafonne la qualité à `low`. */
  setDataSaver(enabled: boolean): void {
    if (this.dataSaver === enabled) return;
    this.dataSaver = enabled;
    if (enabled) {
      // On bascule immédiatement à low (ou audio-only si déjà sous low)
      const next: QualityTier = this.currentTier === "audio-only" ? "audio-only" : "low";
      void this.setTier(next, "économie de données activée");
    } else {
      // On laisse la boucle remonter selon les conditions réelles
      this.stableTicks = 0;
    }
  }

  isDataSaver(): boolean {
    return this.dataSaver;
  }

  // ---------------------------------------------------------------- internals

  private applyInitialTierFromConnection(): void {
    const conn = (navigator as Navigator & { connection?: { effectiveType?: string; saveData?: boolean; downlink?: number } }).connection;
    if (!conn) return;
    const eff = conn.effectiveType || "";
    const save = !!conn.saveData;
    const downlinkMbps = typeof conn.downlink === "number" ? conn.downlink : null;

    let target: QualityTier = "high";
    if (save || eff === "slow-2g" || eff === "2g") {
      target = "audio-only";
    } else if (eff === "3g" || (downlinkMbps !== null && downlinkMbps < 0.6)) {
      target = "low";
    } else if (eff === "4g" && downlinkMbps !== null && downlinkMbps < 1.5) {
      target = "medium";
    }
    if (target !== this.currentTier) {
      void this.setTier(target, `réseau détecté : ${eff || "inconnu"}${save ? " (économiseur)" : ""}`);
    }
  }

  private async tick(): Promise<void> {
    if (this.destroyed) return;
    try {
      const stats = await this.pc.getStats();
      let packetsLost = 0;
      let packetsSent = 0;
      let rttMs: number | null = null;
      let availBwBps: number | null = null;

      stats.forEach((report: { type: string; kind?: string; mediaType?: string; packetsLost?: number; packetsSent?: number; roundTripTime?: number; currentRoundTripTime?: number; availableOutgoingBitrate?: number }) => {
        if (report.type === "outbound-rtp" && (report.kind === "video" || report.mediaType === "video")) {
          if (typeof report.packetsSent === "number") packetsSent += report.packetsSent;
        }
        if (report.type === "remote-inbound-rtp" && (report.kind === "video" || report.mediaType === "video")) {
          if (typeof report.packetsLost === "number") packetsLost += report.packetsLost;
          if (typeof report.roundTripTime === "number") rttMs = Math.max(rttMs ?? 0, report.roundTripTime * 1000);
        }
        if (report.type === "candidate-pair" && typeof report.currentRoundTripTime === "number") {
          rttMs = Math.max(rttMs ?? 0, report.currentRoundTripTime * 1000);
          if (typeof report.availableOutgoingBitrate === "number") {
            availBwBps = report.availableOutgoingBitrate;
          }
        }
      });

      const deltaSent = Math.max(1, packetsSent - this.prevPacketsSent);
      const deltaLost = Math.max(0, packetsLost - this.prevPacketsLost);
      const lossRatio = deltaLost / (deltaSent + deltaLost);
      this.prevPacketsSent = packetsSent;
      this.prevPacketsLost = packetsLost;

      // Décision : on baisse vite, on remonte lentement
      let next: QualityTier = this.currentTier;
      let reason = "";

      if (lossRatio > 0.15 || (rttMs !== null && rttMs > 600)) {
        next = "audio-only";
        reason = `perte ${Math.round(lossRatio * 100)}% / RTT ${Math.round(rttMs ?? 0)}ms`;
      } else if (lossRatio > 0.07 || (rttMs !== null && rttMs > 400) || (availBwBps !== null && availBwBps < 250_000)) {
        next = "low";
        reason = `perte ${Math.round(lossRatio * 100)}% / BW ${availBwBps ? Math.round(availBwBps / 1000) + "kbps" : "?"}`;
      } else if (lossRatio > 0.03 || (rttMs !== null && rttMs > 250) || (availBwBps !== null && availBwBps < 700_000)) {
        next = "medium";
        reason = `perte ${Math.round(lossRatio * 100)}%`;
      } else {
        // Conditions bonnes : compteur de stabilité avant remontée
        this.stableTicks += 1;
        if (this.stableTicks >= 3) {
          // Remonte d'un cran à la fois
          if (this.currentTier === "audio-only") next = "low";
          else if (this.currentTier === "low") next = "medium";
          else if (this.currentTier === "medium") next = "high";
          if (next !== this.currentTier) reason = "connexion stable";
        }
      }

      if (next !== this.currentTier) {
        this.stableTicks = 0;
        await this.setTier(next, reason);
      }
    } catch (e) {
      console.warn("[adaptive-quality] tick failed", e);
    }
  }

  private async setTier(tier: QualityTier, reason: string): Promise<void> {
    if (this.destroyed) return;
    // Plafond en mode économie de données : pas de high/medium
    let effectiveTier = tier;
    if (this.dataSaver && (tier === "high" || tier === "medium")) {
      effectiveTier = "low";
      reason = `${reason} · économie de données`;
    }
    const profile = TIER_PROFILES[effectiveTier];
    const prev = this.currentTier;
    this.currentTier = effectiveTier;
    this.currentReason = reason;

    try {
      // 1) Ajuste la piste vidéo sortante via le sender
      const senders = this.pc.getSenders().filter(s => s.track?.kind === "video");
      for (const sender of senders) {
        const params = sender.getParameters();
        if (!params.encodings || params.encodings.length === 0) {
          params.encodings = [{}];
        }
        for (const enc of params.encodings) {
          enc.maxBitrate = profile.maxBitrateBps;
          enc.maxFramerate = profile.maxFramerate;
          enc.scaleResolutionDownBy = profile.scaleResolutionDownBy;
        }
        try {
          await sender.setParameters(params);
        } catch (err) {
          console.warn("[adaptive-quality] setParameters failed", err);
        }
      }

      // 2) Mode audio-only : on coupe l'envoi vidéo (sans détruire la track)
      const videoTracks = this.localStream.getVideoTracks();
      if (tier === "audio-only") {
        videoTracks.forEach(t => { t.enabled = false; });
      } else if (prev === "audio-only") {
        videoTracks.forEach(t => { t.enabled = true; });
      }

      this.onTierChange?.(tier, reason);
    } catch (e) {
      console.warn("[adaptive-quality] setTier failed", e);
    }
  }
}
