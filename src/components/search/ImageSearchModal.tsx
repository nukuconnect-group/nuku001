import { useState, useRef } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Camera, ImageIcon, X, Loader2, Search, Leaf, MapPin, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useProducts } from "@/hooks/useProducts";
import { useLanguage } from "@/contexts/LanguageContext";

interface DetectionResult {
  detected: boolean;
  name: string | null;
  category: string | null;
  description: string | null;
  searchTerms: string[];
  confidence: number;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onSearch?: (query: string) => void;
}

export default function ImageSearchModal({ open, onClose, onSearch }: Props) {
  const navigate = useNavigate();
  const { formatPrice } = useLanguage();
  const { data: allProducts } = useProducts();
  const [step, setStep] = useState<"choose" | "preview" | "analyzing" | "result">("choose");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [result, setResult] = useState<DetectionResult | null>(null);
  const [error, setError] = useState("");
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelected = (file: File) => {
    if (file.size > 10 * 1024 * 1024) {
      setError("Image trop volumineuse (max 10 Mo)");
      return;
    }
    const url = URL.createObjectURL(file);
    setImageUrl(url);
    setImageFile(file);
    setStep("preview");
    setError("");
  };

  const analyzeImage = async () => {
    if (!imageFile) return;
    setStep("analyzing");
    setError("");

    try {
      // Convert to base64
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve) => {
        reader.onload = () => {
          const result = reader.result as string;
          const base64 = result.split(",")[1];
          resolve(base64);
        };
      });
      reader.readAsDataURL(imageFile);
      const base64 = await base64Promise;

      const { data, error: fnError } = await supabase.functions.invoke("image-search", {
        body: { imageBase64: base64, mimeType: imageFile.type },
      });

      if (fnError) throw fnError;
      setResult(data as DetectionResult);
      setStep("result");
    } catch (e: any) {
      console.error("Image analysis error:", e);
      setError("Impossible d'analyser l'image. Réessayez.");
      setStep("preview");
    }
  };

  const matchedProducts = result?.detected && allProducts
    ? allProducts.filter(p => {
        const terms = result.searchTerms.map(t => t.toLowerCase());
        const name = result.name?.toLowerCase() || "";
        return (
          p.name.toLowerCase().includes(name) ||
          terms.some(t => p.name.toLowerCase().includes(t)) ||
          terms.some(t => p.category.toLowerCase().includes(t)) ||
          terms.some(t => p.description.toLowerCase().includes(t))
        );
      }).slice(0, 4)
    : [];

  const handleSearchProducts = () => {
    if (result?.name) {
      onSearch?.(result.name);
      navigate(`/marketplace?search=${encodeURIComponent(result.name)}`);
    }
    handleClose();
  };

  const handleClose = () => {
    setStep("choose");
    setImageUrl(null);
    setImageFile(null);
    setResult(null);
    setError("");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="sm:max-w-md p-0 rounded-2xl overflow-hidden border-0 bg-background max-h-[90vh] overflow-y-auto">
        <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden"
          onChange={(e) => { if (e.target.files?.[0]) handleFileSelected(e.target.files[0]); e.target.value = ""; }} />
        <input ref={galleryInputRef} type="file" accept="image/*" className="hidden"
          onChange={(e) => { if (e.target.files?.[0]) handleFileSelected(e.target.files[0]); e.target.value = ""; }} />

        <div className="relative">
          <button onClick={handleClose} className="absolute top-3 right-3 z-10 p-1.5 rounded-full bg-background/80 backdrop-blur hover:bg-muted transition-colors">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>

          <AnimatePresence mode="wait">
            {/* Step 1: Choose source */}
            {step === "choose" && (
              <motion.div key="choose" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="p-6 flex flex-col items-center">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <Camera className="w-8 h-8 text-primary" />
                </div>
                <h3 className="font-heading text-lg font-bold text-foreground mb-1">Recherche par image</h3>
                <p className="text-xs text-muted-foreground text-center mb-6 max-w-xs">
                  Prenez une photo ou sélectionnez une image d'un produit agricole pour le trouver sur NUKUCONNECT
                </p>

                <div className="w-full space-y-3">
                  <Button className="w-full h-14 gap-3 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground"
                    onClick={() => cameraInputRef.current?.click()}>
                    <Camera className="w-5 h-5" />
                    <div className="text-left">
                      <p className="text-sm font-semibold">Prendre une photo</p>
                      <p className="text-[10px] opacity-80">Utilisez votre caméra</p>
                    </div>
                  </Button>

                  <Button variant="outline" className="w-full h-14 gap-3 rounded-xl border-2"
                    onClick={() => galleryInputRef.current?.click()}>
                    <ImageIcon className="w-5 h-5 text-primary" />
                    <div className="text-left">
                      <p className="text-sm font-semibold">Choisir une image</p>
                      <p className="text-[10px] text-muted-foreground">Depuis votre galerie</p>
                    </div>
                  </Button>
                </div>

                <div className="mt-6 p-3 bg-muted/50 rounded-xl w-full">
                  <p className="text-[10px] text-muted-foreground text-center">
                    🤖 L'IA analysera votre image pour identifier le produit et vous montrer les résultats correspondants
                  </p>
                </div>
              </motion.div>
            )}

            {/* Step 2: Preview */}
            {step === "preview" && imageUrl && (
              <motion.div key="preview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="flex flex-col items-center">
                <div className="w-full aspect-square max-h-72 bg-muted relative overflow-hidden">
                  <img src={imageUrl} alt="" className="w-full h-full object-contain" />
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-background/90 to-transparent p-4">
                    <p className="text-xs text-foreground font-medium text-center">Image prête pour l'analyse</p>
                  </div>
                </div>

                {error && (
                  <div className="px-6 pt-3 w-full">
                    <p className="text-xs text-destructive text-center">{error}</p>
                  </div>
                )}

                <div className="p-6 w-full space-y-3">
                  <Button className="w-full h-12 gap-2 rounded-xl bg-primary hover:bg-primary/90" onClick={analyzeImage}>
                    <Search className="w-4 h-4" />
                    Analyser et rechercher
                  </Button>
                  <Button variant="ghost" className="w-full text-xs" onClick={() => { setStep("choose"); setImageUrl(null); setImageFile(null); }}>
                    Changer d'image
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Step 3: Analyzing */}
            {step === "analyzing" && (
              <motion.div key="analyzing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="p-10 flex flex-col items-center">
                <div className="relative mb-6">
                  {imageUrl && (
                    <img src={imageUrl} alt="" className="w-24 h-24 rounded-2xl object-cover border-2 border-primary/20" />
                  )}
                  <motion.div
                    className="absolute -inset-2 rounded-2xl border-2 border-primary"
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  />
                  <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                    <Loader2 className="w-4 h-4 text-primary-foreground animate-spin" />
                  </div>
                </div>

                <h3 className="font-heading text-base font-bold text-foreground mb-1">Analyse en cours...</h3>
                <p className="text-xs text-muted-foreground text-center">
                  L'IA identifie le produit sur votre image
                </p>

                <motion.div className="w-48 h-1 bg-muted rounded-full mt-6 overflow-hidden">
                  <motion.div
                    className="h-full bg-primary rounded-full"
                    initial={{ width: "0%" }}
                    animate={{ width: "90%" }}
                    transition={{ duration: 4, ease: "easeOut" }}
                  />
                </motion.div>
              </motion.div>
            )}

            {/* Step 4: Result */}
            {step === "result" && result && (
              <motion.div key="result" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="flex flex-col">
                {/* Detected product header */}
                <div className="relative">
                  {imageUrl && (
                    <div className="w-full h-44 bg-muted relative overflow-hidden">
                      <img src={imageUrl} alt="" className="w-full h-full object-contain opacity-30" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <img src={imageUrl} alt="" className="w-28 h-28 rounded-2xl object-cover shadow-lg border-2 border-primary/20" />
                      </div>
                    </div>
                  )}
                </div>

                <div className="p-5 space-y-4">
                  {result.detected ? (
                    <>
                      <div className="text-center">
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-500/10 text-green-600 mb-2">
                          <div className="w-2 h-2 bg-green-500 rounded-full" />
                          <span className="text-[10px] font-semibold uppercase tracking-wider">Produit identifié</span>
                          <span className="text-[10px]">({Math.round((result.confidence || 0) * 100)}%)</span>
                        </div>
                        <h3 className="font-heading text-xl font-bold text-foreground">{result.name}</h3>
                        <p className="text-xs text-primary font-medium mt-0.5">{result.category}</p>
                        <p className="text-xs text-muted-foreground mt-1">{result.description}</p>
                      </div>

                      {/* Matched products from DB */}
                      {matchedProducts.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-foreground mb-2">Produits disponibles sur NUKUCONNECT :</p>
                          <div className="space-y-2">
                            {matchedProducts.map(product => (
                              <button key={product.id} onClick={() => { handleClose(); navigate(`/produit/${product.id}`); }}
                                className="w-full flex items-center gap-3 p-2.5 rounded-xl bg-card border border-border hover:border-primary/30 hover:shadow-sm transition-all text-left">
                                <img src={product.image} alt={product.name} className="w-14 h-14 rounded-lg object-cover flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-semibold text-foreground truncate">{product.name}</p>
                                  <div className="flex items-center gap-1.5 mt-0.5">
                                    <MapPin className="w-3 h-3 text-muted-foreground" />
                                    <span className="text-[10px] text-muted-foreground">{product.location}</span>
                                    {product.isOrganic && <Leaf className="w-3 h-3 text-green-500" />}
                                  </div>
                                  <p className="text-xs font-bold text-primary mt-0.5">{formatPrice(product.price)}/{product.unit}</p>
                                </div>
                                <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      <Button className="w-full h-11 gap-2 rounded-xl" onClick={handleSearchProducts}>
                        <Search className="w-4 h-4" />
                        Voir tous les "{result.name}"
                      </Button>
                    </>
                  ) : (
                    <div className="text-center py-4">
                      <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                        <Search className="w-7 h-7 text-muted-foreground" />
                      </div>
                      <h3 className="font-heading text-base font-bold text-foreground mb-1">Produit non identifié</h3>
                      <p className="text-xs text-muted-foreground mb-4">{result.description || "Nous n'avons pas pu identifier un produit agricole sur cette image."}</p>
                      <Button variant="outline" className="gap-2 text-xs" onClick={() => { setStep("choose"); setImageUrl(null); setImageFile(null); setResult(null); }}>
                        <Camera className="w-3.5 h-3.5" /> Essayer une autre image
                      </Button>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  );
}
