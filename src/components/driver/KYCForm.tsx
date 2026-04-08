import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Upload, Loader2, CheckCircle2, Clock, FileText } from "lucide-react";

interface KYCFormProps {
  userId?: string;
  onSubmitted: () => void;
}

const KYCForm = ({ userId, onSubmitted }: KYCFormProps) => {
  const { toast } = useToast();
  const [idType, setIdType] = useState("cni");
  const [idNumber, setIdNumber] = useState("");
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [idFrontUrl, setIdFrontUrl] = useState("");
  const [idBackUrl, setIdBackUrl] = useState("");
  const [selfieUrl, setSelfieUrl] = useState("");
  const [existingKyc, setExistingKyc] = useState<any>(null);

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
    const filePath = `${userId}/${path}-${Date.now()}.${file.name.split('.').pop()}`;
    const { error } = await supabase.storage.from("driver-kyc").upload(filePath, file);
    if (error) throw error;
    const { data } = supabase.storage.from("driver-kyc").getPublicUrl(filePath);
    return data.publicUrl;
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, setter: (url: string) => void, path: string) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadFile(file, path);
      setter(url);
      toast({ title: "Photo uploadée ✓" });
    } catch {
      toast({ title: "Erreur d'upload", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (!userId || !idNumber.trim()) {
      toast({ title: "Remplissez le numéro de pièce", variant: "destructive" });
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
      <div className="flex items-center gap-2 p-2 rounded-lg bg-yellow-100/50">
        {existingKyc.status === "pending" ? (
          <>
            <Clock className="w-4 h-4 text-yellow-600" />
            <span className="text-xs text-yellow-800">KYC soumis — en attente de vérification (24-48h)</span>
          </>
        ) : existingKyc.status === "approved" ? (
          <>
            <CheckCircle2 className="w-4 h-4 text-green-600" />
            <span className="text-xs text-green-800">KYC approuvé ✓</span>
          </>
        ) : (
          <>
            <FileText className="w-4 h-4 text-red-600" />
            <span className="text-xs text-red-800">KYC refusé: {existingKyc.admin_note || "Veuillez resoumettre"}</span>
          </>
        )}
      </div>
    );
  }

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

      <div className="grid grid-cols-3 gap-2">
        <div>
          <Label className="text-[10px]">Recto</Label>
          <label className="flex items-center justify-center h-16 border-2 border-dashed border-border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
            {idFrontUrl ? <CheckCircle2 className="w-5 h-5 text-green-600" /> : <Upload className="w-4 h-4 text-muted-foreground" />}
            <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => handleFileUpload(e, setIdFrontUrl, "id-front")} />
          </label>
        </div>
        <div>
          <Label className="text-[10px]">Verso</Label>
          <label className="flex items-center justify-center h-16 border-2 border-dashed border-border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
            {idBackUrl ? <CheckCircle2 className="w-5 h-5 text-green-600" /> : <Upload className="w-4 h-4 text-muted-foreground" />}
            <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => handleFileUpload(e, setIdBackUrl, "id-back")} />
          </label>
        </div>
        <div>
          <Label className="text-[10px]">Selfie</Label>
          <label className="flex items-center justify-center h-16 border-2 border-dashed border-border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
            {selfieUrl ? <CheckCircle2 className="w-5 h-5 text-green-600" /> : <Upload className="w-4 h-4 text-muted-foreground" />}
            <input type="file" accept="image/*" capture="user" className="hidden" onChange={(e) => handleFileUpload(e, setSelfieUrl, "selfie")} />
          </label>
        </div>
      </div>

      <Button variant="hero" size="sm" className="w-full gap-1.5" onClick={handleSubmit} disabled={submitting || uploading}>
        {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
        Soumettre mes documents
      </Button>
    </div>
  );
};

export default KYCForm;
