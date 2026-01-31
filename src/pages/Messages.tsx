import { useState } from "react";
import Header from "@/components/layout/Header";
import MobileBottomNav from "@/components/layout/MobileBottomNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Search, 
  MessageCircle, 
  Send, 
  ArrowLeft,
  User,
  Phone,
  MoreVertical
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
}

interface Message {
  id: string;
  senderId: string;
  content: string;
  timestamp: Date;
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
  },
  {
    id: "2",
    participant: {
      name: "Ama Koffi",
      avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100",
      isOnline: false,
    },
    lastMessage: "Merci pour votre achat !",
    timestamp: "Hier",
    unread: 0,
    productName: "Tomates Fraîches",
  },
  {
    id: "3",
    participant: {
      name: "Yao Agbeko",
      avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100",
      isOnline: true,
    },
    lastMessage: "Les ignames seront disponibles la semaine prochaine.",
    timestamp: "Lun",
    unread: 0,
  },
];

const Messages = () => {
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [messageInput, setMessageInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    { id: "1", senderId: "other", content: "Bonjour ! Votre commande de maïs est en préparation.", timestamp: new Date(Date.now() - 3600000) },
    { id: "2", senderId: "me", content: "Merci ! Quand sera-t-elle prête ?", timestamp: new Date(Date.now() - 3000000) },
    { id: "3", senderId: "other", content: "D'accord, je prépare votre commande de maïs.", timestamp: new Date(Date.now() - 1800000) },
  ]);

  const filteredConversations = conversations.filter((conv) =>
    conv.participant.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSendMessage = () => {
    if (!messageInput.trim()) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      senderId: "me",
      content: messageInput,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, newMessage]);
    setMessageInput("");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col pb-16 lg:pb-0">
      <Header />

      <main className="flex-1 pt-20 lg:pt-24 flex">
        <div className="container mx-auto px-0 lg:px-4 flex flex-1">
          <div className="flex w-full h-[calc(100vh-5rem)] lg:h-[calc(100vh-6rem)]">
            {/* Conversations List */}
            <div
              className={`w-full lg:w-80 border-r border-border flex flex-col ${
                selectedConversation ? "hidden lg:flex" : "flex"
              }`}
            >
              {/* Header */}
              <div className="p-4 border-b border-border">
                <h1 className="font-heading text-xl font-bold text-foreground mb-4 flex items-center gap-2">
                  <MessageCircle className="w-5 h-5 text-primary" />
                  Messages
                </h1>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Rechercher..."
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
                      className={`w-full p-4 flex items-start gap-3 hover:bg-muted transition-colors border-b border-border text-left ${
                        selectedConversation?.id === conv.id ? "bg-muted" : ""
                      }`}
                    >
                      <div className="relative">
                        <img
                          src={conv.participant.avatar}
                          alt={conv.participant.name}
                          className="w-12 h-12 rounded-full object-cover"
                        />
                        {conv.participant.isOnline && (
                          <div className="absolute bottom-0 right-0 w-3 h-3 bg-primary rounded-full border-2 border-card" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-foreground truncate">
                            {conv.participant.name}
                          </span>
                          <span className="text-xs text-muted-foreground">{conv.timestamp}</span>
                        </div>
                        {conv.productName && (
                          <Badge variant="secondary" className="text-[10px] mb-1">
                            {conv.productName}
                          </Badge>
                        )}
                        <p className="text-sm text-muted-foreground truncate">{conv.lastMessage}</p>
                      </div>
                      {conv.unread > 0 && (
                        <Badge className="bg-primary text-primary-foreground text-xs px-2">
                          {conv.unread}
                        </Badge>
                      )}
                    </button>
                  ))
                ) : (
                  <div className="p-8 text-center">
                    <MessageCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">Aucune conversation</p>
                  </div>
                )}
              </div>
            </div>

            {/* Chat Area */}
            <div
              className={`flex-1 flex flex-col ${
                selectedConversation ? "flex" : "hidden lg:flex"
              }`}
            >
              {selectedConversation ? (
                <>
                  {/* Chat Header */}
                  <div className="p-4 border-b border-border flex items-center gap-3">
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
                        <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-primary rounded-full border-2 border-card" />
                      )}
                    </div>
                    <div className="flex-1">
                      <h2 className="font-medium text-foreground">
                        {selectedConversation.participant.name}
                      </h2>
                      <p className="text-xs text-muted-foreground">
                        {selectedConversation.participant.isOnline ? "En ligne" : "Hors ligne"}
                      </p>
                    </div>
                    <Button variant="ghost" size="icon">
                      <Phone className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </div>

                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex ${msg.senderId === "me" ? "justify-end" : "justify-start"}`}
                      >
                        <Card
                          className={`max-w-[80%] p-3 ${
                            msg.senderId === "me"
                              ? "bg-primary text-primary-foreground"
                              : "bg-card"
                          }`}
                        >
                          <p className="text-sm">{msg.content}</p>
                          <span className="text-[10px] opacity-70 mt-1 block">
                            {msg.timestamp.toLocaleTimeString("fr-FR", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </Card>
                      </div>
                    ))}
                  </div>

                  {/* Input */}
                  <div className="p-4 border-t border-border">
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        handleSendMessage();
                      }}
                      className="flex gap-2"
                    >
                      <Input
                        value={messageInput}
                        onChange={(e) => setMessageInput(e.target.value)}
                        placeholder="Écrivez votre message..."
                        className="flex-1"
                      />
                      <Button type="submit" variant="hero" size="icon">
                        <Send className="w-4 h-4" />
                      </Button>
                    </form>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                      <MessageCircle className="w-10 h-10 text-muted-foreground" />
                    </div>
                    <h3 className="font-heading text-lg font-semibold text-foreground mb-2">
                      Vos messages
                    </h3>
                    <p className="text-muted-foreground">
                      Sélectionnez une conversation pour commencer
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
