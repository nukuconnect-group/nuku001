import { useState, useRef, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  ArrowLeft, MoreVertical, Send, Paperclip, Mic, MicOff,
  Image as ImageIcon, Sparkles, X, CheckCheck, Clock, MessageCircle,
  Loader2, Reply, Maximize2, Minimize2,
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { type ConversationItem } from "@/hooks/useConversations";
import { type MessageItem } from "@/hooks/useMessages";

const AI_QUICK_REPLIES = [
  { label: "Disponibilité", text: "Bonjour, est-ce que ce produit est encore disponible ?" },
  { label: "Prix en gros", text: "Quel est votre meilleur prix pour une commande en gros ?" },
  { label: "Livraison", text: "Quels sont vos délais et frais de livraison ?" },
  { label: "Qualité", text: "Pouvez-vous me garantir la qualité et la fraîcheur ?" },
  { label: "Négocier", text: "Serait-il possible de négocier le prix pour une commande régulière ?" },
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
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [imagePreview, setImagePreview] = useState<{ file: File; url: string } | null>(null);
  const [replyTo, setReplyTo] = useState<MessageItem | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Typing indicator: listen to realtime presence
  useEffect(() => {
    if (!conversation) return;
    const channel = supabase.channel(`typing-${conversation.id}`);
    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        const others = Object.values(state).flat().filter((p: any) => p.typing && p.user_id !== "me");
        setIsTyping(others.length > 0);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [conversation?.id]);

  // Broadcast typing status
  const broadcastTyping = useCallback(() => {
    if (!conversation) return;
    const channel = supabase.channel(`typing-${conversation.id}`);
    channel.track({ typing: true, user_id: "me" });
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      channel.track({ typing: false, user_id: "me" });
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
      const ext = file.name.split('.').pop() || 'jpg';
      const fileName = `chat/${conversation.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("product-images").upload(fileName, file, { contentType: file.type });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from("product-images").getPublicUrl(fileName);
      const content = caption ? `📷 ${caption}` : "📷 Photo";
      onSend(`${content}\n[image:${urlData.publicUrl}]`, replyTo?.id);
      setImagePreview(null);
      setMessageInput("");
      setReplyTo(null);
      toast({ title: "Image envoyée ✓" });
    } catch (error: any) {
      toast({ title: "Erreur d'envoi", description: "Impossible d'envoyer l'image", variant: "destructive" });
    } finally {
      setIsUploadingImage(false);
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
      case "read": return <CheckCheck className="w-3 h-3 text-primary" />;
      case "delivered": return <CheckCheck className="w-3 h-3 text-muted-foreground" />;
      case "sent": return <Clock className="w-3 h-3 text-muted-foreground" />;
      default: return null;
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
    <div className="flex-1 flex flex-col bg-background">
      <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileSelected} />
      <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageSelected} />

      {/* Header */}
      <div className="p-2 sm:p-3 border-b border-border flex items-center gap-2 sm:gap-3 bg-card">
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
        {conversation.productName && (
          <Link to={`/produit/${conversation.productId}`} className="hidden sm:flex">
            <Badge variant="outline" className="gap-1.5 cursor-pointer hover:bg-muted text-[10px]">
              {conversation.productImage && <img src={conversation.productImage} alt="" className="w-4 h-4 rounded object-cover" />}
              {conversation.productName}
            </Badge>
          </Link>
        )}
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
            <DropdownMenuItem onClick={() => toast({ title: "Conversation vidée" })}>Vider la conversation</DropdownMenuItem>
            <DropdownMenuItem onClick={() => toast({ title: "Utilisateur bloqué", description: `${conversation.participant.name} a été bloqué` })} className="text-destructive">Bloquer</DropdownMenuItem>
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

      {/* AI Suggestions */}
      {showAiSuggestions && (
        <div className="px-3 py-2 bg-primary/5 border-t border-primary/10">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-medium text-primary flex items-center gap-1">
              <Sparkles className="w-3 h-3" />Suggestions IA
            </span>
            <button onClick={() => setShowAiSuggestions(false)}><X className="w-3.5 h-3.5 text-muted-foreground" /></button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {AI_QUICK_REPLIES.map((reply) => (
              <button key={reply.label} onClick={() => { setMessageInput(reply.text); setShowAiSuggestions(false); }}
                className="px-2.5 py-1 rounded-full bg-card border border-primary/20 text-[11px] font-medium text-foreground hover:bg-primary/10 transition-colors">
                {reply.label}
              </button>
            ))}
          </div>
        </div>
      )}

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

      {/* Input */}
      <div className="p-2 sm:p-3 border-t border-border bg-card safe-area-bottom">
        <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }} className="flex items-center gap-1 sm:gap-2">
          <div className="flex items-center gap-0.5 sm:gap-1 flex-shrink-0">
            <Button type="button" variant="ghost" size="icon" className="h-7 w-7 sm:h-8 sm:w-8" onClick={() => fileInputRef.current?.click()}>
              <Paperclip className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground" />
            </Button>
            <Button type="button" variant="ghost" size="icon" className="h-7 w-7 sm:h-8 sm:w-8" onClick={() => imageInputRef.current?.click()}>
              <ImageIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground" />
            </Button>
            <Button type="button" variant="ghost" size="icon" className="h-7 w-7 sm:h-8 sm:w-8 hidden sm:flex" onClick={() => setShowAiSuggestions(!showAiSuggestions)}>
              <Sparkles className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${showAiSuggestions ? "text-primary" : "text-muted-foreground"}`} />
            </Button>
          </div>
          <Input ref={inputRef} value={messageInput} onChange={handleInputChange} placeholder="Message..." className="flex-1 min-w-0 h-8 sm:h-9 text-xs sm:text-sm" />
          <div className="flex items-center gap-0.5 sm:gap-1 flex-shrink-0">
            <Button type="button" variant="ghost" size="icon" className={`h-7 w-7 sm:h-8 sm:w-8 ${isRecording ? "text-destructive animate-pulse" : ""}`} onClick={toggleRecording}>
              {isRecording ? <MicOff className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <Mic className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground" />}
            </Button>
            <Button type="submit" size="icon" className="h-7 w-7 sm:h-8 sm:w-8 bg-primary hover:bg-primary/90" disabled={!messageInput.trim() && !imagePreview || isUploadingImage}>
              {isUploadingImage ? <Loader2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 animate-spin" /> : <Send className="w-3 h-3 sm:w-3.5 sm:h-3.5" />}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
