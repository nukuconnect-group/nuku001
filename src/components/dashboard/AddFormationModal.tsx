import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, GraduationCap, Upload, X, Sparkles, Video, FileText, Plus, Trash2 } from "lucide-react";
import { useImageUpload } from "@/hooks/useImageUpload";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  instructorName: string;
  onCreated?: () => void;
}

const FORMATION_CATEGORIES = [
  "Agriculture", "Élevage", "Aquaculture", "Aviculture",
  "Maraîchage", "Agro-business", "Transformation", "Marketing agricole", "Général",
];

const AddFormationModal = ({ open, onOpenChange, instructorName, onCreated }: Props) => {
  const { toast } = useToast();
  const { uploadImages, uploading } = useImageUpload();
  const [isLoading, setIsLoading] = useState(false);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string>("");

  // IA: contenu source + vidéos
  const [aiContent, setAiContent] = useState<string>("");
  const [aiFileName, setAiFileName] = useState<string>("");
  const [videoUrls, setVideoUrls] = useState<string[]>([""]);
  const [aiBusy, setAiBusy] = useState(false);

  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "Général",
    level: "beginner",
    duration_minutes: "60",
    is_paid: false,
    price: "0",
  });

  const handleCoverUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setCoverFile(f);
    const reader = new FileReader();
    reader.onload = (ev) => setCoverPreview(ev.target?.result as string);
    reader.readAsDataURL(f);
  };

  const handleAiFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setAiFileName(f.name);
    // Pour .txt on lit directement; pour PDF/DOCX on demande à l'utilisateur de coller le texte (extraction côté client lourde évitée)
    const isText = f.type.startsWith("text/") || f.name.toLowerCase().endsWith(".txt") || f.name.toLowerCase().endsWith(".md");
    if (isText) {
      const reader = new FileReader();
      reader.onload = (ev) => setAiContent(String(ev.target?.result || ""));
      reader.readAsText(f);
    } else {
      toast({
        title: "Document détecté",
        description: "Pour un PDF/DOCX, copiez-collez le contenu dans le champ ci-dessous. L'IA générera automatiquement les chapitres.",
      });
    }
  };

  const updateVideoUrl = (idx: number, val: string) => {
    setVideoUrls(prev => prev.map((v, i) => (i === idx ? val : v)));
  };
  const addVideoField = () => setVideoUrls(prev => [...prev, ""]);
  const removeVideoField = (idx: number) => setVideoUrls(prev => prev.filter((_, i) => i !== idx));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) {
      toast({ title: "Titre requis", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    try {
      let imageUrl: string | null = null;
      if (coverFile) {
        const urls = await uploadImages([coverFile]);
        imageUrl = urls[0] || null;
      }

      const { data: created, error } = await supabase.from("formations").insert({
        title: form.title,
        description: form.description,
        category: form.category,
        level: form.level,
        instructor: instructorName || "Formateur",
        duration_minutes: parseInt(form.duration_minutes) || 60,
        is_paid: form.is_paid,
        price: form.is_paid ? parseFloat(form.price) || 0 : 0,
        image_url: imageUrl,
        is_published: true,
      } as any).select("id").single();

      if (error) throw error;

      // IA: si contenu document ou vidéos fournis → génération auto de modules
      const cleanVideos = videoUrls.map(v => v.trim()).filter(Boolean);
      if (created?.id && (aiContent.trim().length > 50 || cleanVideos.length > 0)) {
        setAiBusy(true);
        try {
          const { data: aiData, error: aiErr } = await supabase.functions.invoke("generate-formation-modules", {
            body: { formation_id: created.id, document_text: aiContent, video_urls: cleanVideos },
          });
          if (aiErr) throw aiErr;
          toast({
            title: "✨ Formation prête",
            description: `${aiData?.chapters_generated || 0} chapitres IA + ${cleanVideos.length} vidéo(s) ajoutés.`,
          });
        } catch (aiE: any) {
          console.error("AI modules error", aiE);
          toast({ title: "Formation publiée", description: "La génération IA a échoué, vous pouvez ajouter les modules manuellement.", variant: "destructive" });
        } finally {
          setAiBusy(false);
        }
      } else {
        toast({
          title: "✅ Formation publiée",
          description: "Votre formation est visible dans le module Formations.",
        });
      }

      setForm({ title: "", description: "", category: "Général", level: "beginner", duration_minutes: "60", is_paid: false, price: "0" });
      setCoverFile(null);
      setCoverPreview("");
      setAiContent("");
      setAiFileName("");
      setVideoUrls([""]);
      onOpenChange(false);
      onCreated?.();
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-accent" />
            Publier une formation
          </DialogTitle>
          <DialogDescription>
            Partagez vos connaissances agricoles avec la communauté NukuConnect.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Cover */}
          <div className="space-y-2">
            <Label>Image de couverture</Label>
            <input id="cover" type="file" accept="image/*" onChange={handleCoverUpload} className="hidden" />
            {coverPreview ? (
              <div className="relative aspect-video rounded-xl overflow-hidden bg-muted">
                <img src={coverPreview} alt="" className="w-full h-full object-cover" />
                <button type="button" onClick={() => { setCoverFile(null); setCoverPreview(""); }}
                  className="absolute top-2 right-2 w-7 h-7 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <label htmlFor="cover" className="block border-2 border-dashed border-border rounded-xl p-6 text-center hover:border-primary/50 cursor-pointer">
                <Upload className="w-7 h-7 mx-auto text-muted-foreground mb-1" />
                <p className="text-xs text-muted-foreground">Cliquez pour ajouter une image</p>
              </label>
            )}
          </div>

          <div className="space-y-2">
            <Label>Titre *</Label>
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Ex: Cultiver le maïs en saison sèche" required />
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={4} placeholder="Décrivez ce que les apprenants vont apprendre..." />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Catégorie</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FORMATION_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Niveau</Label>
              <Select value={form.level} onValueChange={(v) => setForm({ ...form, level: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="beginner">Débutant</SelectItem>
                  <SelectItem value="intermediate">Intermédiaire</SelectItem>
                  <SelectItem value="advanced">Avancé</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Durée (minutes)</Label>
              <Input type="number" min="1" value={form.duration_minutes} onChange={(e) => setForm({ ...form, duration_minutes: e.target.value })} />
            </div>
            <div className="space-y-2 flex items-end">
              <div className="flex items-center justify-between p-3 bg-muted rounded-xl w-full">
                <div>
                  <Label className="text-sm">Formation payante</Label>
                  <p className="text-[10px] text-muted-foreground">Sinon gratuite</p>
                </div>
                <Switch checked={form.is_paid} onCheckedChange={(v) => setForm({ ...form, is_paid: v })} />
              </div>
            </div>
          </div>

          {form.is_paid && (
            <div className="space-y-2">
              <Label>Prix (FCFA)</Label>
              <Input type="number" min="0" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="Ex: 5000" />
            </div>
          )}

          {/* IA : génération automatique des chapitres + vidéos */}
          <div className="p-3 sm:p-4 bg-gradient-to-br from-primary/5 to-accent/5 border border-primary/20 rounded-xl space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              <Label className="text-sm font-semibold">Génération automatique IA (optionnel)</Label>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Importez un document texte ou collez le contenu : l'IA crée automatiquement les chapitres pédagogiques.
              Vous pouvez aussi ajouter des liens vers vos vidéos. Tout sera publié dans la section <strong>Formations</strong>.
            </p>

            <div className="space-y-1.5">
              <input id="ai-doc" type="file" accept=".txt,.md,.pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={handleAiFile} className="hidden" />
              <label htmlFor="ai-doc" className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-primary/40 hover:border-primary/70 cursor-pointer text-xs text-foreground bg-background">
                <FileText className="w-3.5 h-3.5 text-primary" />
                {aiFileName ? aiFileName : "Importer un document (.txt, .md, .pdf, .docx)"}
              </label>
              <Textarea
                value={aiContent}
                onChange={(e) => setAiContent(e.target.value)}
                rows={4}
                placeholder="Ou collez ici le contenu du document à structurer en chapitres…"
                className="text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1.5"><Video className="w-3.5 h-3.5 text-accent" /> Vidéos de la formation (URLs)</Label>
              {videoUrls.map((url, idx) => (
                <div key={idx} className="flex gap-1.5">
                  <Input
                    value={url}
                    onChange={(e) => updateVideoUrl(idx, e.target.value)}
                    placeholder="https://… (YouTube, Vimeo, MP4…)"
                    className="text-xs"
                  />
                  {videoUrls.length > 1 && (
                    <Button type="button" variant="ghost" size="icon" onClick={() => removeVideoField(idx)} className="h-9 w-9 shrink-0">
                      <Trash2 className="w-3.5 h-3.5 text-destructive" />
                    </Button>
                  )}
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={addVideoField} className="text-[11px] h-8 gap-1">
                <Plus className="w-3 h-3" /> Ajouter une vidéo
              </Button>
            </div>
          </div>

          <div className="flex gap-3 justify-end">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
            <Button type="submit" variant="hero" disabled={isLoading || uploading || aiBusy}>
              {isLoading || aiBusy ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> {aiBusy ? "Génération IA…" : "Publication…"}</> : <><GraduationCap className="w-4 h-4 mr-2" /> Publier la formation</>}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddFormationModal;
