import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, Send, Loader2, Truck, User, Check, CheckCheck, X, Phone, PhoneOff, Minimize2 } from "lucide-react";

interface DeliveryChatProps {
  deliveryId: string;
  currentUserRole: "buyer" | "driver";
  otherPartyName?: string;
  trigger?: React.ReactNode;
}

interface Message {
  id: string;
  delivery_id: string;
  sender_id: string;
  sender_role: string;
  content: string;
  is_read: boolean;
  created_at: string;
}

const DeliveryChat = ({ deliveryId, currentUserRole, otherPartyName, trigger }: DeliveryChatProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [inCall, setInCall] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [callStatus, setCallStatus] = useState<"idle" | "requesting_mic" | "mic_denied" | "connecting" | "connected" | "failed">("idle");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const callTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const callChannelRef = useRef<any>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserId(session?.user?.id || null);
    });
  }, []);

  const fetchMessages = useCallback(async () => {
    const { data } = await supabase
      .from("delivery_messages")
      .select("*")
      .eq("delivery_id", deliveryId)
      .order("created_at", { ascending: true });
    const msgs = (data || []) as unknown as Message[];
    setMessages(msgs);
    if (userId) {
      setUnreadCount(msgs.filter(m => m.sender_id !== userId && !m.is_read).length);
    }
  }, [deliveryId, userId]);

  useEffect(() => {
    if (!deliveryId) return;
    fetchMessages();
  }, [deliveryId, fetchMessages]);

  // Realtime
  useEffect(() => {
    if (!deliveryId) return;
    const channelName = `delivery-chat-${deliveryId}-${currentUserRole}-${crypto.randomUUID()}`;
    const channel = supabase
      .channel(channelName)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "delivery_messages",
        filter: `delivery_id=eq.${deliveryId}`,
      }, (payload) => {
        const newMsg = payload.new as Message;
        setMessages(prev => [...prev, newMsg]);
        if (newMsg.sender_id !== userId) {
          setUnreadCount(prev => prev + 1);
          try {
            const ctx = new AudioContext();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.frequency.value = 800;
            gain.gain.value = 0.1;
            osc.start();
            osc.stop(ctx.currentTime + 0.15);
          } catch {}
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [deliveryId, currentUserRole, userId]);

  // Mark as read
  useEffect(() => {
    if (!isOpen || isMinimized || !userId || !deliveryId) return;
    const markRead = async () => {
      await supabase
        .from("delivery_messages")
        .update({ is_read: true } as any)
        .eq("delivery_id", deliveryId)
        .neq("sender_id", userId)
        .eq("is_read", false);
      setUnreadCount(0);
    };
    markRead();
  }, [isOpen, isMinimized, userId, deliveryId, messages.length]);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async () => {
    if (!newMessage.trim() || !userId || sending) return;
    setSending(true);
    try {
      await supabase.from("delivery_messages").insert({
        delivery_id: deliveryId,
        sender_id: userId,
        sender_role: currentUserRole,
        content: newMessage.trim(),
      } as any);
      setNewMessage("");
      inputRef.current?.focus();
    } catch (err) {
      console.error("Send message error:", err);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // WebRTC Voice Call via Supabase Realtime signaling
  const startCall = async () => {
    try {
      setCallStatus("requesting_mic");
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setCallStatus("connecting");
      localStreamRef.current = stream;

      const pc = new RTCPeerConnection({
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }, { urls: "stun:stun1.l.google.com:19302" }],
      });
      peerRef.current = pc;

      stream.getTracks().forEach(t => pc.addTrack(t, stream));

      pc.ontrack = (event) => {
        if (remoteAudioRef.current) {
          remoteAudioRef.current.srcObject = event.streams[0];
          remoteAudioRef.current.play().catch(() => {});
        }
      };

      // Signaling channel
      if (callChannelRef.current) {
        supabase.removeChannel(callChannelRef.current);
        callChannelRef.current = null;
      }
      const sigChannel = supabase.channel(`call-${deliveryId}-${currentUserRole}-${crypto.randomUUID()}`, { config: { broadcast: { self: false } } });
      callChannelRef.current = sigChannel;

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          sigChannel.send({ type: "broadcast", event: "ice", payload: { candidate: event.candidate, from: userId } });
        }
      };

      sigChannel.on("broadcast", { event: "ice" }, async ({ payload }: any) => {
        if (payload.from === userId) return;
        try { await pc.addIceCandidate(new RTCIceCandidate(payload.candidate)); } catch {}
      });

      sigChannel.on("broadcast", { event: "answer" }, async ({ payload }: any) => {
        if (payload.from === userId) return;
        try { await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp)); } catch {}
      });

      sigChannel.on("broadcast", { event: "offer" }, async ({ payload }: any) => {
        if (payload.from === userId) return;
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          sigChannel.send({ type: "broadcast", event: "answer", payload: { sdp: answer, from: userId } });
        } catch {}
      });

      sigChannel.on("broadcast", { event: "hangup" }, () => {
        endCall();
      });

      await sigChannel.subscribe();

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      sigChannel.send({ type: "broadcast", event: "offer", payload: { sdp: offer, from: userId } });

      // Send a system message
      await supabase.from("delivery_messages").insert({
        delivery_id: deliveryId,
        sender_id: userId,
        sender_role: currentUserRole,
        content: "📞 Appel vocal démarré...",
      } as any);

      setCallStatus("connected");
      setInCall(true);
      setCallDuration(0);
      callTimerRef.current = setInterval(() => setCallDuration(p => p + 1), 1000);
    } catch (err: any) {
      if (err?.name === "NotAllowedError" || err?.name === "PermissionDeniedError") {
        setCallStatus("mic_denied");
      } else {
        setCallStatus("failed");
      }
      console.error("Call error:", err);
    }
  };

  const endCall = () => {
    if (callChannelRef.current) {
      callChannelRef.current.send({ type: "broadcast", event: "hangup", payload: {} });
      supabase.removeChannel(callChannelRef.current);
      callChannelRef.current = null;
    }
    if (peerRef.current) {
      peerRef.current.close();
      peerRef.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => t.stop());
      localStreamRef.current = null;
    }
    if (callTimerRef.current) {
      clearInterval(callTimerRef.current);
      callTimerRef.current = null;
    }
    setInCall(false);
    setCallDuration(0);
    setCallStatus("idle");
  };

  useEffect(() => {
    return () => { endCall(); };
  }, []);

  const formatCallTime = (s: number) => `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  };

  const RoleIcon = currentUserRole === "buyer" ? Truck : User;

  const quickMessages = currentUserRole === "buyer"
    ? ["Je suis disponible", "Quelle est votre position ?", "Merci !"]
    : ["J'arrive dans 5 min", "Je suis en route", "Livraison effectuée"];

  const toggleOpen = () => {
    if (isOpen) {
      setIsOpen(false);
      setIsMinimized(false);
    } else {
      setIsOpen(true);
      setIsMinimized(false);
    }
  };

  // Compact mini-chat overlay
  if (!isOpen) {
    return (
      <div className="relative inline-block" onClick={toggleOpen}>
        {trigger || (
          <Button variant="outline" size="sm" className="gap-1.5 relative">
            <MessageCircle className="w-4 h-4" />
            <span className="text-xs">Chat</span>
          </Button>
        )}
        {unreadCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-destructive text-white rounded-full text-[9px] flex items-center justify-center font-bold z-10">
            {unreadCount}
          </span>
        )}
      </div>
    );
  }

  // Minimized bubble
  if (isMinimized) {
    return (
      <div
        className="fixed bottom-20 right-3 z-[200] cursor-pointer"
        onClick={() => setIsMinimized(false)}
      >
        <div className="w-14 h-14 rounded-full bg-primary shadow-xl flex items-center justify-center relative">
          <MessageCircle className="w-6 h-6 text-primary-foreground" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-white rounded-full text-[10px] flex items-center justify-center font-bold">
              {unreadCount}
            </span>
          )}
        </div>
      </div>
    );
  }

  // Open mini overlay chat
  return (
    <>
      <audio ref={remoteAudioRef} autoPlay playsInline />
      <div className="fixed bottom-16 right-2 left-2 sm:left-auto sm:w-[360px] z-[200] bg-background rounded-2xl shadow-2xl border border-border flex flex-col overflow-hidden" style={{ maxHeight: "60vh" }}>
        {/* Header */}
        <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-muted/30">
          <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <RoleIcon className="w-3.5 h-3.5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold truncate">{otherPartyName || "Chat"}</p>
            {inCall && (
              <p className="text-[9px] text-emerald-600 font-medium">📞 {formatCallTime(callDuration)}</p>
            )}
            {!inCall && callStatus === "requesting_mic" && (
              <p className="text-[9px] text-amber-600 font-medium animate-pulse">🎤 Demande d'accès au micro...</p>
            )}
            {!inCall && callStatus === "mic_denied" && (
              <p className="text-[9px] text-red-500 font-medium">🚫 Micro refusé — autorisez l'accès</p>
            )}
            {!inCall && callStatus === "connecting" && (
              <p className="text-[9px] text-blue-500 font-medium animate-pulse">🔗 Connexion en cours...</p>
            )}
            {!inCall && callStatus === "failed" && (
              <p className="text-[9px] text-red-500 font-medium">❌ Connexion échouée</p>
            )}
          </div>
          <Badge variant="secondary" className="text-[8px] px-1.5 py-0">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500 mr-0.5" />En ligne
          </Badge>
          {/* Voice call */}
          {inCall ? (
            <Button variant="destructive" size="icon" className="w-7 h-7 rounded-full" onClick={endCall}>
              <PhoneOff className="w-3.5 h-3.5" />
            </Button>
          ) : (
            <Button variant="outline" size="icon" className="w-7 h-7 rounded-full" onClick={startCall}>
              <Phone className="w-3.5 h-3.5 text-emerald-600" />
            </Button>
          )}
          <Button variant="ghost" size="icon" className="w-7 h-7 rounded-full" onClick={() => setIsMinimized(true)}>
            <Minimize2 className="w-3.5 h-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="w-7 h-7 rounded-full" onClick={() => { setIsOpen(false); endCall(); }}>
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-2.5 space-y-1.5" style={{ minHeight: 120, maxHeight: "calc(60vh - 140px)" }}>
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-24 text-center">
              <MessageCircle className="w-8 h-8 text-muted-foreground/30 mb-1" />
              <p className="text-[10px] text-muted-foreground">Envoyez un message</p>
            </div>
          ) : (
            messages.map((msg) => {
              const isMine = msg.sender_id === userId;
              return (
                <div key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[80%] rounded-2xl px-2.5 py-1.5 ${
                    isMine ? "bg-primary text-primary-foreground rounded-br-md" : "bg-muted text-foreground rounded-bl-md"
                  }`}>
                    {!isMine && (
                      <p className="text-[8px] font-semibold mb-0.5 opacity-70">
                        {msg.sender_role === "driver" ? "🚚 Livreur" : "👤 Client"}
                      </p>
                    )}
                    <p className="text-xs leading-relaxed">{msg.content}</p>
                    <div className={`flex items-center gap-0.5 mt-0.5 ${isMine ? "justify-end" : "justify-start"}`}>
                      <span className="text-[8px] opacity-60">{formatTime(msg.created_at)}</span>
                      {isMine && (msg.is_read ? <CheckCheck className="w-2.5 h-2.5 opacity-60" /> : <Check className="w-2.5 h-2.5 opacity-40" />)}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Quick messages */}
        <div className="px-2 py-1 flex gap-1 overflow-x-auto scrollbar-hide border-t border-border">
          {quickMessages.map((qm) => (
            <button
              key={qm}
              className="flex-shrink-0 text-[9px] px-2 py-0.5 rounded-full bg-muted hover:bg-muted/80 text-foreground transition-colors"
              onClick={() => { setNewMessage(qm); inputRef.current?.focus(); }}
            >
              {qm}
            </button>
          ))}
        </div>

        {/* Input */}
        <div className="p-2 border-t border-border flex gap-1.5">
          <Input
            ref={inputRef}
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Message..."
            className="flex-1 h-8 text-xs"
            disabled={sending}
          />
          <Button variant="hero" size="icon" className="h-8 w-8 flex-shrink-0" onClick={sendMessage} disabled={!newMessage.trim() || sending}>
            {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
          </Button>
        </div>
      </div>
    </>
  );
};

export default DeliveryChat;
