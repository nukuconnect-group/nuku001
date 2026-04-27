import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  ArrowLeft, MoreVertical, Send, Paperclip, Mic, MicOff,
  Image as ImageIcon, Sparkles, X, CheckCheck, Check, Clock, MessageCircle,
  Loader2, Reply, Maximize2, Minimize2, Phone, Ban, Flag, AlertTriangle, Trash2, ShieldCheck,
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { type ConversationItem } from "@/hooks/useConversations";
import { type MessageItem } from "@/hooks/useMessages";
import OfflineReadIndicator from "./OfflineReadIndicator";

const AI_QUICK_REPLIES = [
  { label: "Disponibilité", text: "Bonjour, est-ce que ce produit est encore disponible ?" },
  { label: "Prix en gros", text: "Quel est votre meilleur prix pour une commande en gros ?" },
  { label: "Livraison", text: "Quels sont vos délais et frais de livraison ?" },
  { label: "Qualité", text: "Pouvez-vous me garantir la qualité et la fraîcheur ?" },
  { label: "Négocier", text: "Serait-il possible de négocier le prix pour une commande régulière ?" },
];

const DELIVERY_QUICK_REPLIES = [
  { label: "Je suis prêt", text: "Bonjour, je suis prêt pour la livraison." },
  { label: "Position", text: "Pouvez-vous partager votre position actuelle ?" },
  { label: "J'arrive", text: "J'arrive dans quelques minutes." },
  { label: "Merci", text: "Merci, livraison bien reçue." },
];

interface Props {
  conversation: ConversationItem | null;
  messages: MessageItem[];
  onBack: () => void;
  onSend: (content: string, replyToId?: string) => void;
  onLocalMessage: (msg: MessageItem) => void;
  messagesEndRef: React.RefObject<HTMLDivElement>;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
}

export default function ChatArea({ conversation, messages, onBack, onSend, onLocalMessage, messagesEndRef, isFullscreen, onToggleFullscreen }: Props) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [messageInput, setMessageInput] = useState("");
  const [showAiSuggestions, setShowAiSuggestions] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [waveform, setWaveform] = useState<number[]>([]);
  const recordTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number | null>(null);
  const recordStreamRef = useRef<MediaStream | null>(null);
  const recordStartRef = useRef<number>(0);
  const cancelledRef = useRef<boolean>(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [imagePreview, setImagePreview] = useState<{ file: File; url: string } | null>(null);
  const [replyTo, setReplyTo] = useState<MessageItem | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [isBlocked, setIsBlocked] = useState(() => {
    if (!conversation) return false;
    const blocked = JSON.parse(localStorage.getItem("nuku_blocked_users") || "[]");
    return blocked.includes(conversation.participant.id);
  });
  // Welcome banner: persistent per conversation, dismissible by user
  const welcomeKey = conversation ? `nuku_welcome_dismissed_${conversation.id}` : null;
  const [welcomeDismissed, setWelcomeDismissed] = useState(() => {
    if (!welcomeKey) return false;
    return localStorage.getItem(welcomeKey) === "1";
  });
  useEffect(() => {
    if (!welcomeKey) return;
    setWelcomeDismissed(localStorage.getItem(welcomeKey) === "1");
  }, [welcomeKey]);
  const dismissWelcome = () => {
    if (!welcomeKey) return;
    localStorage.setItem(welcomeKey, "1");
    setWelcomeDismissed(true);
  };
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const typingUserIdRef = useRef<string>(crypto.randomUUID());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const quickReplies = useMemo(
    () => (conversation?.isDelivery ? DELIVERY_QUICK_REPLIES : AI_QUICK_REPLIES),
    [conversation?.isDelivery]
  );

  // Sync block state when conversation changes
  useEffect(() => {
    if (!conversation) return;
    const blocked = JSON.parse(localStorage.getItem("nuku_blocked_users") || "[]");
    setIsBlocked(blocked.includes(conversation.participant.id));
  }, [conversation?.participant.id]);

  const toggleBlock = () => {
    if (!conversation) return;
    const blocked: string[] = JSON.parse(localStorage.getItem("nuku_blocked_users") || "[]");
    const next = isBlocked ? blocked.filter(id => id !== conversation.participant.id) : [...blocked, conversation.participant.id];
    localStorage.setItem("nuku_blocked_users", JSON.stringify(next));
    setIsBlocked(!isBlocked);
    toast({
      title: isBlocked ? "✓ Utilisateur débloqué" : "🚫 Utilisateur bloqué",
      description: `${conversation.participant.name} ${isBlocked ? "a été débloqué" : "a été bloqué. Vous ne recevrez plus de messages."}`,
    });
  };

  const clearConversation = async () => {
    if (!conversation || conversation.isDelivery) {
      if (conversation?.isDelivery) toast({ title: "Action indisponible", description: "Les chats de livraison ne peuvent pas être vidés.", variant: "destructive" });
      return;
    }
    if (!confirm(`Vider toute la conversation avec ${conversation.participant.name} ?\n\nTous les messages seront supprimés définitivement.`)) return;
    const { data, error } = await supabase.rpc("clear_conversation_messages", { p_conversation_id: conversation.id });
    if (error) { toast({ title: "Erreur", description: error.message, variant: "destructive" }); return; }
    toast({ title: "🧹 Conversation vidée", description: `${(data as any)?.deleted_count || 0} messages supprimés.` });
  };

  const deleteEntireBox = async () => {
    if (!conversation || conversation.isDelivery) {
      if (conversation?.isDelivery) toast({ title: "Action indisponible", description: "Les chats de livraison ne peuvent pas être supprimés.", variant: "destructive" });
      return;
    }
    if (!confirm(`Supprimer définitivement la boîte de message avec ${conversation.participant.name} ?\n\nCette action est irréversible.`)) return;
    const { error } = await supabase.rpc("delete_conversation_thread", { p_conversation_id: conversation.id });
    if (error) { toast({ title: "Erreur", description: error.message, variant: "destructive" }); return; }
    toast({ title: "🗑️ Boîte supprimée" });
    onBack();
  };

  const deleteSingleMessage = async (msgId: string) => {
    if (msgId.startsWith("local-")) return;
    const { error } = await supabase.from("messages").delete().eq("id", msgId);
    if (error) toast({ title: "Erreur", description: error.message, variant: "destructive" });
  };

  // Typing indicator: listen to realtime presence
  useEffect(() => {
    if (!conversation) return;
    const channel = supabase.channel(`typing-${conversation.id}`, {
      config: { presence: { key: typingUserIdRef.current } },
    });
    typingChannelRef.current = channel;
    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        const others = Object.values(state).flat().filter((p: any) => p.typing && p.user_id !== typingUserIdRef.current);
        setIsTyping(others.length > 0);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({ typing: false, user_id: typingUserIdRef.current });
        }
      });
    return () => {
      typingChannelRef.current = null;
      supabase.removeChannel(channel);
    };
  }, [conversation?.id]);

  // Broadcast typing status
  const broadcastTyping = useCallback(() => {
    const channel = typingChannelRef.current;
    if (!conversation || !channel) return;
    channel.track({ typing: true, user_id: typingUserIdRef.current });
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      channel.track({ typing: false, user_id: typingUserIdRef.current });
    }, 2000);
  }, [conversation?.id]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessageInput(e.target.value);
    broadcastTyping();
  };

  const handleSendMessage = async () => {
    if (imagePreview) {
      await uploadAndSendImage(imagePreview.file, messageInput.trim());
      return;
    }
    if (!messageInput.trim()) return;
    onSend(messageInput.trim(), replyTo?.id);
    setMessageInput("");
    setReplyTo(null);
    setShowAiSuggestions(false);
  };

  const uploadAndSendImage = async (file: File, caption?: string) => {
    if (!conversation) return;
    setIsUploadingImage(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
      const fileName = `${user.id}/chat-${conversation.id}-${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("chat-attachments")
        .upload(fileName, file, { contentType: file.type, upsert: false });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from("chat-attachments").getPublicUrl(fileName);
      const content = caption ? `📷 ${caption}` : "📷 Photo";
      onSend(`${content}\n[image:${urlData.publicUrl}]`, replyTo?.id);
      setImagePreview(null);
      setMessageInput("");
      setReplyTo(null);
      toast({ title: "Image envoyée ✓" });
    } catch (error: any) {
      console.error("Image upload error:", error);
      toast({ title: "Erreur d'envoi", description: error?.message || "Impossible d'envoyer l'image", variant: "destructive" });
    } finally {
      setIsUploadingImage(false);
    }
  };

  const uploadAndSendVoice = async (blob: Blob, durationSec: number) => {
    if (!conversation) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const fileName = `${user.id}/voice-${conversation.id}-${Date.now()}.webm`;
      const { error: uploadError } = await supabase.storage
        .from("chat-attachments")
        .upload(fileName, blob, { contentType: "audio/webm", upsert: false });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from("chat-attachments").getPublicUrl(fileName);
      onSend(`🎙️ Message vocal (${Math.round(durationSec)}s)\n[voice:${urlData.publicUrl}]`, replyTo?.id);
      setReplyTo(null);
      toast({ title: "Vocal envoyé ✓" });
    } catch (error: any) {
      console.error("Voice upload error:", error);
      toast({ title: "Erreur", description: error?.message || "Impossible d'envoyer le vocal", variant: "destructive" });
    }
  };

  const handleImageSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Fichier trop volumineux", description: "La taille maximale est de 5 Mo", variant: "destructive" });
      e.target.value = "";
      return;
    }
    const url = URL.createObjectURL(file);
    setImagePreview({ file, url });
    e.target.value = "";
  };

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    const newMsg: MessageItem = {
      id: `local-${Date.now()}`, senderId: "me", content: `📎 ${file.name}`,
      timestamp: new Date(), status: "sent", type: "file", fileUrl: url, fileName: file.name,
    };
    onLocalMessage(newMsg);
    e.target.value = "";
  };

  const toggleRecording = async () => {
    if (isRecording) { mediaRecorderRef.current?.stop(); setIsRecording(false); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunks, { type: "audio/webm" });
        const url = URL.createObjectURL(blob);
        onLocalMessage({ id: `local-${Date.now()}`, senderId: "me", content: "🎙️ Message vocal", timestamp: new Date(), status: "sent", type: "voice", fileUrl: url });
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
    } catch {
      toast({ title: "Micro non disponible", description: "Autorisez l'accès au microphone", variant: "destructive" });
    }
  };

  const getMessageStatus = (status: string) => {
    switch (status) {
      case "read": return <CheckCheck className="w-3.5 h-3.5 text-blue-500" />;
      case "delivered": return <CheckCheck className="w-3.5 h-3.5 text-muted-foreground/60" />;
      case "sent": return <Check className="w-3 h-3 text-muted-foreground/60" />;
      default: return <Clock className="w-3 h-3 text-muted-foreground/40" />;
    }
  };

  const parseMessage = (content: string) => {
    const imageMatch = content.match(/\[image:(https?:\/\/[^\]]+)\]/);
    if (imageMatch) {
      const text = content.replace(/\n?\[image:[^\]]+\]/, "").trim();
      return { text: text || "📷 Photo", imageUrl: imageMatch[1] };
    }
    return { text: content, imageUrl: null };
  };

  const handleReply = (msg: MessageItem) => {
    setReplyTo(msg);
    inputRef.current?.focus();
  };

  const findReplyMessage = (replyToId?: string) => {
    if (!replyToId) return null;
    return messages.find(m => m.id === replyToId) || null;
  };

  if (!conversation) {
    return (
      <div className="flex-1 flex items-center justify-center bg-muted/10 hidden lg:flex">
        <div className="text-center px-4">
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <MessageCircle className="w-10 h-10 text-primary" />
          </div>
          <h3 className="font-heading text-lg font-semibold text-foreground mb-1">Vos messages</h3>
          <p className="text-sm text-muted-foreground max-w-xs">Sélectionnez une conversation pour discuter</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-background min-h-0 h-full">
      <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileSelected} />
      <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageSelected} />

      {/* Header */}
      <div className="p-2 sm:p-3 border-b border-border flex items-center gap-2 sm:gap-3 bg-card flex-shrink-0 sticky top-0 z-10">
        <button onClick={onBack} className="p-1.5 hover:bg-muted rounded-lg lg:hidden">
          <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>
        <div className="relative flex-shrink-0">
          <img src={conversation.participant.avatar} alt="" className="w-9 h-9 rounded-full object-cover" />
          <div className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-card ${conversation.participant.isOnline ? "bg-green-500" : "bg-muted-foreground/40"}`} />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="font-medium text-sm text-foreground truncate">{conversation.participant.name}</h2>
          <p className="text-[10px] text-muted-foreground">
            {conversation.participant.isOnline ? (
              <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 bg-green-500 rounded-full" />En ligne</span>
            ) : "Hors ligne"}
          </p>
        </div>
        {conversation.isDelivery && (
          <Badge variant="secondary" className="hidden sm:inline-flex text-[10px]">🚚 Livraison</Badge>
        )}
        {conversation.productName && (
          <Link to={`/produit/${conversation.productId}`} className="hidden sm:flex">
            <Badge variant="outline" className="gap-1.5 cursor-pointer hover:bg-muted text-[10px]">
              {conversation.productImage && <img src={conversation.productImage} alt="" className="w-4 h-4 rounded object-cover" />}
              {conversation.productName}
            </Badge>
          </Link>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => toast({ title: "📞 Appel", description: `Appel en cours vers ${conversation.participant.name}...` })}
        >
          <Phone className="w-4 h-4" />
        </Button>
        {onToggleFullscreen && (
          <Button type="button" variant="ghost" size="icon" className="h-8 w-8 hidden sm:flex" onClick={onToggleFullscreen}>
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </Button>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="w-4 h-4" /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {conversation.productName && (
              <DropdownMenuItem onClick={() => navigate(`/produit/${conversation.productId}`)}>Voir le produit</DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={() => navigate(`/producteurs/${conversation.participant.name}`)}>Voir le profil</DropdownMenuItem>
            {onToggleFullscreen && (
              <DropdownMenuItem onClick={onToggleFullscreen} className="sm:hidden">
                {isFullscreen ? "Quitter plein écran" : "Plein écran"}
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={clearConversation}>🧹 Vider la conversation</DropdownMenuItem>
            <DropdownMenuItem onClick={deleteEntireBox} className="text-destructive gap-2">
              <Trash2 className="w-3.5 h-3.5" />Supprimer la boîte
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={toggleBlock} className={isBlocked ? "" : "text-destructive gap-2"}>
              <Ban className="w-3.5 h-3.5" />{isBlocked ? "Débloquer" : "Bloquer"}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => toast({ title: "🚩 Signalement envoyé", description: `${conversation.participant.name} a été signalé à notre équipe.` })} className="text-destructive gap-2">
              <Flag className="w-3.5 h-3.5" />Signaler
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Mobile product banner */}
      {conversation.productName && (
        <div className="px-3 py-1.5 bg-primary/5 border-b border-primary/10 flex items-center gap-2 sm:hidden">
          {conversation.productImage && <img src={conversation.productImage} alt="" className="w-6 h-6 rounded object-cover" />}
          <span className="text-[11px] font-medium text-primary truncate">{conversation.productName}</span>
          <Link to={`/produit/${conversation.productId}`} className="ml-auto text-[10px] text-primary underline">Voir</Link>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-2 sm:p-4 space-y-2 sm:space-y-3 bg-muted/20">
        <OfflineReadIndicator />
        {/* Welcome / protection banner — persistent until user dismisses */}
        {!welcomeDismissed && (
          <div className="relative flex items-start gap-2 mx-auto max-w-md p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 shadow-sm animate-fade-in">
            <ShieldCheck className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0 pr-5">
              <p className="text-[11px] font-semibold text-emerald-800 dark:text-emerald-200 mb-0.5">
                Achetez en toute sécurité
              </p>
              <p className="text-[10px] text-emerald-700 dark:text-emerald-300 leading-relaxed">
                Effectuez vos paiements et discussions sur <strong>NukuConnect</strong> pour bénéficier de la protection des commandes.
                <Link to="/aide" className="text-primary underline ml-1">En savoir plus</Link>
              </p>
            </div>
            <button onClick={dismissWelcome} className="absolute top-1.5 right-1.5 p-1 rounded-full hover:bg-emerald-100 dark:hover:bg-emerald-900" aria-label="Fermer">
              <X className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-300" />
            </button>
          </div>
        )}
        {/* Product preview card */}
        {conversation.productName && conversation.productImage && (
          <Link to={`/produit/${conversation.productId}`} className="block">
            <div className="flex items-center gap-3 p-2.5 rounded-xl bg-card border border-border shadow-sm hover:shadow-md transition-shadow mx-auto max-w-xs">
              <img src={conversation.productImage} alt={conversation.productName} className="w-14 h-14 rounded-lg object-cover flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-foreground truncate">{conversation.productName}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Produit concerné</p>
                <span className="text-[10px] text-primary font-medium">Voir le produit →</span>
              </div>
            </div>
          </Link>
        )}
        <div className="flex items-center justify-center">
          <span className="text-[10px] text-muted-foreground bg-muted px-3 py-1 rounded-full">Aujourd'hui</span>
        </div>
        {messages.map((msg) => {
          const { text, imageUrl } = parseMessage(msg.content);
          const repliedMsg = findReplyMessage(msg.replyToId);
          return (
            <div key={msg.id} className={`flex ${msg.senderId === "me" ? "justify-end" : "justify-start"} group`}>
              <div className="flex items-center gap-1 max-w-[85%] sm:max-w-[75%]">
                {/* Reply button (on hover, left side for own messages) */}
                {msg.senderId === "me" && (
                  <button onClick={() => handleReply(msg)} className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-muted rounded-full" title="Répondre">
                    <Reply className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>
                )}
                <Card className={`p-2.5 shadow-sm border-0 ${
                  msg.senderId === "me" ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-card rounded-bl-sm"
                }`}>
                  {/* Quoted reply */}
                  {repliedMsg && (
                    <div className={`mb-1.5 p-1.5 rounded-lg border-l-2 ${
                      msg.senderId === "me" ? "bg-primary-foreground/10 border-primary-foreground/40" : "bg-muted border-primary/40"
                    }`}>
                      <p className={`text-[10px] font-medium mb-0.5 ${msg.senderId === "me" ? "text-primary-foreground/70" : "text-primary"}`}>
                        {repliedMsg.senderId === "me" ? "Vous" : conversation.participant.name}
                      </p>
                      <p className={`text-[10px] truncate ${msg.senderId === "me" ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                        {parseMessage(repliedMsg.content).text}
                      </p>
                    </div>
                  )}
                  {imageUrl && (
                    <img src={imageUrl} alt="" className="rounded-lg mb-1.5 max-h-56 max-w-full object-cover cursor-pointer"
                      onClick={() => window.open(imageUrl, "_blank")} />
                  )}
                  {msg.type === "image" && msg.fileUrl && !imageUrl && (
                    <img src={msg.fileUrl} alt="" className="rounded-lg mb-1.5 max-h-48 object-cover" />
                  )}
                  {msg.type === "voice" && msg.fileUrl && (
                    <audio controls src={msg.fileUrl} className="max-w-full h-8 mb-1" />
                  )}
                  {msg.type === "file" && (
                    <div className="flex items-center gap-2 p-2 bg-black/10 rounded-lg mb-1.5">
                      <Paperclip className="w-4 h-4" />
                      <span className="text-xs truncate">{msg.fileName}</span>
                    </div>
                  )}
                  <p className="text-sm leading-relaxed">{text}</p>
                  <div className={`flex items-center gap-1 mt-1 ${msg.senderId === "me" ? "justify-end" : ""}`}>
                    <span className="text-[10px] opacity-70">
                      {msg.timestamp.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                    {msg.senderId === "me" && getMessageStatus(msg.status)}
                  </div>
                </Card>
                {/* Reply button (on hover, right side for other's messages) */}
                {msg.senderId !== "me" && (
                  <button onClick={() => handleReply(msg)} className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-muted rounded-full" title="Répondre">
                    <Reply className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
        {/* Typing indicator */}
        {isTyping && (
          <div className="flex justify-start">
            <div className="flex items-center gap-2 max-w-[85%] sm:max-w-[75%]">
              <Card className="px-4 py-2.5 shadow-sm border-0 bg-card rounded-bl-sm">
                <div className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </Card>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Reply Suggestions - always visible like WhatsApp */}
      <div className="px-2 sm:px-3 py-1.5 bg-muted/30 border-t border-border/50">
        <div className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-0.5">
          {quickReplies.map((reply) => (
            <button key={reply.label} onClick={() => { setMessageInput(reply.text); inputRef.current?.focus(); }}
              className="whitespace-nowrap px-2.5 py-1 rounded-full bg-card border border-border text-[10px] sm:text-[11px] font-medium text-foreground hover:bg-primary/10 hover:border-primary/30 transition-colors flex-shrink-0">
              {reply.label}
            </button>
          ))}
        </div>
      </div>

      {/* Image preview */}
      {imagePreview && (
        <div className="px-3 py-2 bg-muted/50 border-t border-border">
          <div className="flex items-start gap-2">
            <div className="relative">
              <img src={imagePreview.url} alt="" className="w-20 h-20 rounded-lg object-cover" />
              <button onClick={() => { URL.revokeObjectURL(imagePreview.url); setImagePreview(null); }}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center">
                <X className="w-3 h-3" />
              </button>
            </div>
            <div className="flex-1">
              <p className="text-[10px] text-muted-foreground mb-1">Image prête à envoyer</p>
              <Input value={messageInput} onChange={(e) => setMessageInput(e.target.value)} placeholder="Ajouter une légende (optionnel)..." className="h-8 text-xs" />
            </div>
          </div>
        </div>
      )}

      {/* Reply preview bar */}
      {replyTo && (
        <div className="px-3 py-2 bg-primary/5 border-t border-primary/10 flex items-center gap-2">
          <Reply className="w-4 h-4 text-primary flex-shrink-0" />
          <div className="flex-1 min-w-0 border-l-2 border-primary pl-2">
            <p className="text-[10px] font-semibold text-primary">
              {replyTo.senderId === "me" ? "Vous" : conversation.participant.name}
            </p>
            <p className="text-[11px] text-muted-foreground truncate">{parseMessage(replyTo.content).text}</p>
          </div>
          <button onClick={() => setReplyTo(null)} className="p-1 hover:bg-muted rounded-full flex-shrink-0">
            <X className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
        </div>
      )}

      {/* Input - responsive, fully aligned on mobile, no bottom-nav overlap */}
      <div className="px-2 sm:px-3 pt-2 pb-2 border-t border-border bg-card flex-shrink-0" style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 0.5rem)" }}>
        <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }} className="flex items-center gap-1.5 w-full">
          <Button type="button" variant="ghost" size="icon" className="h-10 w-10 flex-shrink-0" onClick={() => imageInputRef.current?.click()}>
            <ImageIcon className="w-5 h-5 text-muted-foreground" />
          </Button>
          <Button type="button" variant="ghost" size="icon" className="h-10 w-10 flex-shrink-0 hidden sm:flex" onClick={() => fileInputRef.current?.click()}>
            <Paperclip className="w-5 h-5 text-muted-foreground" />
          </Button>
          <Input ref={inputRef} value={messageInput} onChange={handleInputChange} placeholder="Écrire un message..." className="flex-1 min-w-0 h-11 text-sm rounded-full px-4" />
          <Button type="button" variant="ghost" size="icon" className={`h-10 w-10 flex-shrink-0 ${isRecording ? "text-destructive animate-pulse" : ""}`} onClick={toggleRecording}>
            {isRecording ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5 text-muted-foreground" />}
          </Button>
          <Button type="submit" size="icon" className="h-11 w-11 flex-shrink-0 rounded-full bg-primary hover:bg-primary/90" disabled={(!messageInput.trim() && !imagePreview) || isUploadingImage}>
            {isUploadingImage ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
          </Button>
        </form>
      </div>
    </div>
  );
}
