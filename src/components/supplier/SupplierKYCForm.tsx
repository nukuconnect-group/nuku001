import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Upload, Loader2, CheckCircle2, Clock, AlertCircle, Camera } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface SupplierKYCFormProps {
  userId?: string;
  onSubmitted: () => void;
}

const compressImage = (file: File | Blob, maxWidth = 1200, quality = 0.7): Promise<Blob> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxWidth / img.width);
        const canvas = document.createElement("canvas");
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(
          (blob) => (blob ? resolve(blob) : reject(new Error("Canvas toBlob failed"))),
          "image/jpeg",
          quality,
        );
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file instanceof File ? file : new File([file], "photo.jpg"));
  });

const SupplierKYCForm = ({ userId, onSubmitted }: SupplierKYCFormProps) => {
  const { toast } = useToast();
  const [idType, setIdType] = useState("cni");
  const [idNumber, setIdNumber] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [businessType, setBusinessType] = useState("individual");
  const [uploading, setUploading] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [idFrontUrl, setIdFrontUrl] = useState("");
  const [idBackUrl, setIdBackUrl] = useState("");
  const [selfieUrl, setSelfieUrl] = useState("");
  const [existingKyc, setExistingKyc] = useState<any>(null);
  const [showCamera, setShowCamera] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (!userId) return;
    supabase
      .from("supplier_kyc_submissions")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setExistingKyc(data);
      });
  }, [userId]);

  const uploadFile = async (blob: Blob, path: string) => {
    if (!userId) return "";
    const compressed = await compressImage(blob);
    const filePath = `${userId}/${path}-${Date.now()}.jpg`;
    const { error } = await supabase.storage.from("driver-kyc").upload(filePath, compressed, {
      contentType: "image/jpeg",
      upsert: false,
    });
    if (error) throw error;
    const { data } = supabase.storage.from("driver-kyc").getPublicUrl(filePath);
    return data.publicUrl;
  };

  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: (url: string) => void,
    path: string,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(path);
    try {
      const url = await uploadFile(file, path);
      setter(url);
      toast({ title: "Photo uploadée ✓" });
    } catch (err: any) {
      toast({ title: "Erreur d'upload", description: err.message, variant: "destructive" });
    } finally {
      setUploading(null);
      e.target.value = "";
    }
  };

  // Camera selfie
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false });
      streamRef.current = stream;
      setShowCamera(true);
      setTimeout(() => {
        if (videoRef.current) videoRef.current.srcObject = stream;
      }, 100);
    } catch {
      toast({ title: "Impossible d'accéder à la caméra", variant: "destructive" });
    }
  };

  const capturePhoto = async () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")!.drawImage(video, 0, 0);
    stopCamera();
    setUploading("selfie");
    try {
      const blob = await new Promise<Blob>((resolve, reject) =>
        canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Failed"))), "image/jpeg", 0.8)
      );
      const url = await uploadFile(blob, "supplier-selfie");
      setSelfieUrl(url);
      toast({ title: "Selfie capturé ✓" });
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    } finally {
      setUploading(null);
    }
  };

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setShowCamera(false);
  };

  useEffect(() => () => { streamRef.current?.getTracks().forEach((t) => t.stop()); }, []);

  const handleSubmit = async () => {
    if (!userId || !idNumber.trim()) {
      toast({ title: "Remplissez le numéro de pièce", variant: "destructive" });
      return;
    }
    if (!idFrontUrl) {
      toast({ title: "Veuillez uploader le recto de la pièce", variant: "destructive" });
      return;
    }
    if (!selfieUrl) {
      toast({ title: "Veuillez prendre votre photo (selfie)", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.from("supplier_kyc_submissions").insert({
        user_id: userId,
        id_type: idType,
        id_number: idNumber.trim(),
        id_front_url: idFrontUrl || null,
        id_back_url: idBackUrl || null,
        selfie_url: selfieUrl || null,
        business_name: businessName.trim() || null,
        business_type: businessType,
        status: "pending",
      });
      if (error) throw error;
      toast({ title: "KYC soumis ! 🎉", description: "Votre demande sera examinée sous 24-48h." });
      onSubmitted();
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  if (existingKyc) {
    return (
      <div className={`flex items-center gap-2 p-3 rounded-lg ${
        existingKyc.status === "approved"
          ? "bg-green-100/60"
          : existingKyc.status === "rejected"
          ? "bg-red-100/60"
          : "bg-yellow-100/50"
      }`}>
        {existingKyc.status === "pending" ? (
          <>
            <Clock className="w-4 h-4 text-yellow-600 flex-shrink-0" />
            <span className="text-xs text-yellow-800">KYC soumis — en attente de vérification (24-48h)</span>
          </>
        ) : existingKyc.status === "approved" ? (
          <>
            <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
            <span className="text-xs text-green-800">✓ Fournisseur vérifié — Badge activé</span>
          </>
        ) : (
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
              <span className="text-xs text-red-800 font-medium">KYC refusé</span>
            </div>
            {existingKyc.admin_note && (
              <p className="text-xs text-red-700 ml-6">Motif : {existingKyc.admin_note}</p>
            )}
            <Button variant="outline" size="sm" className="ml-6 text-xs" onClick={() => setExistingKyc(null)}>
              Resoumettre
            </Button>
          </div>
        )}
      </div>
    );
  }

  const renderUploadBox = (
    label: string,
    url: string,
    setter: (v: string) => void,
    path: string,
    required = false,
  ) => (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium">
        {label}{required && <span className="text-destructive ml-0.5">*</span>}
      </Label>
      <div className="relative">
        {url ? (
          <div className="relative h-36 sm:h-44 rounded-lg overflow-hidden border-2 border-emerald-300 group">
            <img src={url} alt={label} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
              <button
                type="button"
                onClick={() => setter("")}
                className="px-3 py-1.5 rounded-md bg-destructive text-destructive-foreground text-xs font-medium"
              >
                Remplacer
              </button>
            </div>
            <Badge className="absolute top-2 right-2 bg-emerald-500 text-white text-[9px]">
              <CheckCircle2 className="w-2.5 h-2.5 mr-0.5" /> OK
            </Badge>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {/* Galerie */}
            <label className="flex flex-col items-center justify-center h-36 sm:h-44 border-2 border-dashed border-border rounded-lg cursor-pointer hover:bg-muted/50 hover:border-primary/40 transition-colors">
              {uploading === path ? (
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              ) : (
                <>
                  <Upload className="w-7 h-7 text-muted-foreground mb-1.5" />
                  <span className="text-[10px] font-medium text-foreground">Galerie</span>
                  <span className="text-[9px] text-muted-foreground">Choisir une photo</span>
                </>
              )}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={!!uploading}
                onChange={(e) => handleFileUpload(e, setter, path)}
              />
            </label>
            {/* Caméra */}
            <label className="flex flex-col items-center justify-center h-36 sm:h-44 border-2 border-dashed border-border rounded-lg cursor-pointer hover:bg-muted/50 hover:border-primary/40 transition-colors">
              {uploading === `${path}-cam` ? (
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              ) : (
                <>
                  <Camera className="w-7 h-7 text-muted-foreground mb-1.5" />
                  <span className="text-[10px] font-medium text-foreground">Caméra</span>
                  <span className="text-[9px] text-muted-foreground">Prendre maintenant</span>
                </>
              )}
              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                disabled={!!uploading}
                onChange={(e) => handleFileUpload(e, setter, path)}
              />
            </label>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">Nom entreprise / activité</Label>
          <Input value={businessName} onChange={(e) => setBusinessName(e.target.value)} placeholder="Ex: Ferme Kokoe" className="h-9 text-sm" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">Type d'activité</Label>
          <Select value={businessType} onValueChange={setBusinessType}>
            <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="individual">Individuel</SelectItem>
              <SelectItem value="cooperative">Coopérative</SelectItem>
              <SelectItem value="enterprise">Entreprise</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">Type de pièce d'identité</Label>
          <Select value={idType} onValueChange={setIdType}>
            <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="cni">Carte Nationale (CNI)</SelectItem>
              <SelectItem value="passport">Passeport</SelectItem>
              <SelectItem value="permis">Permis de conduire</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">Numéro de pièce <span className="text-destructive">*</span></Label>
          <Input value={idNumber} onChange={(e) => setIdNumber(e.target.value)} placeholder="N° de la pièce" className="h-9 text-sm" />
        </div>
      </div>

      <div className="space-y-3">
        {renderUploadBox("Recto de la pièce", idFrontUrl, setIdFrontUrl, "supplier-id-front", true)}
        {renderUploadBox("Verso de la pièce", idBackUrl, setIdBackUrl, "supplier-id-back", false)}

        {/* Selfie */}
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">Photo portrait (selfie) <span className="text-destructive">*</span></Label>
          {showCamera ? (
            <div className="relative h-44 sm:h-56 rounded-lg overflow-hidden border-2 border-primary">
              <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
              <div className="absolute bottom-0 inset-x-0 flex justify-center gap-2 p-2 bg-black/50">
                <Button size="sm" variant="hero" className="h-8 text-xs gap-1" onClick={capturePhoto}>
                  📸 Capturer
                </Button>
                <Button size="sm" variant="ghost" className="h-8 text-xs text-white hover:text-white hover:bg-white/20" onClick={stopCamera}>
                  ✕ Annuler
                </Button>
              </div>
            </div>
          ) : selfieUrl ? (
            <div className="relative h-36 sm:h-44 rounded-lg overflow-hidden border-2 border-emerald-300 group">
              <img src={selfieUrl} alt="Selfie" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                <button
                  type="button"
                  onClick={() => setSelfieUrl("")}
                  className="px-3 py-1.5 rounded-md bg-destructive text-destructive-foreground text-xs font-medium"
                >
                  Reprendre
                </button>
              </div>
              <Badge className="absolute top-2 right-2 bg-emerald-500 text-white text-[9px]">
                <CheckCircle2 className="w-2.5 h-2.5 mr-0.5" /> OK
              </Badge>
            </div>
          ) : (
            <button
              type="button"
              onClick={startCamera}
              disabled={!!uploading}
              className="w-full flex flex-col items-center justify-center h-36 sm:h-44 border-2 border-dashed border-border rounded-lg cursor-pointer hover:bg-muted/50 hover:border-primary/40 transition-colors"
            >
              {uploading === "selfie" ? (
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              ) : (
                <>
                  <Camera className="w-8 h-8 text-muted-foreground mb-2" />
                  <span className="text-xs font-medium text-foreground">Activer la caméra</span>
                  <span className="text-[10px] text-muted-foreground">Selfie en direct (sécurité)</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      <Button variant="hero" size="lg" className="w-full gap-2" onClick={handleSubmit} disabled={submitting || !!uploading}>
        {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
        Soumettre pour vérification
      </Button>
      <p className="text-[10px] text-muted-foreground text-center">
        🔒 Vos données sont chiffrées et utilisées uniquement pour la vérification. Réponse sous 24-48h.
      </p>
    </div>
  );
};

export default SupplierKYCForm;
