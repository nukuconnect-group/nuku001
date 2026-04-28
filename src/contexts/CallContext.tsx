import { createContext, useContext, useEffect, useRef, useState, useCallback, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/contexts/ProfileContext";
import { toast } from "@/hooks/use-toast";

/**
 * Call signaling via Supabase Realtime broadcast.
 * Each user listens on channel `call:<userId>`.
 * Messages: { type: 'offer'|'answer'|'ice'|'hangup'|'decline'|'ringing', from, to, payload, callId, conversationId, callerName, callerAvatar }
 */

type CallStatus = "idle" | "outgoing" | "incoming" | "in-call";

export interface CallMeta {
  callId: string;
  conversationId: string;
  peerUserId: string;
  peerName: string;
  peerAvatar: string;
  isCaller: boolean;
}

interface CallContextValue {
  status: CallStatus;
  meta: CallMeta | null;
  remoteStream: MediaStream | null;
  isMuted: boolean;
  durationSec: number;
  startCall: (params: { conversationId: string; peerUserId: string; peerName: string; peerAvatar: string }) => Promise<void>;
  acceptCall: () => Promise<void>;
  declineCall: () => Promise<void>;
  hangup: () => Promise<void>;
  toggleMute: () => void;
}

const CallContext = createContext<CallContextValue | null>(null);

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

/**
 * Insert a system call log message in the conversation thread (style WhatsApp).
 * Format tag: [call:STATUS:DURATION] where STATUS = missed|ended|declined|outgoing-missed
 */
async function logCallMessage(
  conversationId: string,
  senderProfileId: string,
  status: "missed" | "ended" | "declined" | "outgoing-missed",
  durationSec: number = 0
) {
  try {
    const labels: Record<string, string> = {
      missed: "📞 Appel manqué",
      "outgoing-missed": "📞 Appel sans réponse",
      declined: "📞 Appel refusé",
      ended: `📞 Appel · ${Math.floor(durationSec / 60)}:${String(durationSec % 60).padStart(2, "0")}`,
    };
    await supabase.from("messages").insert({
      conversation_id: conversationId,
      sender_id: senderProfileId,
      content: `${labels[status]}\n[call:${status}:${durationSec}]`,
    });
  } catch (e) {
    console.warn("logCallMessage failed", e);
  }
}

export function CallProvider({ children }: { children: ReactNode }) {
  const { user, profile } = useProfile();
  const [status, setStatus] = useState<CallStatus>("idle");
  const [meta, setMeta] = useState<CallMeta | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [durationSec, setDurationSec] = useState(0);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const channelRef = useRef<any>(null);
  const peerChannelRef = useRef<any>(null); // outgoing channel to peer
  const pendingIceRef = useRef<RTCIceCandidateInit[]>([]);
  const pendingOfferRef = useRef<RTCSessionDescriptionInit | null>(null);
  const ringtoneRef = useRef<{ ctx: AudioContext; stop: () => void } | null>(null);
  const ringTimeoutRef = useRef<number | null>(null);
  const titleFlashRef = useRef<number | null>(null);
  const originalTitleRef = useRef<string>("");
  const browserNotifRef = useRef<Notification | null>(null);
  const vibrationIntervalRef = useRef<number | null>(null);
  const timerRef = useRef<number | null>(null);
  const callStartRef = useRef<number>(0);
  // Refs to avoid stale closures inside setTimeout / signal handlers
  const metaRef = useRef<CallMeta | null>(null);
  const statusRef = useRef<CallStatus>("idle");
  useEffect(() => { metaRef.current = meta; }, [meta]);
  useEffect(() => { statusRef.current = status; }, [status]);

  // ----- helpers -----
  /**
   * Sonnerie type "téléphone qui sonne" (style WhatsApp) :
   * 2 tons rapides (ring-ring) puis 1.5s de silence, en boucle, jusqu'à stopRingtone.
   * Joue même si l'app est en arrière-plan (tant que l'onglet est vivant).
   */
  const playRingtone = useCallback((mode: "incoming" | "outgoing" = "incoming") => {
    try {
      // Audio
      const AudioCtx = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx: AudioContext = new AudioCtx();
      // Resume si suspendu (autoplay policy)
      ctx.resume?.().catch(() => {});

      let cancelled = false;
      const playPattern = () => {
        if (cancelled) return;
        const now = ctx.currentTime;
        // Deux "rings" successifs (440Hz pour entrant, 480Hz/620Hz alterné pour sortant)
        const freqs = mode === "incoming" ? [880, 880] : [480, 620];
        const ringDuration = 0.4;
        const gap = 0.15;
        freqs.forEach((f, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.frequency.value = f;
          osc.type = "sine";
          const start = now + i * (ringDuration + gap);
          gain.gain.setValueAtTime(0, start);
          gain.gain.linearRampToValueAtTime(0.35, start + 0.02);
          gain.gain.setValueAtTime(0.35, start + ringDuration - 0.05);
          gain.gain.linearRampToValueAtTime(0, start + ringDuration);
          osc.connect(gain).connect(ctx.destination);
          osc.start(start);
          osc.stop(start + ringDuration + 0.02);
        });
        // Replay toute les ~2s (rythme téléphone)
        if (!cancelled) {
          window.setTimeout(playPattern, 2000);
        }
      };
      playPattern();

      ringtoneRef.current = {
        ctx,
        stop: () => {
          cancelled = true;
          try { ctx.close(); } catch {}
        },
      };

      // Vibration mobile en pattern téléphone (appel entrant uniquement)
      if (mode === "incoming" && typeof navigator !== "undefined" && "vibrate" in navigator) {
        const pattern = [600, 400, 600, 1500];
        navigator.vibrate?.(pattern);
        vibrationIntervalRef.current = window.setInterval(() => {
          navigator.vibrate?.(pattern);
        }, 3100);
      }
    } catch (e) {
      console.warn("ringtone error", e);
    }
  }, []);

  const stopRingtone = useCallback(() => {
    try {
      ringtoneRef.current?.stop();
    } catch {}
    ringtoneRef.current = null;
    if (vibrationIntervalRef.current) {
      clearInterval(vibrationIntervalRef.current);
      vibrationIntervalRef.current = null;
      try { navigator.vibrate?.(0); } catch {}
    }
  }, []);

  /**
   * Titre clignotant + notification système pour avertir même si l'onglet
   * n'est pas actif (style notification d'appel WhatsApp Web).
   */
  const startIncomingAlerts = useCallback((callerName: string) => {
    if (typeof document === "undefined") return;
    originalTitleRef.current = document.title;
    let on = false;
    titleFlashRef.current = window.setInterval(() => {
      on = !on;
      document.title = on ? `📞 Appel entrant — ${callerName}` : originalTitleRef.current;
    }, 1000);

    // Notification navigateur (visible même si app en arrière-plan)
    try {
      if ("Notification" in window) {
        const show = () => {
          try {
            const n = new Notification(`📞 Appel entrant`, {
              body: `${callerName} vous appelle sur NukuConnect`,
              tag: "nuku-call-incoming",
              requireInteraction: true,
              silent: false,
            });
            n.onclick = () => { window.focus(); n.close(); };
            browserNotifRef.current = n;
          } catch {}
        };
        if (Notification.permission === "granted") show();
        else if (Notification.permission !== "denied") {
          Notification.requestPermission().then((p) => { if (p === "granted") show(); });
        }
      }
    } catch {}
  }, []);

  const stopIncomingAlerts = useCallback(() => {
    if (titleFlashRef.current) {
      clearInterval(titleFlashRef.current);
      titleFlashRef.current = null;
    }
    if (originalTitleRef.current && typeof document !== "undefined") {
      document.title = originalTitleRef.current;
    }
    try { browserNotifRef.current?.close(); } catch {}
    browserNotifRef.current = null;
  }, []);

  const cleanupCall = useCallback(() => {
    stopRingtone();
    stopIncomingAlerts();
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (ringTimeoutRef.current) { clearTimeout(ringTimeoutRef.current); ringTimeoutRef.current = null; }
    try { pcRef.current?.close(); } catch {}
    pcRef.current = null;
    try { localStreamRef.current?.getTracks().forEach(t => t.stop()); } catch {}
    localStreamRef.current = null;
    setRemoteStream(null);
    setIsMuted(false);
    setDurationSec(0);
    pendingIceRef.current = [];
    pendingOfferRef.current = null;
    if (peerChannelRef.current) {
      try { supabase.removeChannel(peerChannelRef.current); } catch {}
      peerChannelRef.current = null;
    }
  }, [stopRingtone, stopIncomingAlerts]);

  const sendSignal = useCallback(async (toUserId: string, payload: any) => {
    // Use a dedicated outgoing channel to broadcast to peer's `call:<peerUid>`
    const ch = supabase.channel(`call:${toUserId}`, { config: { broadcast: { self: false } } });
    await new Promise<void>((resolve) => {
      ch.subscribe((s) => { if (s === "SUBSCRIBED") resolve(); });
      setTimeout(resolve, 800); // safety
    });
    await ch.send({ type: "broadcast", event: "signal", payload });
    // Don't keep channel open; remove after a tick
    setTimeout(() => { try { supabase.removeChannel(ch); } catch {} }, 500);
  }, []);

  const buildPeerConnection = useCallback((peerUserId: string, callId: string) => {
    const pc = new RTCPeerConnection(ICE_SERVERS);
    pc.onicecandidate = (e) => {
      if (e.candidate) {
        sendSignal(peerUserId, {
          type: "ice",
          callId,
          from: user?.id,
          candidate: e.candidate.toJSON(),
        });
      }
    };
    pc.ontrack = (e) => {
      const stream = e.streams[0] || new MediaStream([e.track]);
      setRemoteStream(stream);
    };
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "failed" || pc.connectionState === "disconnected") {
        // Peer dropped
        finalizeCall("ended");
      }
    };
    return pc;
  }, [user?.id, sendSignal]);

  const startTimer = useCallback(() => {
    callStartRef.current = Date.now();
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = window.setInterval(() => {
      setDurationSec(Math.floor((Date.now() - callStartRef.current) / 1000));
    }, 1000);
  }, []);

  const finalizeCall = useCallback((reason: "missed" | "ended" | "declined" | "outgoing-missed") => {
    const m = metaRef.current;
    const dur = Math.floor((Date.now() - callStartRef.current) / 1000);
    if (m && profile?.id) {
      // Both sides log into their own thread so each user sees the call entry.
      const realDur = reason === "ended" ? dur : 0;
      logCallMessage(m.conversationId, profile.id, reason, realDur);
    }
    cleanupCall();
    setStatus("idle");
    setMeta(null);
  }, [profile?.id, cleanupCall]);

  // ----- incoming signal handler -----
  const handleSignal = useCallback(async (payload: any) => {
    if (!user?.id || payload?.from === user.id) return;

    if (payload.type === "offer") {
      // Incoming call
      if (statusRef.current !== "idle") {
        // Busy — auto-decline
        await sendSignal(payload.from, { type: "decline", callId: payload.callId, from: user.id });
        return;
      }
      pendingOfferRef.current = payload.offer;
      setMeta({
        callId: payload.callId,
        conversationId: payload.conversationId,
        peerUserId: payload.from,
        peerName: payload.callerName || "Appelant",
        peerAvatar: payload.callerAvatar || "",
        isCaller: false,
      });
      setStatus("incoming");
      playRingtone("incoming");
      startIncomingAlerts(payload.callerName || "Appelant");
      // Auto-missed after 30s — receiver logs "missed" in their own thread,
      // caller will log "outgoing-missed" on its side via the hangup signal.
      ringTimeoutRef.current = window.setTimeout(() => {
        sendSignal(payload.from, { type: "hangup", callId: payload.callId, from: user.id, reason: "missed" });
        if (profile?.id) {
          logCallMessage(payload.conversationId, profile.id, "missed", 0);
        }
        cleanupCall();
        setStatus("idle");
        setMeta(null);
        toast({ title: "Appel manqué", description: payload.callerName });
      }, 30000);
    } else if (payload.type === "answer") {
      try {
        await pcRef.current?.setRemoteDescription(new RTCSessionDescription(payload.answer));
        // Flush ICE
        for (const c of pendingIceRef.current) {
          try { await pcRef.current?.addIceCandidate(c); } catch {}
        }
        pendingIceRef.current = [];
        stopRingtone();
        if (ringTimeoutRef.current) { clearTimeout(ringTimeoutRef.current); ringTimeoutRef.current = null; }
        setStatus("in-call");
        startTimer();
      } catch (e) {
        console.error("answer error", e);
      }
    } else if (payload.type === "ice") {
      const cand = payload.candidate;
      if (pcRef.current?.remoteDescription) {
        try { await pcRef.current.addIceCandidate(cand); } catch {}
      } else {
        pendingIceRef.current.push(cand);
      }
    } else if (payload.type === "hangup") {
      const reason = payload.reason === "missed" ? "outgoing-missed" : "ended";
      finalizeCall(reason as any);
    } else if (payload.type === "decline") {
      finalizeCall("declined");
    }
  }, [
    user?.id,
    profile?.id,
    sendSignal,
    playRingtone,
    stopRingtone,
    startTimer,
    cleanupCall,
    finalizeCall,
    startIncomingAlerts,
  ]);

  // Subscribe to my call channel
  useEffect(() => {
    if (!user?.id) return;
    const ch = supabase
      .channel(`call:${user.id}`, { config: { broadcast: { self: false } } })
      .on("broadcast", { event: "signal" }, ({ payload }) => handleSignal(payload))
      .subscribe();
    channelRef.current = ch;
    return () => {
      try { supabase.removeChannel(ch); } catch {}
      channelRef.current = null;
    };
  }, [user?.id, handleSignal]);

  // ----- public actions -----
  const startCall = useCallback(async ({ conversationId, peerUserId, peerName, peerAvatar }: {
    conversationId: string; peerUserId: string; peerName: string; peerAvatar: string;
  }) => {
    if (!user?.id || !profile?.id) {
      toast({ title: "Connexion requise", description: "Connectez-vous pour appeler.", variant: "destructive" });
      return;
    }
    if (!peerUserId) {
      toast({ title: "Impossible d'appeler", description: "Utilisateur introuvable.", variant: "destructive" });
      return;
    }
    if (status !== "idle") return;

    const callId = crypto.randomUUID();
    const m: CallMeta = { callId, conversationId, peerUserId, peerName, peerAvatar, isCaller: true };
    setMeta(m);
    setStatus("outgoing");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      localStreamRef.current = stream;
      const pc = buildPeerConnection(peerUserId, callId);
      pcRef.current = pc;
      stream.getTracks().forEach(t => pc.addTrack(t, stream));
      const offer = await pc.createOffer({ offerToReceiveAudio: true });
      await pc.setLocalDescription(offer);

      await sendSignal(peerUserId, {
        type: "offer",
        callId,
        conversationId,
        from: user.id,
        callerName: profile.full_name || "Appelant",
        callerAvatar: profile.avatar_url || "",
        offer,
      });

      playRingtone("outgoing");
      // Auto-cancel if no answer in 35s
      ringTimeoutRef.current = window.setTimeout(() => {
        sendSignal(peerUserId, { type: "hangup", callId, from: user.id, reason: "missed" });
        finalizeCall("outgoing-missed");
        toast({ title: "Sans réponse", description: peerName });
      }, 35000);
    } catch (e: any) {
      console.error("startCall error", e);
      toast({ title: "Erreur micro", description: e?.message || "Accès au micro refusé.", variant: "destructive" });
      cleanupCall();
      setStatus("idle");
      setMeta(null);
    }
  }, [user?.id, profile, status, buildPeerConnection, sendSignal, playRingtone, cleanupCall, finalizeCall]);

  const acceptCall = useCallback(async () => {
    if (status !== "incoming" || !meta || !pendingOfferRef.current || !user?.id) return;
    stopRingtone();
    if (ringTimeoutRef.current) { clearTimeout(ringTimeoutRef.current); ringTimeoutRef.current = null; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      localStreamRef.current = stream;
      const pc = buildPeerConnection(meta.peerUserId, meta.callId);
      pcRef.current = pc;
      stream.getTracks().forEach(t => pc.addTrack(t, stream));
      await pc.setRemoteDescription(new RTCSessionDescription(pendingOfferRef.current));
      // Flush queued ICE
      for (const c of pendingIceRef.current) {
        try { await pc.addIceCandidate(c); } catch {}
      }
      pendingIceRef.current = [];
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      await sendSignal(meta.peerUserId, {
        type: "answer", callId: meta.callId, from: user.id, answer,
      });
      setStatus("in-call");
      startTimer();
    } catch (e: any) {
      console.error("acceptCall error", e);
      toast({ title: "Erreur micro", description: e?.message || "Accès au micro refusé.", variant: "destructive" });
      await declineCall();
    }
  }, [status, meta, user?.id, buildPeerConnection, sendSignal, stopRingtone, startTimer]);

  const declineCall = useCallback(async () => {
    if (!meta || !user?.id) { cleanupCall(); setStatus("idle"); setMeta(null); return; }
    await sendSignal(meta.peerUserId, { type: "decline", callId: meta.callId, from: user.id });
    // Receiver doesn't log — caller logs "declined" when they receive the decline signal
    cleanupCall();
    setStatus("idle");
    setMeta(null);
  }, [meta, user?.id, sendSignal, cleanupCall]);

  const hangup = useCallback(async () => {
    if (!meta || !user?.id) { cleanupCall(); setStatus("idle"); setMeta(null); return; }
    await sendSignal(meta.peerUserId, { type: "hangup", callId: meta.callId, from: user.id });
    finalizeCall(status === "in-call" ? "ended" : "outgoing-missed");
  }, [meta, user?.id, status, sendSignal, finalizeCall, cleanupCall]);

  const toggleMute = useCallback(() => {
    const tracks = localStreamRef.current?.getAudioTracks() || [];
    const next = !isMuted;
    tracks.forEach(t => { t.enabled = !next; });
    setIsMuted(next);
  }, [isMuted]);

  const value: CallContextValue = {
    status, meta, remoteStream, isMuted, durationSec,
    startCall, acceptCall, declineCall, hangup, toggleMute,
  };

  return <CallContext.Provider value={value}>{children}</CallContext.Provider>;
}

export function useCall() {
  const ctx = useContext(CallContext);
  if (!ctx) throw new Error("useCall must be used within CallProvider");
  return ctx;
}
