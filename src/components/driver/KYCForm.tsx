import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Upload, Loader2, CheckCircle2, Clock, FileText, AlertCircle, Camera } from "lucide-react";

interface KYCFormProps {
  userId?: string;
  onSubmitted: () => void;
}

/** Compress image on a canvas before upload — solves mobile camera large-file issues */
const compressImage = (file: File, maxWidth = 1200, quality = 0.7): Promise<Blob> =>
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
    reader.readAsDataURL(file);
  });

const KYCForm = ({ userId, onSubmitted }: KYCFormProps) => {
  const { toast } = useToast();
  const [idType, setIdType] = useState("cni");
  const [idNumber, setIdNumber] = useState("");
  const [licensePlate, setLicensePlate] = useState("");
  const [vehicleBrand, setVehicleBrand] = useState("");
  const [vehicleColor, setVehicleColor] = useState("");
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
      .from("driver_kyc_submissions")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setExistingKyc(data);
      });
  }, [userId]);

  const uploadFile = async (file: File, path: string) => {
    if (!userId) return "";
    // Compress before upload
    const compressed = await compressImage(file);
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
      console.error("KYC upload error:", err);
      toast({ title: "Erreur d'upload", description: err.message, variant: "destructive" });
    } finally {
      setUploading(null);
      // Reset input so re-selecting same file triggers change
      e.target.value = "";
    }
  };

  // Camera selfie capture
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false });
      streamRef.current = stream;
      setShowCamera(true);
      setTimeout(() => { if (videoRef.current) videoRef.current.srcObject = stream; }, 100);
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
      const compressed = await compressImage(new File([blob], "selfie.jpg"));
      const filePath = `${userId}/selfie-${Date.now()}.jpg`;
      const { error } = await supabase.storage.from("driver-kyc").upload(filePath, compressed, { contentType: "image/jpeg", upsert: false });
      if (error) throw error;
      const { data } = supabase.storage.from("driver-kyc").getPublicUrl(filePath);
      setSelfieUrl(data.publicUrl);
      toast({ title: "Photo capturée ✓" });
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
    if (!licensePlate.trim()) {
      toast({ title: "Numéro de plaque requis", description: "Entrez le numéro d'immatriculation de votre véhicule.", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.from("driver_kyc_submissions").insert({
        user_id: userId,
        id_type: idType,
        id_number: idNumber.trim(),
        id_front_url: idFrontUrl || null,
        id_back_url: idBackUrl || null,
        selfie_url: selfieUrl || null,
        license_plate: licensePlate.trim() || null,
        vehicle_brand: vehicleBrand.trim() || null,
        vehicle_color: vehicleColor.trim() || null,
        status: "pending",
      } as any);
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
            <span className="text-xs text-green-800">KYC approuvé ✓ — Votre compte est activé</span>
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
            <Button
              variant="outline"
              size="sm"
              className="ml-6 text-xs"
              onClick={() => setExistingKyc(null)}
            >
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
    capture?: "user" | "environment",
  ) => (
    <div>
      <Label className="text-[10px]">{label}</Label>
      <label className="flex items-center justify-center h-16 border-2 border-dashed border-border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors relative">
        {uploading === path ? (
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
        ) : url ? (
          <img src={url} alt={label} className="w-full h-full object-cover rounded-lg" />
        ) : (
          <Upload className="w-4 h-4 text-muted-foreground" />
        )}
        <input
          type="file"
          accept="image/*"
          {...(capture ? { capture } : {})}
          className="hidden"
          disabled={!!uploading}
          onChange={(e) => handleFileUpload(e, setter, path)}
        />
      </label>
    </div>
  );

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-[10px]">Type de pièce</Label>
          <Select value={idType} onValueChange={setIdType}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="cni">CNI</SelectItem>
              <SelectItem value="passport">Passeport</SelectItem>
              <SelectItem value="permis">Permis de conduire</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-[10px]">Numéro</Label>
          <Input value={idNumber} onChange={(e) => setIdNumber(e.target.value)} placeholder="N° de pièce" className="h-8 text-xs" />
        </div>
      </div>

      {/* Vehicle details */}
      <div className="grid grid-cols-3 gap-2">
        <div className="space-y-1">
          <Label className="text-[10px]">Plaque d'immatriculation *</Label>
          <Input value={licensePlate} onChange={(e) => setLicensePlate(e.target.value)} placeholder="TG-1234-AB" className="h-8 text-xs" />
        </div>
        <div className="space-y-1">
          <Label className="text-[10px]">Marque / Modèle</Label>
          <Input value={vehicleBrand} onChange={(e) => setVehicleBrand(e.target.value)} placeholder="Ex: Honda CG" className="h-8 text-xs" />
        </div>
        <div className="space-y-1">
          <Label className="text-[10px]">Couleur du véhicule</Label>
          <Input value={vehicleColor} onChange={(e) => setVehicleColor(e.target.value)} placeholder="Ex: Noir" className="h-8 text-xs" />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {renderUploadBox("Recto pièce *", idFrontUrl, setIdFrontUrl, "id-front", "environment")}
        {renderUploadBox("Verso pièce", idBackUrl, setIdBackUrl, "id-back", "environment")}
        {renderUploadBox("Selfie", selfieUrl, setSelfieUrl, "selfie", "user")}
      </div>

      <Button variant="hero" size="sm" className="w-full gap-1.5" onClick={handleSubmit} disabled={submitting || !!uploading}>
        {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
        Soumettre mes documents
      </Button>
    </div>
  );
};

export default KYCForm;
