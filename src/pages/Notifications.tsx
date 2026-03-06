import { useState } from "react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import MobileBottomNav from "@/components/layout/MobileBottomNav";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bell, ShoppingCart, MessageCircle, Package, Check, Trash2 } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface Notification {
  id: string;
  type: "order" | "message" | "system";
  title: string;
  description: string;
  time: string;
  read: boolean;
}

const mockNotifications: Notification[] = [
  { id: "1", type: "order", title: "Nouvelle commande", description: "Jean Dupont a commandé 50kg de Maïs", time: "Il y a 5 min", read: false },
  { id: "2", type: "message", title: "Nouveau message", description: "Kofi Mensah vous a envoyé un message", time: "Il y a 30 min", read: false },
  { id: "3", type: "system", title: "Produit épuisé", description: "Votre stock de Tomates est épuisé", time: "Il y a 2h", read: true },
  { id: "4", type: "order", title: "Commande livrée", description: "Votre commande de Riz a été livrée avec succès", time: "Il y a 1 jour", read: true },
  { id: "5", type: "system", title: "Bienvenue sur NukuConnect", description: "Découvrez toutes les fonctionnalités de la plateforme", time: "Il y a 3 jours", read: true },
];

const Notifications = () => {
  const [notifications, setNotifications] = useState(mockNotifications);
  const { t } = useLanguage();

  const unreadCount = notifications.filter(n => !n.read).length;

  const getIcon = (type: string) => {
    switch (type) {
      case "order": return <ShoppingCart className="w-5 h-5 text-primary" />;
      case "message": return <MessageCircle className="w-5 h-5 text-blue-500" />;
      default: return <Package className="w-5 h-5 text-muted-foreground" />;
    }
  };

  const markAllAsRead = () => {
    setNotifications(notifications.map(n => ({ ...n, read: true })));
  };

  const deleteNotification = (id: string) => {
    setNotifications(notifications.filter(n => n.id !== id));
  };

  return (
    <div className="min-h-screen bg-background pb-14 lg:pb-0">
      <Header />
      <main>
        <div className="container mx-auto px-3 sm:px-4 py-6">
          <div className="max-w-2xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Bell className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h1 className="font-heading text-lg sm:text-xl font-bold text-foreground">Notifications</h1>
                  <p className="text-xs text-muted-foreground">{unreadCount} non lue(s)</p>
                </div>
              </div>
              {unreadCount > 0 && (
                <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={markAllAsRead}>
                  <Check className="w-3.5 h-3.5" />Tout marquer comme lu
                </Button>
              )}
            </div>

            <div className="space-y-2">
              {notifications.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <Bell className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">Aucune notification</p>
                  </CardContent>
                </Card>
              ) : (
                notifications.map((notif) => (
                  <Card key={notif.id} className={`transition-all ${!notif.read ? "border-primary/20 bg-primary/5" : ""}`}>
                    <CardContent className="p-3 sm:p-4">
                      <div className="flex items-start gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                          notif.read ? "bg-muted" : "bg-primary/10"
                        }`}>
                          {getIcon(notif.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className={`text-sm font-medium ${notif.read ? "text-muted-foreground" : "text-foreground"}`}>
                              {notif.title}
                            </p>
                            {!notif.read && <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">{notif.description}</p>
                          <p className="text-[10px] text-muted-foreground mt-1">{notif.time}</p>
                        </div>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive flex-shrink-0"
                          onClick={() => deleteNotification(notif.id)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>
        </div>
      </main>
      <Footer />
      <MobileBottomNav />
    </div>
  );
};

export default Notifications;
