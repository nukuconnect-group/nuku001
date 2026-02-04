import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import MobileBottomNav from "@/components/layout/MobileBottomNav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { useCart } from "@/components/cart/CartContext";
import { useToast } from "@/hooks/use-toast";
import { 
  ShoppingCart, 
  Trash2, 
  Plus, 
  Minus, 
  Truck, 
  MapPin, 
  Package,
  CreditCard,
  ArrowLeft,
  Store
} from "lucide-react";

const deliveryOptions = [
  {
    id: "pickup",
    name: "Retrait sur place",
    description: "Récupérez chez le producteur",
    price: 0,
    icon: Store,
    tag: "Gratuit",
  },
  {
    id: "gozem",
    name: "Gozem Livraison",
    description: "Livraison nationale (Togo)",
    price: 1500,
    icon: Truck,
    tag: "National",
  },
  {
    id: "standard",
    name: "Livraison Standard",
    description: "3-5 jours ouvrables",
    price: 2500,
    icon: Package,
    tag: "Économique",
  },
  {
    id: "dhl",
    name: "DHL Express",
    description: "International - 2-5 jours",
    price: 15000,
    icon: Package,
    tag: "International",
  },
];

const Cart = () => {
  const { items, removeItem, updateQuantity, clearCart, total, itemCount } = useCart();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [deliveryMethod, setDeliveryMethod] = useState("pickup");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [deliveryCity, setDeliveryCity] = useState("");

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("fr-FR").format(price);
  };

  const selectedDelivery = deliveryOptions.find(d => d.id === deliveryMethod);
  const deliveryPrice = selectedDelivery?.price || 0;
  const finalTotal = total + deliveryPrice;

  const handleCheckout = () => {
    if (deliveryMethod !== "pickup" && (!deliveryAddress || !deliveryCity)) {
      toast({
        title: "Adresse requise",
        description: "Veuillez entrer votre adresse de livraison",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Commande envoyée !",
      description: "Votre commande a été transmise aux vendeurs. Vous serez contacté sous peu.",
    });
    clearCart();
    navigate("/buyer-dashboard");
  };

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-background pb-20 lg:pb-0">
        <Header />
        <main className="pt-24 lg:pt-28">
          <div className="container mx-auto px-4 py-12">
            <div className="text-center">
              <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center mx-auto mb-6">
                <ShoppingCart className="w-10 h-10 text-muted-foreground" />
              </div>
              <h1 className="font-heading text-2xl font-bold text-foreground mb-2">
                Votre panier est vide
              </h1>
              <p className="text-muted-foreground mb-6">
                Parcourez le marketplace pour trouver des produits
              </p>
              <Link to="/marketplace">
                <Button variant="hero">Explorer le marketplace</Button>
              </Link>
            </div>
          </div>
        </main>
        <Footer />
        <MobileBottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 lg:pb-0">
      <Header />
      <main className="pt-24 lg:pt-28">
        <div className="container mx-auto px-4 py-8">
          {/* Back Button */}
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Retour</span>
          </button>

          <h1 className="font-heading text-2xl lg:text-3xl font-bold text-foreground mb-8">
            Mon Panier ({itemCount} articles)
          </h1>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Cart Items */}
            <div className="lg:col-span-2 space-y-4">
              {items.map((item) => (
                <Card key={item.product.id}>
                  <CardContent className="p-4">
                    <div className="flex gap-4">
                      <img
                        src={item.product.image}
                        alt={item.product.name}
                        className="w-20 h-20 md:w-24 md:h-24 object-cover rounded-lg"
                      />
                      <div className="flex-1 min-w-0">
                        <Link 
                          to={`/produit/${item.product.id}`}
                          className="font-semibold text-foreground hover:text-primary line-clamp-1"
                        >
                          {item.product.name}
                        </Link>
                        <p className="text-sm text-muted-foreground">
                          Vendeur: {item.product.producer.name}
                        </p>
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {item.product.location}
                        </p>
                        <div className="flex items-center justify-between mt-2">
                          <span className="font-bold text-primary">
                            {formatPrice(item.product.price)} FCFA
                            <span className="text-xs text-muted-foreground font-normal">
                              /{item.product.unit}
                            </span>
                          </span>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                              className="w-8 h-8 rounded-full border border-border flex items-center justify-center hover:bg-muted"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="w-8 text-center font-medium">{item.quantity}</span>
                            <button
                              onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                              className="w-8 h-8 rounded-full border border-border flex items-center justify-center hover:bg-muted"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => removeItem(item.product.id)}
                              className="w-8 h-8 rounded-full text-destructive hover:bg-destructive/10 flex items-center justify-center ml-2"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {/* Delivery Options */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Truck className="w-5 h-5 text-primary" />
                    Mode de livraison
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <RadioGroup value={deliveryMethod} onValueChange={setDeliveryMethod}>
                    <div className="space-y-3">
                      {deliveryOptions.map((option) => (
                        <div
                          key={option.id}
                          className={`flex items-center gap-3 p-3 sm:p-4 rounded-xl border-2 transition-all cursor-pointer ${
                            deliveryMethod === option.id
                              ? "border-primary bg-primary/5"
                              : "border-border hover:border-primary/50"
                          }`}
                          onClick={() => setDeliveryMethod(option.id)}
                        >
                          <RadioGroupItem value={option.id} id={option.id} />
                          <option.icon className="w-5 h-5 text-primary flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Label htmlFor={option.id} className="font-medium cursor-pointer text-sm sm:text-base">
                                {option.name}
                              </Label>
                              <Badge variant="secondary" className="text-[10px]">
                                {option.tag}
                              </Badge>
                            </div>
                            <p className="text-xs sm:text-sm text-muted-foreground">{option.description}</p>
                          </div>
                          <span className="font-semibold text-foreground text-sm sm:text-base whitespace-nowrap">
                            {option.price === 0 ? "Gratuit" : `${formatPrice(option.price)} FCFA`}
                          </span>
                        </div>
                      ))}
                    </div>
                  </RadioGroup>

                  {deliveryMethod !== "pickup" && (
                    <div className="mt-6 space-y-4 p-4 bg-muted rounded-xl">
                      <h4 className="font-medium flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-primary" />
                        Adresse de livraison
                      </h4>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Ville</Label>
                          <Input
                            placeholder="Ex: Lomé"
                            value={deliveryCity}
                            onChange={(e) => setDeliveryCity(e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Adresse complète</Label>
                          <Input
                            placeholder="Quartier, rue, repère..."
                            value={deliveryAddress}
                            onChange={(e) => setDeliveryAddress(e.target.value)}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <Card className="sticky top-24">
                <CardHeader>
                  <CardTitle>Récapitulatif</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Sous-total ({itemCount} articles)</span>
                      <span>{formatPrice(total)} FCFA</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Livraison</span>
                      <span>{deliveryPrice === 0 ? "Gratuit" : `${formatPrice(deliveryPrice)} FCFA`}</span>
                    </div>
                  </div>

                  <div className="h-px bg-border" />

                  <div className="flex justify-between font-bold text-lg">
                    <span>Total</span>
                    <span className="text-primary">{formatPrice(finalTotal)} FCFA</span>
                  </div>

                  <Button 
                    variant="hero" 
                    className="w-full gap-2" 
                    size="lg"
                    onClick={handleCheckout}
                  >
                    <CreditCard className="w-4 h-4" />
                    Commander
                  </Button>

                  <p className="text-xs text-muted-foreground text-center">
                    Les vendeurs vous contacteront pour confirmer la disponibilité et finaliser le paiement
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
      <Footer />
      <MobileBottomNav />
    </div>
  );
};

export default Cart;
