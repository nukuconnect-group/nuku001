import { useState } from "react";
import { Search, MessageCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { type ConversationItem } from "@/hooks/useConversations";

const SORT_OPTIONS = [
  { id: "recent", label: "Récents" },
  { id: "unread", label: "Non lus" },
  { id: "achat", label: "🛒 Achats" },
  { id: "vente", label: "💰 Ventes" },
  { id: "delivery", label: "🚚 Livraison" },
  { id: "oldest", label: "Anciens" },
];

interface Props {
  conversations: ConversationItem[];
  selectedId: string | null;
  onSelect: (conv: ConversationItem) => void;
  hidden?: boolean;
}

export default function ConversationList({ conversations, selectedId, onSelect, hidden }: Props) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("recent");

  const filtered = conversations
    .filter((conv) => {
      const matchesSearch =
        conv.participant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        conv.productName?.toLowerCase().includes(searchQuery.toLowerCase());
      if (activeCategory === "unread") return matchesSearch && conv.unread > 0;
      if (activeCategory === "achat") return matchesSearch && conv.category === "achat";
      if (activeCategory === "vente") return matchesSearch && conv.category === "vente";
      if (activeCategory === "delivery") return matchesSearch && (conv.isDelivery || conv.category === "livraison");
      return matchesSearch;
    })
    .sort((a, b) => {
      if (activeCategory === "oldest") return 0;
      return 0;
    });

  const sortedFiltered = activeCategory === "oldest" ? [...filtered].reverse() : filtered;

  const totalUnread = conversations.reduce((a, c) => a + c.unread, 0);

  return (
    <div className={`w-full lg:w-96 border-r border-border flex flex-col bg-card ${hidden ? "hidden lg:flex" : "flex"}`}>
      <div className="p-3 sm:p-4 border-b border-border space-y-3">
        <div className="flex items-center justify-between">
          <h1 className="font-heading text-lg font-bold text-foreground flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-primary" />Messages
          </h1>
          {totalUnread > 0 && (
            <Badge className="bg-primary text-primary-foreground text-[10px]">{totalUnread}</Badge>
          )}
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Rechercher..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10 h-9 text-sm" />
        </div>
        <div className="flex gap-1.5 overflow-x-auto scrollbar-hide">
          {SORT_OPTIONS.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-3 py-1 rounded-full text-[11px] font-medium transition-colors whitespace-nowrap ${
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
        {sortedFiltered.map((conv) => (
          <button
            key={conv.id}
            onClick={() => onSelect(conv)}
            className={`w-full p-3 flex items-start gap-3 hover:bg-muted/50 transition-colors border-b border-border text-left ${
              selectedId === conv.id ? "bg-primary/5" : ""
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
              {conv.isDelivery || conv.category === "livraison" ? (
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="text-[10px] font-medium text-orange-600 dark:text-orange-400 truncate">🚚 Chat livraison</span>
                </div>
              ) : conv.category === "achat" ? (
                <div className="flex items-center gap-1.5 mb-0.5">
                  {conv.productImage && <img src={conv.productImage} alt="" className="w-4 h-4 rounded object-cover" />}
                  <span className="text-[10px] text-primary font-medium truncate">🛒 {conv.productName}</span>
                </div>
              ) : conv.category === "vente" ? (
                <div className="flex items-center gap-1.5 mb-0.5">
                  {conv.productImage && <img src={conv.productImage} alt="" className="w-4 h-4 rounded object-cover" />}
                  <span className="text-[10px] font-medium truncate text-green-600 dark:text-green-400">💰 {conv.productName}</span>
                </div>
              ) : conv.productName ? (
                <div className="flex items-center gap-1.5 mb-0.5">
                  {conv.productImage && <img src={conv.productImage} alt="" className="w-4 h-4 rounded object-cover" />}
                  <span className="text-[10px] text-primary font-medium truncate">{conv.productName}</span>
                </div>
              ) : null}
              <p className="text-xs text-muted-foreground truncate">{conv.lastMessage}</p>
            </div>
            {conv.unread > 0 && (
              <Badge className="bg-primary text-primary-foreground text-[10px] px-1.5 min-w-[20px] flex items-center justify-center flex-shrink-0">
                {conv.unread}
              </Badge>
            )}
          </button>
        ))}
        {sortedFiltered.length === 0 && (
          <div className="p-8 text-center">
            <MessageCircle className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Aucune conversation</p>
          </div>
        )}
      </div>
    </div>
  );
}
