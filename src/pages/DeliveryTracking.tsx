import { useState } from "react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import MobileBottomNav from "@/components/layout/MobileBottomNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Truck, Package, MapPin, Clock, CheckCircle2, Search, Phone, AlertCircle } from "lucide-react";

interface DeliveryStep {
  status: "done" | "current" | "pending";
  title: string;
  description: string;
  time?: string;
}

const mockDeliveries = [
  {
    id: "LIV-2025-001",
    product: "Maïs Jaune Premium",
    seller: "Kofi Mensah",
    status: "in-transit" as const,
    estimatedDelivery: "5 Mars 2026",
    origin: "Kara, Togo",
    destination: "Lomé, Togo",
    carrier: "Gozem Express",
    steps: [
      { status: "done" as const, title: "Commande confirmée", description: "Paiement validé", time: "1 Mars, 08:30" },
      { status: "done" as const, title: "Préparation", description: "Produit emballé par le producteur", time: "2 Mars, 10:00" },
      { status: "current" as const, title: "En transit", description: "En route vers Lomé via Gozem Express", time: "3 Mars, 06:00" },
      { status: "pending" as const, title: "Livraison", description: "Livraison prévue à votre adresse" },
    ],
  },
  {
    id: "LIV-2025-002",
    product: "Tomates Fraîches Bio",
    seller: "Ama Koffi",
    status: "delivered" as const,
    estimatedDelivery: "28 Fév 2026",
    origin: "Lomé, Togo",
    destination: "Lomé, Togo",
    carrier: "DHL Africa",
    steps: [
      { status: "done" as const, title: "Commande confirmée", description: "Paiement validé", time: "25 Fév, 14:00" },
      { status: "done" as const, title: "Préparation", description: "Produit emballé", time: "26 Fév, 09:00" },
      { status: "done" as const, title: "En transit", description: "Livré via DHL Africa", time: "27 Fév, 08:00" },
      { status: "done" as const, title: "Livré", description: "Reçu par le client", time: "28 Fév, 11:30" },
    ],
  },
];

const DeliveryTracking = () => {
  const [trackingCode, setTrackingCode] = useState("");
  const [selectedDelivery, setSelectedDelivery] = useState(mockDeliveries[0]);

  const handleSearch = () => {
    const found = mockDeliveries.find(d => d.id === trackingCode.toUpperCase());
    if (found) setSelectedDelivery(found);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "delivered": return "bg-primary text-primary-foreground";
      case "in-transit": return "bg-blue-500 text-white";
      case "preparing": return "bg-accent text-accent-foreground";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "delivered": return "Livré";
      case "in-transit": return "En transit";
      case "preparing": return "Préparation";
      default: return status;
    }
  };

  return (
    <div className="min-h-screen bg-background pb-14 lg:pb-0">
      <Header />

      <section className="py-6 sm:py-10 bg-muted/30 border-b border-border">
        <div className="container mx-auto px-3 sm:px-4">
          <div className="max-w-2xl mx-auto text-center">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Truck className="w-6 h-6 text-primary" />
            </div>
            <h1 className="font-heading text-xl sm:text-2xl lg:text-3xl font-bold text-foreground mb-2">
              Suivre ma livraison
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mb-4">
              Entrez votre numéro de suivi pour connaître le statut de votre commande
            </p>
            <div className="flex gap-2 max-w-md mx-auto">
              <Input
                placeholder="Ex: LIV-2025-001"
                value={trackingCode}
                onChange={(e) => setTrackingCode(e.target.value.toUpperCase())}
                className="h-10 text-sm"
              />
              <Button variant="hero" onClick={handleSearch} className="gap-1.5">
                <Search className="w-4 h-4" />Suivre
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground mt-2">Essayez: LIV-2025-001 ou LIV-2025-002</p>
          </div>
        </div>
      </section>

      <section className="py-6 sm:py-8">
        <div className="container mx-auto px-3 sm:px-4 max-w-4xl">
          {/* Recent deliveries */}
          <h2 className="font-heading text-sm sm:text-base font-bold mb-4">Mes livraisons</h2>
          <div className="grid sm:grid-cols-2 gap-3 mb-6">
            {mockDeliveries.map((delivery) => (
              <Card key={delivery.id} className={`cursor-pointer transition-all hover:shadow-elevated ${selectedDelivery.id === delivery.id ? "ring-2 ring-primary" : ""}`}
                onClick={() => setSelectedDelivery(delivery)}>
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-semibold text-sm text-foreground">{delivery.product}</p>
                      <p className="text-[10px] text-muted-foreground font-mono">{delivery.id}</p>
                    </div>
                    <Badge className={`${getStatusColor(delivery.status)} text-[10px]`}>
                      {getStatusLabel(delivery.status)}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                    <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{delivery.origin}</span>
                    <span>→</span>
                    <span>{delivery.destination}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Selected delivery details */}
          {selectedDelivery && (
            <Card>
              <CardHeader className="p-4 sm:p-6 pb-2 sm:pb-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <CardTitle className="text-base sm:text-lg">{selectedDelivery.product}</CardTitle>
                    <p className="text-xs text-muted-foreground">Vendeur: {selectedDelivery.seller} • {selectedDelivery.carrier}</p>
                  </div>
                  <Badge className={`${getStatusColor(selectedDelivery.status)} self-start`}>
                    {getStatusLabel(selectedDelivery.status)}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 pt-2 sm:pt-3">
                {/* Route info */}
                <div className="grid grid-cols-2 gap-3 mb-6 p-3 bg-muted/50 rounded-xl">
                  <div>
                    <p className="text-[10px] text-muted-foreground">Origine</p>
                    <p className="text-xs font-medium flex items-center gap-1"><MapPin className="w-3 h-3 text-primary" />{selectedDelivery.origin}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground">Destination</p>
                    <p className="text-xs font-medium flex items-center gap-1"><MapPin className="w-3 h-3 text-destructive" />{selectedDelivery.destination}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground">Livraison estimée</p>
                    <p className="text-xs font-medium flex items-center gap-1"><Clock className="w-3 h-3" />{selectedDelivery.estimatedDelivery}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground">Transporteur</p>
                    <p className="text-xs font-medium flex items-center gap-1"><Truck className="w-3 h-3" />{selectedDelivery.carrier}</p>
                  </div>
                </div>

                {/* Timeline */}
                <h3 className="font-heading font-semibold text-sm mb-4">Historique de suivi</h3>
                <div className="space-y-0">
                  {selectedDelivery.steps.map((step, i) => (
                    <div key={i} className="flex gap-3 relative">
                      <div className="flex flex-col items-center">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                          step.status === "done" ? "bg-primary text-primary-foreground" :
                          step.status === "current" ? "bg-blue-500 text-white animate-pulse" :
                          "bg-muted text-muted-foreground"
                        }`}>
                          {step.status === "done" ? <CheckCircle2 className="w-3.5 h-3.5" /> :
                           step.status === "current" ? <Truck className="w-3.5 h-3.5" /> :
                           <Clock className="w-3.5 h-3.5" />}
                        </div>
                        {i < selectedDelivery.steps.length - 1 && (
                          <div className={`w-0.5 h-10 ${step.status === "done" ? "bg-primary" : "bg-border"}`} />
                        )}
                      </div>
                      <div className="pb-6">
                        <p className="text-sm font-medium text-foreground">{step.title}</p>
                        <p className="text-xs text-muted-foreground">{step.description}</p>
                        {step.time && <p className="text-[10px] text-muted-foreground mt-0.5">{step.time}</p>}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2 mt-4">
                  <Button variant="outline" size="sm" className="gap-1.5 text-xs flex-1">
                    <Phone className="w-3.5 h-3.5" />Contacter le transporteur
                  </Button>
                  <Button variant="outline" size="sm" className="gap-1.5 text-xs flex-1">
                    <AlertCircle className="w-3.5 h-3.5" />Signaler un problème
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </section>

      <Footer />
      <MobileBottomNav />
    </div>
  );
};

export default DeliveryTracking;
