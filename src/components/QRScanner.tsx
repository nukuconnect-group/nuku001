import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
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
import { Html5Qrcode } from "html5-qrcode";

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
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerContainerId = "qr-reader-container";
  const hasProcessedRef = useRef(false);

  const stopScanner = useCallback(async () => {
    if (scannerRef.current) {
      try {
        const state = scannerRef.current.getState();
        if (state === 2) { // SCANNING
          await scannerRef.current.stop();
        }
      } catch {
        // ignore
      }
      try {
        scannerRef.current.clear();
      } catch {
        // ignore
      }
      scannerRef.current = null;
    }
    setIsScanning(false);
  }, []);

  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, [stopScanner]);

  // Stop scanner when dialog closes
  useEffect(() => {
    if (!isOpen) {
      stopScanner();
      hasProcessedRef.current = false;
    }
  }, [isOpen, stopScanner]);

  const searchProducts = async (code: string) => {
    setIsSearching(true);
    setSearchDone(false);
    const normalizedCode = (() => {
      try {
        const parsed = new URL(code);
        const productParam = parsed.searchParams.get("product");
        if (productParam) return productParam;
        const productMatch = parsed.pathname.match(/\/produit\/([^/]+)/);
        if (productMatch?.[1]) return decodeURIComponent(productMatch[1]);
      } catch {
        // Plain product ID/name/batch code: keep as-is.
      }
      return code;
    })();
    setScannedCode(normalizedCode);

    try {
      // Try exact ID match
      const { data: byId } = await supabase
        .from("products")
        .select("*, profiles!products_producer_id_fkey(id, full_name, is_verified, avatar_url)")
        .eq("id", normalizedCode)
        .limit(1);

      if (byId && byId.length > 0) {
        setProducts(byId.map(mapProduct));
        setSearchDone(true);
        setIsSearching(false);
        return;
      }

      // Search by name / category
      const q = normalizedCode.toLowerCase();
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

  const startScanner = async () => {
    setIsScanning(true);
    setCameraError(null);
    resetResults();
    hasProcessedRef.current = false;

    // Wait for DOM element to be available
    await new Promise(r => setTimeout(r, 100));

    try {
      const html5Qr = new Html5Qrcode(scannerContainerId);
      scannerRef.current = html5Qr;

      await html5Qr.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1,
        },
        (decodedText) => {
          if (!hasProcessedRef.current) {
            hasProcessedRef.current = true;
            handleCodeDetected(decodedText);
          }
        },
        () => {
          // QR code not found in frame — ignore
        }
      );
    } catch (err: any) {
      console.error("QR scanner error:", err);
      setCameraError("Impossible d'accéder à la caméra. Veuillez entrer le code manuellement.");
      setIsScanning(false);
    }
  };

  const handleCodeDetected = (code: string) => {
    stopScanner();
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
    hasProcessedRef.current = false;
  };

  const handleNavigateToProduct = (productId: string) => {
    stopScanner();
    resetResults();
    onClose();
    navigate(`/produit/${productId}`);
  };

  const handleClose = () => {
    stopScanner();
    resetResults();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(v) => !v && handleClose()}>
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
              {/* Camera / Scanner View */}
              <div className="relative rounded-xl overflow-hidden bg-muted">
                {isScanning ? (
                  <div className="relative">
                    <div id={scannerContainerId} className="w-full" />
                    <Button
                      variant="secondary"
                      size="sm"
                      className="absolute top-2 right-2 z-10"
                      onClick={stopScanner}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-16 px-6">
                    <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                      <QrCode className="w-10 h-10 text-primary" />
                    </div>
                    <p className="text-center text-muted-foreground mb-1 text-sm font-medium">
                      {cameraError || "Scanner un QR code produit"}
                    </p>
                    <p className="text-center text-muted-foreground mb-5 text-xs">
                      La caméra détectera automatiquement le QR code
                    </p>
                    <Button variant="hero" onClick={startScanner} className="gap-2">
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
                  <p className="text-xs text-muted-foreground">Code scanné : "{scannedCode}"</p>
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
