import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/layout/Header";
import MobileBottomNav from "@/components/layout/MobileBottomNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  Search, 
  MessageCircle, 
  Send, 
  ArrowLeft,
  Phone,
  MoreVertical,
  Image,
  Paperclip,
  Smile,
  CheckCheck,
  Clock
} from "lucide-react";

interface Conversation {
  id: string;
  participant: {
    name: string;
    avatar: string;
    isOnline: boolean;
  };
  lastMessage: string;
  timestamp: string;
  unread: number;
  productName?: string;
  productImage?: string;
}

interface Message {
  id: string;
  senderId: string;
  content: string;
  timestamp: Date;
  status: "sent" | "delivered" | "read";
}

const conversations: Conversation[] = [
  {
    id: "1",
    participant: {
      name: "Kofi Mensah",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100",
      isOnline: true,
    },
    lastMessage: "D'accord, je prépare votre commande de maïs.",
    timestamp: "10:30",
    unread: 2,
    productName: "Maïs Jaune Premium",
    productImage: "https://images.unsplash.com/photo-1551754655-cd27e38d2076?w=100",
  },
  {
    id: "2",
    participant: {
      name: "Ama Koffi",
      avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100",
      isOnline: false,
    },
    lastMessage: "Merci pour votre achat ! J'espère que vous êtes satisfait.",
    timestamp: "Hier",
    unread: 0,
    productName: "Tomates Fraîches",
    productImage: "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=100",
  },
  {
    id: "3",
    participant: {
      name: "Yao Agbeko",
      avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100",
      isOnline: true,
    },
    lastMessage: "Les ignames seront disponibles la semaine prochaine. Je vous tiendrai informé.",
    timestamp: "Lun",
    unread: 0,
    productName: "Ignames Blancs",
    productImage: "https://images.unsplash.com/photo-1590165482129-1b8b27698780?w=100",
  },
  {
    id: "4",
    participant: {
      name: "Akossiwa Dosseh",
      avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100",
      isOnline: false,
    },
    lastMessage: "Oui, nous livrons dans toute la région de Sokodé.",
    timestamp: "Sam",
    unread: 0,
    productName: "Mangues Kent",
    productImage: "https://images.unsplash.com/photo-1553279768-865429fa0078?w=100",
  },
];

const Messages = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [messageInput, setMessageInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    { id: "1", senderId: "other", content: "Bonjour ! Votre commande de maïs est en préparation.", timestamp: new Date(Date.now() - 3600000), status: "read" },
    { id: "2", senderId: "me", content: "Merci ! Quand sera-t-elle prête ?", timestamp: new Date(Date.now() - 3000000), status: "read" },
    { id: "3", senderId: "other", content: "D'accord, je prépare votre commande de maïs. Elle sera prête demain matin.", timestamp: new Date(Date.now() - 1800000), status: "read" },
    { id: "4", senderId: "me", content: "Parfait, merci beaucoup !", timestamp: new Date(Date.now() - 900000), status: "delivered" },
  ]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });
  }, []);

  const filteredConversations = conversations.filter((conv) =>
    conv.participant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.productName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSendMessage = () => {
    if (!messageInput.trim()) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      senderId: "me",
      content: messageInput,
      timestamp: new Date(),
      status: "sent",
    };

    setMessages((prev) => [...prev, newMessage]);
    setMessageInput("");

    // Simulate message being delivered
    setTimeout(() => {
      setMessages((prev) => 
        prev.map((m) => m.id === newMessage.id ? { ...m, status: "delivered" as const } : m)
      );
    }, 1000);
  };

  const getMessageStatus = (status: string) => {
    switch (status) {
      case "read":
        return <CheckCheck className="w-3 h-3 text-primary" />;
      case "delivered":
        return <CheckCheck className="w-3 h-3 text-muted-foreground" />;
      case "sent":
        return <Clock className="w-3 h-3 text-muted-foreground" />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col pb-16 lg:pb-0">
      <Header />

      <main className="flex-1 pt-20 lg:pt-24 flex">
        <div className="container mx-auto px-0 lg:px-4 flex flex-1">
          <div className="flex w-full h-[calc(100vh-5rem)] lg:h-[calc(100vh-6rem)]">
            {/* Conversations List */}
            <div
              className={`w-full lg:w-96 border-r border-border flex flex-col bg-card ${
                selectedConversation ? "hidden lg:flex" : "flex"
              }`}
            >
              {/* Header */}
              <div className="p-4 border-b border-border">
                <h1 className="font-heading text-xl font-bold text-foreground mb-4 flex items-center gap-2">
                  <MessageCircle className="w-5 h-5 text-primary" />
                  Messages
                  <Badge className="ml-auto bg-primary text-primary-foreground">
                    {conversations.reduce((acc, c) => acc + c.unread, 0)} nouveaux
                  </Badge>
                </h1>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Rechercher une conversation..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Conversations */}
              <div className="flex-1 overflow-y-auto">
                {filteredConversations.length > 0 ? (
                  filteredConversations.map((conv) => (
                    <button
                      key={conv.id}
                      onClick={() => setSelectedConversation(conv)}
                      className={`w-full p-4 flex items-start gap-3 hover:bg-muted/50 transition-colors border-b border-border text-left ${
                        selectedConversation?.id === conv.id ? "bg-muted" : ""
                      }`}
                    >
                      <div className="relative flex-shrink-0">
                        <img
                          src={conv.participant.avatar}
                          alt={conv.participant.name}
                          className="w-12 h-12 rounded-full object-cover"
                        />
                        {conv.participant.isOnline && (
                          <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-card" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-foreground truncate">
                            {conv.participant.name}
                          </span>
                          <span className="text-xs text-muted-foreground flex-shrink-0">{conv.timestamp}</span>
                        </div>
                        {conv.productName && (
                          <div className="flex items-center gap-2 mb-1">
                            <img src={conv.productImage} alt="" className="w-5 h-5 rounded object-cover" />
                            <Badge variant="secondary" className="text-[10px] font-normal">
                              {conv.productName}
                            </Badge>
                          </div>
                        )}
                        <p className="text-sm text-muted-foreground truncate">{conv.lastMessage}</p>
                      </div>
                      {conv.unread > 0 && (
                        <Badge className="bg-primary text-primary-foreground text-xs px-2 flex-shrink-0">
                          {conv.unread}
                        </Badge>
                      )}
                    </button>
                  ))
                ) : (
                  <div className="p-8 text-center">
                    <MessageCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">Aucune conversation trouvée</p>
                  </div>
                )}
              </div>
            </div>

            {/* Chat Area */}
            <div
              className={`flex-1 flex flex-col bg-background ${
                selectedConversation ? "flex" : "hidden lg:flex"
              }`}
            >
              {selectedConversation ? (
                <>
                  {/* Chat Header */}
                  <div className="p-4 border-b border-border flex items-center gap-3 bg-card">
                    <button
                      onClick={() => setSelectedConversation(null)}
                      className="lg:hidden p-2 hover:bg-muted rounded-lg"
                    >
                      <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div className="relative">
                      <img
                        src={selectedConversation.participant.avatar}
                        alt={selectedConversation.participant.name}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                      {selectedConversation.participant.isOnline && (
                        <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-card" />
                      )}
                    </div>
                    <div className="flex-1">
                      <h2 className="font-medium text-foreground">
                        {selectedConversation.participant.name}
                      </h2>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        {selectedConversation.participant.isOnline ? (
                          <><span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span> En ligne</>
                        ) : (
                          "Hors ligne"
                        )}
                      </p>
                    </div>
                    {selectedConversation.productName && (
                      <Link to={`/produit/${selectedConversation.id}`}>
                        <Badge variant="outline" className="gap-2 cursor-pointer hover:bg-muted">
                          <img src={selectedConversation.productImage} alt="" className="w-4 h-4 rounded object-cover" />
                          {selectedConversation.productName}
                        </Badge>
                      </Link>
                    )}
                    <Button variant="ghost" size="icon">
                      <Phone className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </div>

                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-muted/30">
                    {/* Date separator */}
                    <div className="flex items-center justify-center">
                      <span className="text-xs text-muted-foreground bg-muted px-3 py-1 rounded-full">
                        Aujourd'hui
                      </span>
                    </div>
                    
                    {messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex ${msg.senderId === "me" ? "justify-end" : "justify-start"}`}
                      >
                        <Card
                          className={`max-w-[80%] p-3 shadow-sm ${
                            msg.senderId === "me"
                              ? "bg-primary text-primary-foreground rounded-br-sm"
                              : "bg-card rounded-bl-sm"
                          }`}
                        >
                          <p className="text-sm leading-relaxed">{msg.content}</p>
                          <div className={`flex items-center gap-1 mt-1 ${msg.senderId === "me" ? "justify-end" : ""}`}>
                            <span className="text-[10px] opacity-70">
                              {msg.timestamp.toLocaleTimeString("fr-FR", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                            {msg.senderId === "me" && getMessageStatus(msg.status)}
                          </div>
                        </Card>
                      </div>
                    ))}
                  </div>

                  {/* Input */}
                  <div className="p-4 border-t border-border bg-card">
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        handleSendMessage();
                      }}
                      className="flex items-center gap-2"
                    >
                      <Button type="button" variant="ghost" size="icon" className="flex-shrink-0">
                        <Paperclip className="w-5 h-5 text-muted-foreground" />
                      </Button>
                      <Button type="button" variant="ghost" size="icon" className="flex-shrink-0">
                        <Image className="w-5 h-5 text-muted-foreground" />
                      </Button>
                      <Input
                        value={messageInput}
                        onChange={(e) => setMessageInput(e.target.value)}
                        placeholder="Écrivez votre message..."
                        className="flex-1"
                      />
                      <Button type="button" variant="ghost" size="icon" className="flex-shrink-0">
                        <Smile className="w-5 h-5 text-muted-foreground" />
                      </Button>
                      <Button type="submit" variant="hero" size="icon" disabled={!messageInput.trim()}>
                        <Send className="w-4 h-4" />
                      </Button>
                    </form>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center bg-muted/20">
                  <div className="text-center">
                    <div className="w-24 h-24 rounded-full bg-gradient-hero/20 flex items-center justify-center mx-auto mb-6">
                      <MessageCircle className="w-12 h-12 text-primary" />
                    </div>
                    <h3 className="font-heading text-xl font-semibold text-foreground mb-2">
                      Vos messages
                    </h3>
                    <p className="text-muted-foreground max-w-sm">
                      Sélectionnez une conversation pour voir les messages et discuter avec les vendeurs ou acheteurs
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <MobileBottomNav />
    </div>
  );
};

export default Messages;
