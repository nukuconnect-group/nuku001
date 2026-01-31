import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Bell, ShoppingCart, MessageCircle, Package, Check } from "lucide-react";
import { Link } from "react-router-dom";

interface Notification {
  id: string;
  type: "order" | "message" | "system";
  title: string;
  description: string;
  time: string;
  read: boolean;
}

const mockNotifications: Notification[] = [
  {
    id: "1",
    type: "order",
    title: "Nouvelle commande",
    description: "Jean Dupont a commandé 50kg de Maïs",
    time: "Il y a 5 min",
    read: false,
  },
  {
    id: "2",
    type: "message",
    title: "Nouveau message",
    description: "Kofi Mensah vous a envoyé un message",
    time: "Il y a 30 min",
    read: false,
  },
  {
    id: "3",
    type: "system",
    title: "Produit épuisé",
    description: "Votre stock de Tomates est épuisé",
    time: "Il y a 2h",
    read: true,
  },
];

const NotificationBell = () => {
  const [notifications, setNotifications] = useState(mockNotifications);

  const unreadCount = notifications.filter(n => !n.read).length;

  const getIcon = (type: string) => {
    switch (type) {
      case "order":
        return <ShoppingCart className="w-4 h-4 text-primary" />;
      case "message":
        return <MessageCircle className="w-4 h-4 text-accent-foreground" />;
      default:
        return <Package className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const markAllAsRead = () => {
    setNotifications(notifications.map(n => ({ ...n, read: true })));
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <Badge className="absolute -top-1 -right-1 w-5 h-5 p-0 flex items-center justify-center text-[10px] bg-destructive">
              {unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notifications</span>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" className="text-xs h-auto py-1" onClick={markAllAsRead}>
              <Check className="w-3 h-3 mr-1" />
              Tout marquer comme lu
            </Button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {notifications.length === 0 ? (
          <div className="py-8 text-center">
            <Bell className="w-8 h-8 mx-auto text-muted-foreground/50 mb-2" />
            <p className="text-sm text-muted-foreground">Aucune notification</p>
          </div>
        ) : (
          notifications.map((notification) => (
            <DropdownMenuItem key={notification.id} className="flex items-start gap-3 p-3 cursor-pointer">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${notification.read ? 'bg-muted' : 'bg-primary/10'}`}>
                {getIcon(notification.type)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className={`text-sm font-medium ${notification.read ? 'text-muted-foreground' : 'text-foreground'}`}>
                    {notification.title}
                  </p>
                  {!notification.read && (
                    <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
                  )}
                </div>
                <p className="text-xs text-muted-foreground truncate">{notification.description}</p>
                <p className="text-[10px] text-muted-foreground mt-1">{notification.time}</p>
              </div>
            </DropdownMenuItem>
          ))
        )}
        <DropdownMenuSeparator />
        <Link to="/notifications">
          <DropdownMenuItem className="text-center text-primary cursor-pointer justify-center">
            Voir toutes les notifications
          </DropdownMenuItem>
        </Link>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default NotificationBell;
