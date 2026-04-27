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
  const ringtoneRef = useRef<HTMLAudioElement | null>(null);
  const ringTimeoutRef = useRef<number | null>(null);
  const timerRef = useRef<number | null>(null);
  const callStartRef = useRef<number>(0);
  // Refs to avoid stale closures inside setTimeout / signal handlers
  const metaRef = useRef<CallMeta | null>(null);
  const statusRef = useRef<CallStatus>("idle");
  useEffect(() => { metaRef.current = meta; }, [meta]);
  useEffect(() => { statusRef.current = status; }, [status]);

  // ----- helpers -----
  const playRingtone = useCallback(() => {
    try {
      if (!ringtoneRef.current) {
        // Simple beep loop using oscillator-encoded data URI is overkill.
        // Use a public free ringtone via WebAudio: generate a short beep loop.
        const ctx = new AudioContext();
        const buffer = ctx.createBuffer(1, ctx.sampleRate * 1, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < data.length; i++) {
          // Two quick beeps then silence
          const t = i / ctx.sampleRate;
          if ((t > 0 && t < 0.25) || (t > 0.35 && t < 0.6)) {
            data[i] = Math.sin(2 * Math.PI * 800 * t) * 0.25;
          }
        }
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.loop = true;
        source.connect(ctx.destination);
        source.start();
        ringtoneRef.current = { ctx, source } as any;
      }
    } catch (e) {
      console.warn("ringtone error", e);
    }
  }, []);

  const stopRingtone = useCallback(() => {
    try {
      const r: any = ringtoneRef.current;
      if (r?.source) {
        r.source.stop();
        r.ctx?.close?.();
      }
    } catch {}
    ringtoneRef.current = null;
  }, []);

  const cleanupCall = useCallback(() => {
    stopRingtone();
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
  }, [stopRingtone]);

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
      playRingtone();
      // Auto-missed after 30s
      ringTimeoutRef.current = window.setTimeout(() => {
        // Other side will log "missed" because we are the receiver — but caller is the one inserting
        // Send hangup to caller so they log outgoing-missed
        sendSignal(payload.from, { type: "hangup", callId: payload.callId, from: user.id, reason: "missed" });
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
  }, [user?.id, status, sendSignal, playRingtone, stopRingtone, startTimer, cleanupCall, finalizeCall]);

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

      playRingtone();
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
