import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import Header from "@/components/layout/Header";
import MobileBottomNav from "@/components/layout/MobileBottomNav";
import { Loader2, MessageCircle } from "lucide-react";
import { useConversations, type ConversationItem } from "@/hooks/useConversations";
import { useMessages } from "@/hooks/useMessages";
import ConversationList from "@/components/messages/ConversationList";
import ChatArea from "@/components/messages/ChatArea";

const Messages = () => {
  const [searchParams] = useSearchParams();
  const [selectedConversation, setSelectedConversation] = useState<ConversationItem | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { conversations, loading, profileId } = useConversations();
  const { messages, setMessages, sendMessage } = useMessages(
    selectedConversation?.id || null,
    profileId
  );

  // Auto-select conversation from URL params
  useEffect(() => {
    if (!conversations.length) return;
    const productId = searchParams.get("product");
    const sellerName = searchParams.get("seller");
    if (productId || sellerName) {
      const match = conversations.find(
        (c) =>
          c.productId === productId ||
          c.participant.name.toLowerCase() === sellerName?.toLowerCase()
      );
      if (match && match.id !== selectedConversation?.id) {
        setSelectedConversation(match);
      }
    }
  }, [conversations, searchParams]);

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleLocalMessage = (msg: any) => {
    setMessages((prev) => [...prev, msg]);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
        <MobileBottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col pb-14 lg:pb-0">
      <Header />
      <main className="flex-1 flex overflow-hidden">
        <div className="w-full flex h-[calc(100vh-7.5rem)] lg:h-[calc(100vh-5rem)]">
          <ConversationList
            conversations={conversations}
            selectedId={selectedConversation?.id || null}
            onSelect={setSelectedConversation}
            hidden={!!selectedConversation}
          />
          <div className={`flex-1 flex flex-col ${selectedConversation ? "flex" : "hidden lg:flex"}`}>
            <ChatArea
              conversation={selectedConversation}
              messages={messages}
              onBack={() => setSelectedConversation(null)}
              onSend={sendMessage}
              onLocalMessage={handleLocalMessage}
              messagesEndRef={messagesEndRef}
            />
          </div>
        </div>
      </main>
      <MobileBottomNav />
    </div>
  );
};

export default Messages;
