import { useState, useEffect } from "react";
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
import { useLanguage } from "@/contexts/LanguageContext";
import { useSubscription } from "@/hooks/useSubscription";
import { supabase } from "@/integrations/supabase/client";
import { 
  ShoppingCart, Trash2, Plus, Minus, Truck, MapPin, Package,
  CreditCard, ArrowLeft, Store, Loader2, LogIn, Smartphone, Wallet, Crown
} from "lucide-react";
import { generateOrderInvoice } from "@/utils/generateInvoicePDF";

const deliveryOptions = [
  { id: "pickup", name: "Retrait sur place", description: "Récupérez chez le producteur", price: 0, icon: Store, tag: "Gratuit" },
  { id: "gozem", name: "Gozem Livraison", description: "Livraison nationale (Togo)", price: 1500, icon: Truck, tag: "National" },
  { id: "standard", name: "Livraison Standard", description: "3-5 jours ouvrables", price: 2500, icon: Package, tag: "Économique" },
  { id: "dhl", name: "DHL Express", description: "International - 2-5 jours", price: 15000, icon: Package, tag: "International" },
];

const paymentMethods = [
  { id: "mobile_money", name: "Mobile Money", description: "TMoney, Flooz, Moov Money", icon: Smartphone, tag: "Populaire" },
  { id: "wave", name: "Wave", description: "Paiement instantané via Wave", icon: Wallet, tag: "Rapide" },
  { id: "card", name: "Carte bancaire", description: "Visa, Mastercard", icon: CreditCard, tag: "International" },
  { id: "cash", name: "Paiement à la livraison", description: "Payez en espèces à la réception", icon: Package, tag: "Cash" },
];

const Cart = () => {
  const { items, removeItem, updateQuantity, clearCart, total, itemCount } = useCart();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { t, formatPrice } = useLanguage();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [deliveryMethod, setDeliveryMethod] = useState("pickup");
  const [paymentMethod, setPaymentMethod] = useState("mobile_money");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [deliveryCity, setDeliveryCity] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        supabase.from("profiles").select("*").eq("user_id", session.user.id).single()
          .then(({ data }) => setProfile(data));
      }
    });
  }, []);

  const selectedDelivery = deliveryOptions.find(d => d.id === deliveryMethod);
  const deliveryPrice = selectedDelivery?.price || 0;
  const finalTotal = total + deliveryPrice;

  const { hasActiveSubscription, isLoading: subLoading } = useSubscription();

  const handleCheckout = async () => {
    if (!user) {
      toast({ title: t("cart.loginRequired"), description: t("cart.loginRequiredDesc"), variant: "destructive" });
      navigate("/auth");
      return;
    }

    if (!hasActiveSubscription) {
      toast({ title: "Abonnement requis", description: "Vous devez souscrire à un plan d'adhésion pour passer commande.", variant: "destructive" });
      navigate("/plans");
      return;
    }

    if (deliveryMethod !== "pickup" && (!deliveryAddress || !deliveryCity)) {
      toast({ title: t("cart.addressRequired"), description: t("cart.addressRequiredDesc"), variant: "destructive" });
      return;
    }

    if ((paymentMethod === "mobile_money" || paymentMethod === "wave") && !mobileNumber) {
      toast({ title: "Numéro requis", description: "Veuillez entrer votre numéro de téléphone pour le paiement mobile.", variant: "destructive" });
      return;
    }

    setIsCheckingOut(true);
    try {
      const { data: buyerProfile } = await supabase
        .from("profiles").select("id").eq("user_id", user.id).single();

      if (!buyerProfile) throw new Error("Profile not found");

      const selectedPayment = paymentMethods.find(p => p.id === paymentMethod);

      const isValidUUID = (s: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
      
      // Check if ALL items are mock (non-UUID) products
      const hasRealProducts = items.some(item => isValidUUID(item.product.id) && isValidUUID(item.product.producer.id));
      
      if (!hasRealProducts) {
        // Generate invoice for demo products
        generateOrderInvoice(items, total, deliveryPrice, finalTotal, selectedDelivery?.name || "", selectedPayment?.name || "", profile?.full_name, profile?.phone, deliveryCity, deliveryAddress, mobileNumber);
        toast({ title: t("cart.orderSent"), description: t("cart.orderSentDesc") });
        clearCart();
        navigate("/suivi-livraison");
        setIsCheckingOut(false);
        return;
      }

      for (const item of items) {
        const sellerId = item.product.producer.id;
        const productId = item.product.id;
        
        if (!isValidUUID(productId) || !isValidUUID(sellerId)) {
          continue;
        }

        const { error } = await supabase.from("orders").insert({
          buyer_id: buyerProfile.id,
          seller_id: sellerId,
          product_id: productId,
          quantity: item.quantity,
          total_price: item.product.price * item.quantity,
          status: "pending",
          notes: [
            deliveryMethod !== "pickup" ? `Livraison: ${selectedDelivery?.name} - ${deliveryCity}, ${deliveryAddress}` : "Retrait sur place",
            `Paiement: ${selectedPayment?.name}`,
            mobileNumber ? `Tél: ${mobileNumber}` : "",
          ].filter(Boolean).join(" | "),
        });

        if (error) throw error;
      }

      toast({ title: t("cart.orderSent"), description: t("cart.orderSentDesc") });
      clearCart();
      navigate("/suivi-livraison");
    } catch (error: any) {
      console.error("Checkout error:", error);
      toast({ title: t("common.error"), description: error.message, variant: "destructive" });
    } finally {
      setIsCheckingOut(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-background pb-14 lg:pb-0">
        <Header />
        <main>
          <div className="container mx-auto px-4 py-12">
            <div className="text-center">
              <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center mx-auto mb-6">
                <ShoppingCart className="w-10 h-10 text-muted-foreground" />
              </div>
              <h1 className="font-heading text-2xl font-bold text-foreground mb-2">{t("cart.empty")}</h1>
              <p className="text-muted-foreground mb-6">{t("cart.emptyDesc")}</p>
              <Link to="/marketplace">
                <Button variant="hero">{t("cart.explore")}</Button>
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
    <div className="min-h-screen bg-background pb-14 lg:pb-0">
      <Header />
      <main>
        <div className="container mx-auto px-4 py-6">
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors">
            <ArrowLeft className="w-4 h-4" /><span>{t("cart.back")}</span>
          </button>

          <h1 className="font-heading text-2xl lg:text-3xl font-bold text-foreground mb-8">
            {t("cart.title")} ({itemCount} {t("cart.articles")})
          </h1>

          {!user && (
            <Card className="mb-6 border-accent">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <LogIn className="w-5 h-5 text-accent" />
                  <div>
                    <p className="font-medium text-sm">{t("cart.loginRequired")}</p>
                    <p className="text-xs text-muted-foreground">{t("cart.loginRequiredDesc")}</p>
                  </div>
                </div>
                <Link to="/auth">
                  <Button variant="hero" size="sm">{t("cart.loginBtn")}</Button>
                </Link>
              </CardContent>
            </Card>
          )}

          {user && !subLoading && !hasActiveSubscription && (
            <Card className="mb-6 border-primary">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Crown className="w-5 h-5 text-primary" />
                  <div>
                    <p className="font-medium text-sm">Abonnement requis</p>
                    <p className="text-xs text-muted-foreground">Souscrivez à un plan pour passer commande</p>
                  </div>
                </div>
                <Link to="/plans">
                  <Button variant="hero" size="sm">Voir les plans</Button>
                </Link>
              </CardContent>
            </Card>
          )}

          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-4">
              {items.map((item) => (
                <Card key={item.product.id}>
                  <CardContent className="p-4">
                    <div className="flex gap-4">
                      <img src={item.product.image} alt={item.product.name} className="w-20 h-20 md:w-24 md:h-24 object-cover rounded-lg" />
                      <div className="flex-1 min-w-0">
                        <Link to={`/produit/${item.product.id}`} className="font-semibold text-foreground hover:text-primary line-clamp-1">
                          {item.product.name}
                        </Link>
                        <p className="text-sm text-muted-foreground">{t("cart.seller")}: {item.product.producer.name}</p>
                        <p className="text-sm text-muted-foreground flex items-center gap-1"><MapPin className="w-3 h-3" />{item.product.location}</p>
                        <div className="flex items-center justify-between mt-2">
                          <span className="font-bold text-primary">
                            {formatPrice(item.product.price)}
                            <span className="text-xs text-muted-foreground font-normal">/{item.product.unit}</span>
                          </span>
                          <div className="flex items-center gap-2">
                            <button onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                              className="w-8 h-8 rounded-full border border-border flex items-center justify-center hover:bg-muted">
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="w-8 text-center font-medium">{item.quantity}</span>
                            <button onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                              className="w-8 h-8 rounded-full border border-border flex items-center justify-center hover:bg-muted">
                              <Plus className="w-3 h-3" />
                            </button>
                            <button onClick={() => removeItem(item.product.id)}
                              className="w-8 h-8 rounded-full text-destructive hover:bg-destructive/10 flex items-center justify-center ml-2">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {/* Delivery Method */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Truck className="w-5 h-5 text-primary" />{t("cart.deliveryMethod")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <RadioGroup value={deliveryMethod} onValueChange={setDeliveryMethod}>
                    <div className="space-y-3">
                      {deliveryOptions.map((option) => (
                        <div key={option.id}
                          className={`flex items-center gap-3 p-3 sm:p-4 rounded-xl border-2 transition-all cursor-pointer ${
                            deliveryMethod === option.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                          }`}
                          onClick={() => setDeliveryMethod(option.id)}>
                          <RadioGroupItem value={option.id} id={option.id} />
                          <option.icon className="w-5 h-5 text-primary flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Label htmlFor={option.id} className="font-medium cursor-pointer text-sm sm:text-base">{option.name}</Label>
                              <Badge variant="secondary" className="text-[10px]">{option.tag}</Badge>
                            </div>
                            <p className="text-xs sm:text-sm text-muted-foreground">{option.description}</p>
                          </div>
                          <span className="font-semibold text-foreground text-sm sm:text-base whitespace-nowrap">
                            {option.price === 0 ? t("cart.free") : formatPrice(option.price)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </RadioGroup>

                  {deliveryMethod !== "pickup" && (
                    <div className="mt-6 space-y-4 p-4 bg-muted rounded-xl">
                      <h4 className="font-medium flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-primary" />{t("cart.deliveryAddress")}
                      </h4>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>{t("cart.city")}</Label>
                          <Input placeholder="Ex: Lomé" value={deliveryCity} onChange={(e) => setDeliveryCity(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                          <Label>{t("cart.fullAddress")}</Label>
                          <Input placeholder="Quartier, rue, repère..." value={deliveryAddress} onChange={(e) => setDeliveryAddress(e.target.value)} />
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Payment Method */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Wallet className="w-5 h-5 text-primary" />Mode de paiement
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod}>
                    <div className="space-y-3">
                      {paymentMethods.map((method) => (
                        <div key={method.id}
                          className={`flex items-center gap-3 p-3 sm:p-4 rounded-xl border-2 transition-all cursor-pointer ${
                            paymentMethod === method.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                          }`}
                          onClick={() => setPaymentMethod(method.id)}>
                          <RadioGroupItem value={method.id} id={`pay-${method.id}`} />
                          <method.icon className="w-5 h-5 text-primary flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Label htmlFor={`pay-${method.id}`} className="font-medium cursor-pointer text-sm sm:text-base">{method.name}</Label>
                              <Badge variant="secondary" className="text-[10px]">{method.tag}</Badge>
                            </div>
                            <p className="text-xs sm:text-sm text-muted-foreground">{method.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </RadioGroup>

                  {(paymentMethod === "mobile_money" || paymentMethod === "wave") && (
                    <div className="mt-6 space-y-4 p-4 bg-muted rounded-xl">
                      <h4 className="font-medium flex items-center gap-2">
                        <Smartphone className="w-4 h-4 text-primary" />Numéro de paiement
                      </h4>
                      <div className="space-y-2">
                        <Label>Numéro de téléphone</Label>
                        <Input
                          type="tel"
                          placeholder="+228 90 XX XX XX"
                          value={mobileNumber}
                          onChange={(e) => setMobileNumber(e.target.value)}
                        />
                        <p className="text-[10px] text-muted-foreground">
                          {paymentMethod === "mobile_money"
                            ? "Vous recevrez une notification pour confirmer le paiement via TMoney, Flooz ou Moov Money."
                            : "Vous recevrez une notification Wave pour confirmer le paiement."}
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="lg:col-span-1">
              <Card className="sticky top-24">
                <CardHeader><CardTitle>{t("cart.summary")}</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{t("cart.subtotal")} ({itemCount} {t("cart.articles")})</span>
                      <span>{formatPrice(total)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{t("cart.delivery")}</span>
                      <span>{deliveryPrice === 0 ? t("cart.free") : formatPrice(deliveryPrice)}</span>
                    </div>
                  </div>
                  <div className="h-px bg-border" />
                  <div className="flex justify-between font-bold text-lg">
                    <span>{t("cart.total")}</span>
                    <span className="text-primary">{formatPrice(finalTotal)}</span>
                  </div>
                  <Button variant="hero" className="w-full gap-2" size="lg" onClick={handleCheckout} disabled={isCheckingOut || !user}>
                    {isCheckingOut ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
                    {t("cart.checkout")}
                  </Button>
                  <p className="text-xs text-muted-foreground text-center">{t("cart.sellerContact")}</p>
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
