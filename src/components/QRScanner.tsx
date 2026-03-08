import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Camera, QrCode, X, Loader2, CheckCircle2, AlertCircle, MapPin, Leaf, ChevronRight, Search } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";

interface QRScannerProps {
  onScan?: (code: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

interface ProductResult {
  id: string;
  name: string;
  category: string;
  price: number;
  unit: string;
  location: string | null;
  is_organic: boolean;
  images: string[] | null;
  quantity_available: number;
  description: string | null;
  producer: {
    id: string;
    full_name: string | null;
    is_verified: boolean;
    avatar_url: string | null;
  } | null;
}

const QRScanner = ({ onScan, isOpen, onClose }: QRScannerProps) => {
  const navigate = useNavigate();
  const { formatPrice } = useLanguage();
  const [manualCode, setManualCode] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [products, setProducts] = useState<ProductResult[]>([]);
  const [searchDone, setSearchDone] = useState(false);
  const [scannedCode, setScannedCode] = useState("");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const searchProducts = async (code: string) => {
    setIsSearching(true);
    setSearchDone(false);
    setScannedCode(code);

    try {
      // Try exact ID match first
      const { data: byId } = await supabase
        .from("products")
        .select("*, profiles!products_producer_id_fkey(id, full_name, is_verified, avatar_url)")
        .eq("id", code)
        .limit(1);

      if (byId && byId.length > 0) {
        setProducts(byId.map(mapProduct));
        setSearchDone(true);
        setIsSearching(false);
        return;
      }

      // Search by name / category
      const q = code.toLowerCase();
      const { data: byName } = await supabase
        .from("products")
        .select("*, profiles!products_producer_id_fkey(id, full_name, is_verified, avatar_url)")
        .or(`name.ilike.%${q}%,category.ilike.%${q}%,description.ilike.%${q}%`)
        .limit(6);

      setProducts((byName || []).map(mapProduct));
    } catch (e) {
      console.error("QR search error:", e);
      setProducts([]);
    } finally {
      setIsSearching(false);
      setSearchDone(true);
    }
  };

  const mapProduct = (p: any): ProductResult => ({
    id: p.id,
    name: p.name,
    category: p.category,
    price: p.price,
    unit: p.unit,
    location: p.location,
    is_organic: p.is_organic,
    images: p.images,
    quantity_available: p.quantity_available,
    description: p.description,
    producer: p.profiles ? {
      id: p.profiles.id,
      full_name: p.profiles.full_name,
      is_verified: p.profiles.is_verified,
      avatar_url: p.profiles.avatar_url,
    } : null,
  });

  const startCamera = async () => {
    setIsScanning(true);
    setCameraError(null);
    resetResults();

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch {
      setCameraError("Impossible d'accéder à la caméra. Veuillez entrer le code manuellement.");
      setIsScanning(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsScanning(false);
  };

  const handleCodeDetected = (code: string) => {
    stopCamera();
    onScan?.(code);
    searchProducts(code);
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualCode.trim()) {
      handleCodeDetected(manualCode.trim());
    }
  };

  const resetResults = () => {
    setProducts([]);
    setSearchDone(false);
    setScannedCode("");
    setManualCode("");
    setCameraError(null);
  };

  const handleNavigateToProduct = (productId: string) => {
    onClose();
    resetResults();
    navigate(`/produit/${productId}`);
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => { stopCamera(); resetResults(); onClose(); }}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="w-5 h-5 text-primary" />
            Scanner QR Code
          </DialogTitle>
          <DialogDescription>
            Scannez un QR code ou entrez un code produit pour accéder à sa fiche
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!searchDone && !isSearching ? (
            <>
              {/* Camera View */}
              <div className="relative aspect-square bg-muted rounded-xl overflow-hidden">
                {isScanning ? (
                  <>
                    <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-48 h-48 border-2 border-primary rounded-xl relative">
                        <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-primary rounded-tl-lg" />
                        <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-primary rounded-tr-lg" />
                        <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-primary rounded-bl-lg" />
                        <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-primary rounded-br-lg" />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-full h-0.5 bg-primary animate-pulse" />
                        </div>
                      </div>
                    </div>
                    <Button variant="secondary" size="sm" className="absolute top-4 right-4" onClick={stopCamera}>
                      <X className="w-4 h-4" />
                    </Button>
                    <p className="absolute bottom-4 left-0 right-0 text-center text-xs text-primary-foreground bg-foreground/50 mx-4 py-2 rounded-lg">
                      Scan en cours... Ou entrez le code ci-dessous
                    </p>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full p-6">
                    <Camera className="w-16 h-16 text-muted-foreground mb-4" />
                    <p className="text-center text-muted-foreground mb-4 text-sm">
                      {cameraError || "Scannez un QR code produit ou entrez l'ID / nom du produit"}
                    </p>
                    <Button variant="hero" onClick={startCamera} className="gap-2">
                      <Camera className="w-4 h-4" />
                      Ouvrir la caméra
                    </Button>
                  </div>
                )}
              </div>

              {/* Manual Input */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">ou recherchez un produit</span>
                </div>
              </div>

              <form onSubmit={handleManualSubmit} className="flex gap-2">
                <Input
                  placeholder="ID produit ou nom (ex: tomate, maïs...)"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  className="flex-1"
                />
                <Button type="submit" variant="hero" disabled={!manualCode.trim()} className="gap-1.5">
                  <Search className="w-4 h-4" />
                  Chercher
                </Button>
              </form>
            </>
          ) : isSearching ? (
            <div className="flex flex-col items-center py-12">
              <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
              <p className="text-sm text-muted-foreground">Recherche du produit...</p>
            </div>
          ) : (
            /* Results */
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${products.length > 0 ? 'bg-primary/20' : 'bg-destructive/20'}`}>
                  {products.length > 0 ? (
                    <CheckCircle2 className="w-5 h-5 text-primary" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-destructive" />
                  )}
                </div>
                <div>
                  <p className="font-heading font-semibold">
                    {products.length > 0 ? `${products.length} produit${products.length > 1 ? 's' : ''} trouvé${products.length > 1 ? 's' : ''}` : "Aucun produit trouvé"}
                  </p>
                  <p className="text-xs text-muted-foreground">Recherche : "{scannedCode}"</p>
                </div>
              </div>

              {products.length > 0 ? (
                <div className="space-y-2">
                  {products.map(product => (
                    <button
                      key={product.id}
                      onClick={() => handleNavigateToProduct(product.id)}
                      className="w-full flex items-center gap-3 p-3 rounded-xl bg-card border border-border hover:border-primary/30 hover:shadow-sm transition-all text-left"
                    >
                      <div className="w-16 h-16 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                        {product.images && product.images[0] ? (
                          <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <QrCode className="w-6 h-6 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{product.name}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          {product.producer && (
                            <span className="text-[10px] text-muted-foreground">{product.producer.full_name}</span>
                          )}
                          {product.producer?.is_verified && (
                            <Badge variant="secondary" className="text-[8px] px-1 py-0 h-3.5">✓ Vérifié</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          {product.location && (
                            <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                              <MapPin className="w-2.5 h-2.5" />{product.location}
                            </span>
                          )}
                          {product.is_organic && <Leaf className="w-3 h-3 text-green-500" />}
                        </div>
                        <p className="text-xs font-bold text-primary mt-0.5">{formatPrice(product.price)}/{product.unit}</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Aucun produit ne correspond à ce code. Vérifiez le code et réessayez.
                </p>
              )}

              <Button variant="outline" className="w-full" onClick={resetResults}>
                Scanner un autre produit
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default QRScanner;
