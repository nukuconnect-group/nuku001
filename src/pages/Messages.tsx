import { useState, useEffect, useRef, useCallback } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/layout/Header";
import MobileBottomNav from "@/components/layout/MobileBottomNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Search, MessageCircle, Send, ArrowLeft, MoreVertical,
  Image as ImageIcon, Paperclip, Mic, MicOff,
  CheckCheck, Clock, Sparkles, X, Loader2
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";

interface Conversation {
  id: string;
  participant: { name: string; avatar: string; isOnline: boolean };
  lastMessage: string;
  timestamp: string;
  unread: number;
  productName?: string;
  productImage?: string;
  productId?: string;
}

interface Message {
  id: string;
  senderId: string;
  content: string;
  timestamp: Date;
  status: "sent" | "delivered" | "read";
  type?: "text" | "image" | "voice" | "file";
  fileUrl?: string;
  fileName?: string;
}

const AI_QUICK_REPLIES = [
  { label: "Disponibilité", text: "Bonjour, est-ce que ce produit est encore disponible ?" },
  { label: "Prix en gros", text: "Quel est votre meilleur prix pour une commande en gros ?" },
  { label: "Livraison", text: "Quels sont vos délais et frais de livraison ?" },
  { label: "Qualité", text: "Pouvez-vous me garantir la qualité et la fraîcheur ?" },
  { label: "Négocier", text: "Serait-il possible de négocier le prix pour une commande régulière ?" },
];

const CATEGORIES = [
  { id: "all", label: "Tous" },
  { id: "unread", label: "Non lus" },
  { id: "product", label: "Produits" },
];

const mockConversations: Conversation[] = [
  {
    id: "1",
    participant: { name: "Kofi Mensah", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100", isOnline: true },
    lastMessage: "D'accord, je prépare votre commande de maïs.",
    timestamp: "10:30", unread: 2,
    productName: "Maïs Jaune Premium",
    productImage: "https://images.unsplash.com/photo-1551754655-cd27e38d2076?w=100",
    productId: "1",
  },
  {
    id: "2",
    participant: { name: "Ama Koffi", avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100", isOnline: false },
    lastMessage: "Merci pour votre achat !",
    timestamp: "Hier", unread: 0,
    productName: "Tomates Fraîches",
    productImage: "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=100",
    productId: "2",
  },
  {
    id: "3",
    participant: { name: "Yao Agbeko", avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100", isOnline: true },
    lastMessage: "Les ignames seront disponibles la semaine prochaine.",
    timestamp: "Lun", unread: 0,
    productName: "Ignames Blancs",
    productImage: "https://images.unsplash.com/photo-1590165482129-1b8b27698780?w=100",
    productId: "3",
  },
];

const Messages = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const [user, setUser] = useState<any>(null);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [messageInput, setMessageInput] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [isRecording, setIsRecording] = useState(false);
  const [showAiSuggestions, setShowAiSuggestions] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  const [messages, setMessages] = useState<Message[]>([
    { id: "1", senderId: "other", content: "Bonjour ! Votre commande de maïs est en préparation.", timestamp: new Date(Date.now() - 3600000), status: "read" },
    { id: "2", senderId: "me", content: "Merci ! Quand sera-t-elle prête ?", timestamp: new Date(Date.now() - 3000000), status: "read" },
    { id: "3", senderId: "other", content: "Elle sera prête demain matin.", timestamp: new Date(Date.now() - 1800000), status: "read" },
    { id: "4", senderId: "me", content: "Parfait, merci beaucoup !", timestamp: new Date(Date.now() - 900000), status: "delivered" },
  ]);

  // Auto-select conversation from URL params (product context)
  useEffect(() => {
    const productId = searchParams.get("product");
    const sellerName = searchParams.get("seller");
    if (productId || sellerName) {
      const match = mockConversations.find(
        (c) => c.productId === productId || c.participant.name === sellerName
      );
      if (match) setSelectedConversation(match);
    }
  }, [searchParams]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const filteredConversations = mockConversations.filter((conv) => {
    const matchesSearch =
      conv.participant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      conv.productName?.toLowerCase().includes(searchQuery.toLowerCase());
    if (activeCategory === "unread") return matchesSearch && conv.unread > 0;
    if (activeCategory === "product") return matchesSearch && conv.productName;
    return matchesSearch;
  });

  const handleSendMessage = () => {
    if (!messageInput.trim()) return;
    const newMessage: Message = {
      id: Date.now().toString(),
      senderId: "me",
      content: messageInput,
      timestamp: new Date(),
      status: "sent",
      type: "text",
    };
    setMessages((prev) => [...prev, newMessage]);
    setMessageInput("");
    setShowAiSuggestions(false);
    setTimeout(() => {
      setMessages((prev) =>
        prev.map((m) => (m.id === newMessage.id ? { ...m, status: "delivered" as const } : m))
      );
    }, 1000);
  };

  const handleAiSuggestion = (text: string) => {
    setMessageInput(text);
    setShowAiSuggestions(false);
  };

  const handleFileAttach = () => fileInputRef.current?.click();
  const handleImageAttach = () => imageInputRef.current?.click();

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>, type: "file" | "image") => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    const newMessage: Message = {
      id: Date.now().toString(),
      senderId: "me",
      content: type === "image" ? "📷 Photo" : `📎 ${file.name}`,
      timestamp: new Date(),
      status: "sent",
      type,
      fileUrl: url,
      fileName: file.name,
    };
    setMessages((prev) => [...prev, newMessage]);
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
        const newMsg: Message = {
          id: Date.now().toString(),
          senderId: "me",
          content: "🎙️ Message vocal",
          timestamp: new Date(),
          status: "sent",
          type: "voice",
          fileUrl: url,
        };
        setMessages((prev) => [...prev, newMsg]);
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
    } catch {
      toast({ title: "Micro non disponible", description: "Autorisez l'accès au microphone", variant: "destructive" });
    }
  };

  const handleClearChat = () => {
    setMessages([]);
    toast({ title: "Conversation vidée" });
  };

  const handleBlockUser = () => {
    toast({ title: "Utilisateur bloqué", description: `${selectedConversation?.participant.name} a été bloqué` });
  };

  const getMessageStatus = (status: string) => {
    switch (status) {
      case "read": return <CheckCheck className="w-3 h-3 text-primary" />;
      case "delivered": return <CheckCheck className="w-3 h-3 text-muted-foreground" />;
      case "sent": return <Clock className="w-3 h-3 text-muted-foreground" />;
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col pb-14 lg:pb-0">
      <Header />
      <input ref={fileInputRef} type="file" className="hidden" onChange={(e) => handleFileSelected(e, "file")} />
      <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleFileSelected(e, "image")} />

      <main className="flex-1 flex overflow-hidden">
        <div className="w-full flex h-[calc(100vh-7.5rem)] lg:h-[calc(100vh-5rem)]">
          {/* Conversations List */}
          <div className={`w-full lg:w-96 border-r border-border flex flex-col bg-card ${selectedConversation ? "hidden lg:flex" : "flex"}`}>
            <div className="p-3 sm:p-4 border-b border-border space-y-3">
              <div className="flex items-center justify-between">
                <h1 className="font-heading text-lg font-bold text-foreground flex items-center gap-2">
                  <MessageCircle className="w-5 h-5 text-primary" />Messages
                </h1>
                <Badge className="bg-primary text-primary-foreground text-[10px]">
                  {mockConversations.reduce((a, c) => a + c.unread, 0)}
                </Badge>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Rechercher..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10 h-9 text-sm" />
              </div>
              <div className="flex gap-1.5">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategory(cat.id)}
                    className={`px-3 py-1 rounded-full text-[11px] font-medium transition-colors ${
                      activeCategory === cat.id
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {filteredConversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => setSelectedConversation(conv)}
                  className={`w-full p-3 flex items-start gap-3 hover:bg-muted/50 transition-colors border-b border-border text-left ${
                    selectedConversation?.id === conv.id ? "bg-primary/5" : ""
                  }`}
                >
                  <div className="relative flex-shrink-0">
                    <img src={conv.participant.avatar} alt="" className="w-11 h-11 rounded-full object-cover" />
                    {conv.participant.isOnline && <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-card" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="font-medium text-sm text-foreground truncate">{conv.participant.name}</span>
                      <span className="text-[10px] text-muted-foreground flex-shrink-0">{conv.timestamp}</span>
                    </div>
                    {conv.productName && (
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <img src={conv.productImage} alt="" className="w-4 h-4 rounded object-cover" />
                        <span className="text-[10px] text-primary font-medium truncate">{conv.productName}</span>
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground truncate">{conv.lastMessage}</p>
                  </div>
                  {conv.unread > 0 && (
                    <Badge className="bg-primary text-primary-foreground text-[10px] px-1.5 min-w-[20px] flex items-center justify-center flex-shrink-0">
                      {conv.unread}
                    </Badge>
                  )}
                </button>
              ))}
              {filteredConversations.length === 0 && (
                <div className="p-8 text-center">
                  <MessageCircle className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">Aucune conversation</p>
                </div>
              )}
            </div>
          </div>

          {/* Chat Area */}
          <div className={`flex-1 flex flex-col bg-background ${selectedConversation ? "flex" : "hidden lg:flex"}`}>
            {selectedConversation ? (
              <>
                {/* Chat Header */}
                <div className="p-2.5 sm:p-3 border-b border-border flex items-center gap-2 sm:gap-3 bg-card">
                  <button onClick={() => setSelectedConversation(null)} className="lg:hidden p-1.5 hover:bg-muted rounded-lg">
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <div className="relative flex-shrink-0">
                    <img src={selectedConversation.participant.avatar} alt="" className="w-9 h-9 rounded-full object-cover" />
                    {selectedConversation.participant.isOnline && <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-card" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="font-medium text-sm text-foreground truncate">{selectedConversation.participant.name}</h2>
                    <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                      {selectedConversation.participant.isOnline ? (
                        <><span className="w-1.5 h-1.5 bg-green-500 rounded-full" />En ligne</>
                      ) : "Hors ligne"}
                    </p>
                  </div>
                  {selectedConversation.productName && (
                    <Link to={`/produit/${selectedConversation.productId || selectedConversation.id}`} className="hidden sm:flex">
                      <Badge variant="outline" className="gap-1.5 cursor-pointer hover:bg-muted text-[10px]">
                        <img src={selectedConversation.productImage} alt="" className="w-4 h-4 rounded object-cover" />
                        {selectedConversation.productName}
                      </Badge>
                    </Link>
                  )}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {selectedConversation.productName && (
                        <DropdownMenuItem onClick={() => navigate(`/produit/${selectedConversation.productId || selectedConversation.id}`)}>
                          Voir le produit
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem onClick={() => navigate(`/producteurs/${selectedConversation.participant.name}`)}>
                        Voir le profil
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={handleClearChat}>Vider la conversation</DropdownMenuItem>
                      <DropdownMenuItem onClick={handleBlockUser} className="text-destructive">Bloquer</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Product context banner */}
                {selectedConversation.productName && (
                  <div className="px-3 py-1.5 bg-primary/5 border-b border-primary/10 flex items-center gap-2 sm:hidden">
                    <img src={selectedConversation.productImage} alt="" className="w-6 h-6 rounded object-cover" />
                    <span className="text-[11px] font-medium text-primary truncate">{selectedConversation.productName}</span>
                    <Link to={`/produit/${selectedConversation.productId || selectedConversation.id}`} className="ml-auto text-[10px] text-primary underline">Voir</Link>
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
                        msg.senderId === "me"
                          ? "bg-primary text-primary-foreground rounded-br-sm"
                          : "bg-card rounded-bl-sm"
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
                      <button onClick={() => setShowAiSuggestions(false)}>
                        <X className="w-3.5 h-3.5 text-muted-foreground" />
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {AI_QUICK_REPLIES.map((reply) => (
                        <button
                          key={reply.label}
                          onClick={() => handleAiSuggestion(reply.text)}
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
                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0" onClick={handleFileAttach}>
                      <Paperclip className="w-4 h-4 text-muted-foreground" />
                    </Button>
                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0" onClick={handleImageAttach}>
                      <ImageIcon className="w-4 h-4 text-muted-foreground" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 flex-shrink-0"
                      onClick={() => setShowAiSuggestions(!showAiSuggestions)}
                    >
                      <Sparkles className={`w-4 h-4 ${showAiSuggestions ? "text-primary" : "text-muted-foreground"}`} />
                    </Button>
                    <Input
                      value={messageInput}
                      onChange={(e) => setMessageInput(e.target.value)}
                      placeholder="Écrivez votre message..."
                      className="flex-1 h-9 text-sm"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className={`h-8 w-8 flex-shrink-0 ${isRecording ? "text-destructive animate-pulse" : ""}`}
                      onClick={toggleRecording}
                    >
                      {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4 text-muted-foreground" />}
                    </Button>
                    <Button type="submit" size="icon" className="h-8 w-8 bg-primary hover:bg-primary/90 flex-shrink-0" disabled={!messageInput.trim()}>
                      <Send className="w-3.5 h-3.5" />
                    </Button>
                  </form>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center bg-muted/10">
                <div className="text-center px-4">
                  <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <MessageCircle className="w-10 h-10 text-primary" />
                  </div>
                  <h3 className="font-heading text-lg font-semibold text-foreground mb-1">Vos messages</h3>
                  <p className="text-sm text-muted-foreground max-w-xs">
                    Sélectionnez une conversation pour discuter
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
      <MobileBottomNav />
    </div>
  );
};

export default Messages;
