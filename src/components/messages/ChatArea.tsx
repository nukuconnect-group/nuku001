import { useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft, MoreVertical, Send, Paperclip, Mic, MicOff,
  Image as ImageIcon, Sparkles, X, CheckCheck, Clock, MessageCircle,
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
  onSend: (content: string) => void;
  onLocalMessage: (msg: MessageItem) => void;
  messagesEndRef: React.RefObject<HTMLDivElement>;
}

export default function ChatArea({ conversation, messages, onBack, onSend, onLocalMessage, messagesEndRef }: Props) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [messageInput, setMessageInput] = useState("");
  const [showAiSuggestions, setShowAiSuggestions] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  const handleSendMessage = () => {
    if (!messageInput.trim()) return;
    onSend(messageInput.trim());
    setMessageInput("");
    setShowAiSuggestions(false);
  };

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>, type: "file" | "image") => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    const newMsg: MessageItem = {
      id: `local-${Date.now()}`,
      senderId: "me",
      content: type === "image" ? "📷 Photo" : `📎 ${file.name}`,
      timestamp: new Date(),
      status: "sent",
      type,
      fileUrl: url,
      fileName: file.name,
    };
    onLocalMessage(newMsg);
    e.target.value = "";
  };

  const toggleRecording = async () => {
    if (isRecording) {
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunks, { type: "audio/webm" });
        const url = URL.createObjectURL(blob);
        const newMsg: MessageItem = {
          id: `local-${Date.now()}`,
          senderId: "me",
          content: "🎙️ Message vocal",
          timestamp: new Date(),
          status: "sent",
          type: "voice",
          fileUrl: url,
        };
        onLocalMessage(newMsg);
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
      <input ref={fileInputRef} type="file" className="hidden" onChange={(e) => handleFileSelected(e, "file")} />
      <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleFileSelected(e, "image")} />

      {/* Header */}
      <div className="p-2.5 sm:p-3 border-b border-border flex items-center gap-2 sm:gap-3 bg-card">
        <button onClick={onBack} className="lg:hidden p-1.5 hover:bg-muted rounded-lg">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="relative flex-shrink-0">
          <img src={conversation.participant.avatar} alt="" className="w-9 h-9 rounded-full object-cover" />
          {conversation.participant.isOnline && <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-card" />}
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
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="w-4 h-4" /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {conversation.productName && (
              <DropdownMenuItem onClick={() => navigate(`/produit/${conversation.productId}`)}>Voir le produit</DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={() => navigate(`/producteurs/${conversation.participant.name}`)}>Voir le profil</DropdownMenuItem>
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
      <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 bg-muted/20">
        <div className="flex items-center justify-center">
          <span className="text-[10px] text-muted-foreground bg-muted px-3 py-1 rounded-full">Aujourd'hui</span>
        </div>
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.senderId === "me" ? "justify-end" : "justify-start"}`}>
            <Card className={`max-w-[85%] sm:max-w-[75%] p-2.5 shadow-sm border-0 ${
              msg.senderId === "me" ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-card rounded-bl-sm"
            }`}>
              {msg.type === "image" && msg.fileUrl && (
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
              <p className="text-sm leading-relaxed">{msg.content}</p>
              <div className={`flex items-center gap-1 mt-1 ${msg.senderId === "me" ? "justify-end" : ""}`}>
                <span className="text-[10px] opacity-70">
                  {msg.timestamp.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                </span>
                {msg.senderId === "me" && getMessageStatus(msg.status)}
              </div>
            </Card>
          </div>
        ))}
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
              <button
                key={reply.label}
                onClick={() => { setMessageInput(reply.text); setShowAiSuggestions(false); }}
                className="px-2.5 py-1 rounded-full bg-card border border-primary/20 text-[11px] font-medium text-foreground hover:bg-primary/10 transition-colors"
              >
                {reply.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="p-2.5 sm:p-3 border-t border-border bg-card">
        <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }} className="flex items-center gap-1.5 sm:gap-2">
          <Button type="button" variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0" onClick={() => fileInputRef.current?.click()}>
            <Paperclip className="w-4 h-4 text-muted-foreground" />
          </Button>
          <Button type="button" variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0" onClick={() => imageInputRef.current?.click()}>
            <ImageIcon className="w-4 h-4 text-muted-foreground" />
          </Button>
          <Button type="button" variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0" onClick={() => setShowAiSuggestions(!showAiSuggestions)}>
            <Sparkles className={`w-4 h-4 ${showAiSuggestions ? "text-primary" : "text-muted-foreground"}`} />
          </Button>
          <Input value={messageInput} onChange={(e) => setMessageInput(e.target.value)} placeholder="Écrivez votre message..." className="flex-1 h-9 text-sm" />
          <Button type="button" variant="ghost" size="icon" className={`h-8 w-8 flex-shrink-0 ${isRecording ? "text-destructive animate-pulse" : ""}`} onClick={toggleRecording}>
            {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4 text-muted-foreground" />}
          </Button>
          <Button type="submit" size="icon" className="h-8 w-8 bg-primary hover:bg-primary/90 flex-shrink-0" disabled={!messageInput.trim()}>
            <Send className="w-3.5 h-3.5" />
          </Button>
        </form>
      </div>
    </div>
  );
}
