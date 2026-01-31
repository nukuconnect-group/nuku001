import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Camera, QrCode, X, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface QRScannerProps {
  onScan?: (code: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

interface ScanResult {
  code: string;
  isValid: boolean;
  productName?: string;
  producer?: string;
  origin?: string;
  harvestDate?: string;
  isOrganic?: boolean;
}

// Mock traceability data
const traceabilityData: Record<string, Omit<ScanResult, 'code' | 'isValid'>> = {
  "TRC-001": {
    productName: "Maïs Jaune Premium",
    producer: "Kofi Mensah",
    origin: "Kara, Togo",
    harvestDate: "2025-01-15",
    isOrganic: true,
  },
  "TRC-002": {
    productName: "Tomates Fraîches",
    producer: "Ama Koffi",
    origin: "Lomé, Togo",
    harvestDate: "2025-01-28",
    isOrganic: false,
  },
  "TRC-003": {
    productName: "Ignames Blancs",
    producer: "Yao Agbeko",
    origin: "Atakpamé, Togo",
    harvestDate: "2025-01-20",
    isOrganic: true,
  },
};

const QRScanner = ({ onScan, isOpen, onClose }: QRScannerProps) => {
  const [manualCode, setManualCode] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
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

  const startCamera = async () => {
    setIsScanning(true);
    setCameraError(null);
    setScanResult(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      // Simulate QR detection after 3 seconds for demo
      setTimeout(() => {
        const codes = Object.keys(traceabilityData);
        const randomCode = codes[Math.floor(Math.random() * codes.length)];
        handleCodeDetected(randomCode);
      }, 3000);
    } catch (err) {
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
    
    const productData = traceabilityData[code.toUpperCase()];
    if (productData) {
      setScanResult({
        code: code.toUpperCase(),
        isValid: true,
        ...productData,
      });
    } else {
      setScanResult({
        code: code.toUpperCase(),
        isValid: false,
      });
    }

    onScan?.(code);
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualCode.trim()) {
      handleCodeDetected(manualCode.trim());
    }
  };

  const resetScanner = () => {
    setScanResult(null);
    setManualCode("");
    setCameraError(null);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="w-5 h-5 text-primary" />
            Scanner QR Code
          </DialogTitle>
          <DialogDescription>
            Scannez le QR code du produit pour vérifier sa traçabilité
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!scanResult ? (
            <>
              {/* Camera View */}
              <div className="relative aspect-square bg-muted rounded-xl overflow-hidden">
                {isScanning ? (
                  <>
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      className="w-full h-full object-cover"
                    />
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
                    <Button
                      variant="secondary"
                      size="sm"
                      className="absolute top-4 right-4"
                      onClick={stopCamera}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full p-6">
                    <Camera className="w-16 h-16 text-muted-foreground mb-4" />
                    <p className="text-center text-muted-foreground mb-4">
                      {cameraError || "Placez le QR code dans le cadre pour le scanner"}
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
                  <span className="bg-background px-2 text-muted-foreground">ou entrez le code</span>
                </div>
              </div>

              <form onSubmit={handleManualSubmit} className="flex gap-2">
                <Input
                  placeholder="Ex: TRC-001"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                  className="flex-1"
                />
                <Button type="submit" variant="hero" disabled={!manualCode.trim()}>
                  Vérifier
                </Button>
              </form>
            </>
          ) : (
            /* Scan Result */
            <Card className={scanResult.isValid ? "border-primary" : "border-destructive"}>
              <CardContent className="p-6">
                <div className="flex items-center gap-4 mb-6">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${scanResult.isValid ? 'bg-primary/20' : 'bg-destructive/20'}`}>
                    {scanResult.isValid ? (
                      <CheckCircle2 className="w-6 h-6 text-primary" />
                    ) : (
                      <AlertCircle className="w-6 h-6 text-destructive" />
                    )}
                  </div>
                  <div>
                    <p className="font-heading font-semibold text-lg">
                      {scanResult.isValid ? "Produit certifié" : "Produit non trouvé"}
                    </p>
                    <p className="text-sm text-muted-foreground">Code: {scanResult.code}</p>
                  </div>
                </div>

                {scanResult.isValid && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between py-2 border-b border-border">
                      <span className="text-muted-foreground">Produit</span>
                      <span className="font-medium">{scanResult.productName}</span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b border-border">
                      <span className="text-muted-foreground">Producteur</span>
                      <span className="font-medium">{scanResult.producer}</span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b border-border">
                      <span className="text-muted-foreground">Origine</span>
                      <span className="font-medium">{scanResult.origin}</span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b border-border">
                      <span className="text-muted-foreground">Date de récolte</span>
                      <span className="font-medium">{scanResult.harvestDate}</span>
                    </div>
                    <div className="flex items-center justify-between py-2">
                      <span className="text-muted-foreground">Certification</span>
                      <Badge variant={scanResult.isOrganic ? "default" : "secondary"}>
                        {scanResult.isOrganic ? "Bio certifié" : "Standard"}
                      </Badge>
                    </div>
                  </div>
                )}

                {!scanResult.isValid && (
                  <p className="text-sm text-muted-foreground">
                    Ce code de traçabilité n'existe pas dans notre base de données. Vérifiez le code et réessayez.
                  </p>
                )}

                <Button variant="outline" className="w-full mt-6" onClick={resetScanner}>
                  Scanner un autre produit
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default QRScanner;
