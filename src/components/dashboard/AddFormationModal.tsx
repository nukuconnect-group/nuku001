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
import { Loader2, GraduationCap, Upload, X, Sparkles, Video, FileText, Plus, Trash2, Eye, Edit3 } from "lucide-react";
import { useImageUpload } from "@/hooks/useImageUpload";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  instructorName: string;
  onCreated?: () => void;
}

type DiagStep = "idle" | "size_check" | "format_check" | "extracting" | "extracted" | "ai_preview" | "ai_modules" | "publishing" | "done" | "error";
interface DiagEntry { step: DiagStep; label: string; status: "pending" | "ok" | "ko" | "warn"; detail?: string; code?: string; at: number; }

// Traduit un message technique en message clair pour l'utilisateur
const friendlyError = (err: any): { title: string; description: string; code: string } => {
  const raw = (err?.message || err?.error || String(err || "")).toString();
  const code = err?.code || err?.status || (err?.context?.status ? String(err.context.status) : "");
  if (/rate_limited|429/i.test(raw)) return { title: "Trop de requêtes IA", description: "Patientez 1 minute puis réessayez.", code: code || "429" };
  if (/credits_required|402/i.test(raw)) return { title: "Crédits IA insuffisants", description: "Ajoutez des crédits dans Paramètres > Espace de travail > Utilisation.", code: code || "402" };
  if (/missing_document_text/i.test(raw)) return { title: "Document trop court", description: "Le document ne contient pas assez de texte exploitable (min. 50 caractères).", code: "EMPTY_DOC" };
  if (/missing_content/i.test(raw)) return { title: "Contenu manquant", description: "Importez un document ou ajoutez au moins une vidéo.", code: "NO_CONTENT" };
  if (/missing_formation_id/i.test(raw)) return { title: "Formation introuvable", description: "Veuillez réessayer la publication.", code: "NO_FORMATION_ID" };
  if (/unauthenticated|401/i.test(raw)) return { title: "Session expirée", description: "Reconnectez-vous puis réessayez.", code: code || "401" };
  if (/Failed to fetch|NetworkError|network/i.test(raw)) return { title: "Connexion instable", description: "Vérifiez votre internet puis réessayez.", code: "NETWORK" };
  if (/ai_failed/i.test(raw)) return { title: "L'IA n'a pas pu structurer le document", description: "Essayez avec un texte plus clair ou plus structuré.", code: "AI_FAIL" };
  if (/InvalidPDFException|password|encrypt/i.test(raw)) return { title: "PDF protégé ou corrompu", description: "Ce PDF est protégé par mot de passe ou endommagé.", code: "PDF_PROTECTED" };
  if (/scan|image only|empty/i.test(raw)) return { title: "Document non lisible", description: "Le PDF semble scanné (images). Collez le texte manuellement.", code: "PDF_SCAN" };
  return { title: "Une erreur est survenue", description: raw.slice(0, 200) || "Erreur inconnue.", code: code || "UNKNOWN" };
};

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
  const [chapterPreview, setChapterPreview] = useState<Array<{ title: string; description: string; duration_minutes: number }>>([]);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [diagnostics, setDiagnostics] = useState<DiagEntry[]>([]);
  const pushDiag = (e: Omit<DiagEntry, "at">) => setDiagnostics((d) => [...d, { ...e, at: Date.now() }]);
  const resetDiag = () => setDiagnostics([]);

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

  const extractTextFromPdf = async (file: File): Promise<string> => {
    // pdfjs-dist v4 utilise des modules .mjs (et non .min.js)
    const pdfjs: any = await import("pdfjs-dist/build/pdf.mjs");
    const version = pdfjs.version || "4.7.76";
    pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${version}/pdf.worker.min.mjs`;
    const buf = await file.arrayBuffer();
    const doc = await pdfjs.getDocument({ data: buf }).promise;
    let text = "";
    const max = Math.min(doc.numPages, 50);
    for (let i = 1; i <= max; i++) {
      const page = await doc.getPage(i);
      const content = await page.getTextContent();
      text += content.items.map((it: any) => it.str).join(" ") + "\n\n";
    }
    return text.trim();
  };

  const extractTextFromDocx = async (file: File): Promise<string> => {
    // Import direct du build navigateur (le sous-chemin "mammoth/mammoth.browser" n'est pas exporté)
    const mod: any = await import("mammoth");
    const mammoth = mod.default || mod;
    const buf = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer: buf });
    return (result.value || "").trim();
  };

  const MAX_DOC_SIZE_MB = 10;
  const MAX_DOC_SIZE_BYTES = MAX_DOC_SIZE_MB * 1024 * 1024;

  const handleAiFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;

    resetDiag();
    pushDiag({ step: "size_check", label: `Taille du fichier (${(f.size/1024/1024).toFixed(2)} Mo)`, status: "pending" });

    if (f.size > MAX_DOC_SIZE_BYTES) {
      const sizeMb = (f.size / 1024 / 1024).toFixed(1);
      pushDiag({ step: "size_check", label: "Taille du fichier", status: "ko", code: "FILE_TOO_LARGE", detail: `Fichier ${sizeMb} Mo > limite ${MAX_DOC_SIZE_MB} Mo.` });
      toast({
        title: "Document trop volumineux",
        description: `Le fichier fait ${sizeMb} Mo. Taille max autorisée : ${MAX_DOC_SIZE_MB} Mo.`,
        variant: "destructive",
      });
      e.target.value = "";
      return;
    }
    pushDiag({ step: "size_check", label: "Taille du fichier", status: "ok", detail: `${(f.size/1024/1024).toFixed(2)} Mo` });

    setAiFileName(f.name);
    setChapterPreview([]);
    const lower = f.name.toLowerCase();
    const isText = f.type.startsWith("text/") || lower.endsWith(".txt") || lower.endsWith(".md");
    const isPdf = f.type === "application/pdf" || lower.endsWith(".pdf");
    const isDocx = lower.endsWith(".docx") || f.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

    pushDiag({ step: "format_check", label: "Format du fichier", status: "pending" });
    if (!isText && !isPdf && !isDocx) {
      pushDiag({ step: "format_check", label: "Format du fichier", status: "ko", code: "BAD_FORMAT", detail: `Type "${f.type || lower.split(".").pop()}" non supporté.` });
      toast({
        title: "Format non supporté",
        description: "Formats acceptés : .txt, .md, .pdf, .docx",
        variant: "destructive",
      });
      e.target.value = "";
      setAiFileName("");
      return;
    }
    const fmt = isPdf ? "PDF" : isDocx ? "DOCX" : "TEXT";
    pushDiag({ step: "format_check", label: "Format du fichier", status: "ok", detail: fmt });

    try {
      if (isText) {
        pushDiag({ step: "extracting", label: "Lecture du fichier texte", status: "pending" });
        const reader = new FileReader();
        reader.onload = (ev) => {
          const txt = String(ev.target?.result || "");
          setAiContent(txt);
          pushDiag({ step: "extracted", label: "Lecture du fichier texte", status: "ok", detail: `${txt.length} caractères extraits` });
        };
        reader.readAsText(f);
        return;
      }
      setAiBusy(true);
      pushDiag({ step: "extracting", label: `Extraction du texte (${fmt})`, status: "pending" });
      let text = "";
      if (isPdf) text = await extractTextFromPdf(f);
      else if (isDocx) text = await extractTextFromDocx(f);

      if (!text || text.length < 30) {
        pushDiag({ step: "extracted", label: `Extraction du texte (${fmt})`, status: "warn", code: "EMPTY_TEXT", detail: "Aucun texte exploitable (PDF scanné ou vide)." });
        toast({
          title: "Document non lisible",
          description: "Aucun texte exploitable trouvé (PDF scanné ou vide). Vous pouvez coller le contenu manuellement ci-dessous.",
          variant: "destructive",
        });
      } else {
        setAiContent(text);
        pushDiag({ step: "extracted", label: `Extraction du texte (${fmt})`, status: "ok", detail: `${text.length} caractères extraits` });
        toast({ title: "✨ Document analysé", description: `${text.length} caractères extraits. Cliquez sur « Prévisualiser les chapitres » pour vérifier avant publication.` });
      }
    } catch (err: any) {
      console.error("Doc parse error", err);
      const fe = friendlyError(err);
      pushDiag({ step: "error", label: "Extraction du texte", status: "ko", code: fe.code, detail: fe.description });
      toast({ title: fe.title, description: fe.description, variant: "destructive" });
    } finally {
      setAiBusy(false);
    }
  };

  const updateVideoUrl = (idx: number, val: string) => {
    setVideoUrls(prev => prev.map((v, i) => (i === idx ? val : v)));
  };
  const addVideoField = () => setVideoUrls(prev => [...prev, ""]);
  const removeVideoField = (idx: number) => setVideoUrls(prev => prev.filter((_, i) => i !== idx));

  const handlePreviewChapters = async () => {
    if (aiContent.trim().length < 50) {
      toast({
        title: "Contenu trop court",
        description: "Ajoutez au moins 50 caractères de contenu (importez un document ou collez du texte).",
        variant: "destructive",
      });
      return;
    }
    setPreviewLoading(true);
    pushDiag({ step: "ai_preview", label: "Génération IA des chapitres (preview)", status: "pending" });
    try {
      const { data, error } = await supabase.functions.invoke("generate-formation-modules", {
        body: { document_text: aiContent, preview_only: true },
      });
      if (error) throw error;
      const chs = (data?.chapters || []) as Array<{ title: string; description: string; duration_minutes: number }>;
      if (!chs.length) {
        pushDiag({ step: "ai_preview", label: "Génération IA des chapitres", status: "warn", code: "NO_CHAPTERS", detail: "Aucun chapitre généré." });
        toast({ title: "Aucun chapitre généré", description: "Essayez avec un texte plus structuré.", variant: "destructive" });
        return;
      }
      setChapterPreview(chs);
      pushDiag({ step: "ai_preview", label: "Génération IA des chapitres", status: "ok", detail: `${chs.length} chapitres prêts` });
      toast({ title: "✨ Chapitres prêts", description: `${chs.length} chapitres générés. Modifiez-les avant publication.` });
    } catch (err: any) {
      console.error("Preview chapters error", err);
      const fe = friendlyError(err);
      pushDiag({ step: "ai_preview", label: "Génération IA des chapitres", status: "ko", code: fe.code, detail: fe.description });
      toast({ title: fe.title, description: fe.description, variant: "destructive" });
    } finally {
      setPreviewLoading(false);
    }
  };

  const updateChapterField = (idx: number, field: "title" | "description" | "duration_minutes", value: string) => {
    setChapterPreview(prev => prev.map((c, i) => i === idx ? {
      ...c,
      [field]: field === "duration_minutes" ? Math.max(1, parseInt(value) || 1) : value,
    } : c));
  };

  const removeChapter = (idx: number) => {
    setChapterPreview(prev => prev.filter((_, i) => i !== idx));
  };

  // Auto-remplissage IA du titre/description/catégorie à partir du document
  const [metaLoading, setMetaLoading] = useState(false);
  const handleAutoFillMetadata = async () => {
    if (aiContent.trim().length < 50) {
      toast({ title: "Contenu trop court", description: "Importez un document ou collez ≥50 caractères de contenu.", variant: "destructive" });
      return;
    }
    setMetaLoading(true);
    pushDiag({ step: "ai_preview", label: "Auto-remplissage IA (titre, description, catégorie)", status: "pending" });
    try {
      const { data, error } = await supabase.functions.invoke("generate-formation-modules", {
        body: { document_text: aiContent, metadata_only: true, categories: FORMATION_CATEGORIES },
      });
      if (error) throw error;
      const meta = data?.metadata || {};
      if (!meta.title) {
        pushDiag({ step: "ai_preview", label: "Auto-remplissage IA", status: "warn", code: "NO_META", detail: "Aucune métadonnée renvoyée." });
        toast({ title: "Aucune suggestion", description: "L'IA n'a pas pu proposer de titre. Réessayez.", variant: "destructive" });
        return;
      }
      const safeCategory = FORMATION_CATEGORIES.includes(meta.category) ? meta.category : "Général";
      setForm((f) => ({
        ...f,
        title: meta.title?.toString().slice(0, 120) || f.title,
        description: meta.description?.toString().slice(0, 500) || f.description,
        category: safeCategory,
      }));
      pushDiag({ step: "ai_preview", label: "Auto-remplissage IA", status: "ok", detail: `Titre, description et catégorie remplis.` });
      toast({ title: "✨ Champs remplis", description: "Titre, description et catégorie suggérés par l'IA — modifiez si besoin." });
    } catch (err: any) {
      console.error("Auto-fill metadata error", err);
      const fe = friendlyError(err);
      pushDiag({ step: "ai_preview", label: "Auto-remplissage IA", status: "ko", code: fe.code, detail: fe.description });
      toast({ title: fe.title, description: fe.description, variant: "destructive" });
    } finally {
      setMetaLoading(false);
    }
  };

  // Pré-validation : bloque la publication si le flux IA est incomplet
  const aiUsed = aiFileName.trim().length > 0 || aiContent.trim().length > 0;
  const extractionFailed = diagnostics.some((d) => (d.step === "extracted" && (d.status === "ko" || d.status === "warn")) || (d.step === "extracting" && d.status === "ko") || (d.step === "error" && d.status === "ko"));
  const cleanVideosCount = videoUrls.filter((v) => v.trim().length > 0).length;
  // Si l'utilisateur a fourni un contenu IA, on exige une prévisualisation de chapitres validée
  const aiBlocksPublish = aiUsed && chapterPreview.length === 0 && cleanVideosCount === 0;
  const aiContentTooShort = aiUsed && aiContent.trim().length > 0 && aiContent.trim().length < 50;
  const lastAiError = [...diagnostics].reverse().find((d) => d.status === "ko" && (d.step === "ai_preview" || d.step === "ai_modules" || d.step === "extracted" || d.step === "error"));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) {
      toast({ title: "Titre requis", variant: "destructive" });
      return;
    }
    // Pré-validation IA : si un document a été importé, exige une prévisualisation des chapitres validée
    if (aiBlocksPublish) {
      toast({
        title: "Chapitres IA manquants",
        description: "Cliquez sur « Prévisualiser les chapitres IA » avant de publier (ou ajoutez au moins une vidéo).",
        variant: "destructive",
      });
      return;
    }
    if (extractionFailed && chapterPreview.length === 0 && cleanVideosCount === 0) {
      toast({
        title: "Extraction du document échouée",
        description: "Corrigez le problème d'extraction (voir Diagnostic) ou collez le contenu manuellement avant de publier.",
        variant: "destructive",
      });
      return;
    }
    setIsLoading(true);
    pushDiag({ step: "publishing", label: "Création de la formation", status: "pending" });
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
      pushDiag({ step: "publishing", label: "Création de la formation", status: "ok", detail: `ID ${created?.id?.slice(0, 8)}…` });

      // IA: chapitres édités OU contenu document OU vidéos fournis → génération auto de modules
      const cleanVideos = videoUrls.map(v => v.trim()).filter(Boolean);
      const hasEditedChapters = chapterPreview.length > 0;
      const hasContent = aiContent.trim().length > 50;
      let aiSucceeded = true;
      let modulesInserted = 0;
      if (created?.id && (hasEditedChapters || hasContent || cleanVideos.length > 0)) {
        setAiBusy(true);
        pushDiag({ step: "ai_modules", label: "Génération des chapitres et modules", status: "pending" });
        try {
          const { data: aiData, error: aiErr } = await supabase.functions.invoke("generate-formation-modules", {
            body: {
              formation_id: created.id,
              document_text: hasEditedChapters ? "" : aiContent,
              video_urls: cleanVideos,
              chapters: hasEditedChapters ? chapterPreview : undefined,
            },
          });
          if (aiErr) throw aiErr;
          modulesInserted = aiData?.modules_inserted || 0;
          pushDiag({ step: "ai_modules", label: "Génération des chapitres et modules", status: "ok", detail: `${modulesInserted} module(s) créé(s)` });
        } catch (aiE: any) {
          aiSucceeded = false;
          console.error("AI modules error", aiE);
          const fe = friendlyError(aiE);
          pushDiag({ step: "ai_modules", label: "Génération des chapitres et modules", status: "ko", code: fe.code, detail: fe.description });
          toast({
            title: "Formation publiée — IA non disponible",
            description: `${fe.title}. Vous pouvez ajouter les modules manuellement depuis la page Formation.`,
            variant: "destructive",
          });
        } finally {
          setAiBusy(false);
        }
      }

      if (aiSucceeded) {
        pushDiag({ step: "done", label: "Publication finalisée", status: "ok", detail: "Disponible dans le module Formation" });
        toast({
          title: "✅ Formation publiée",
          description: modulesInserted > 0
            ? `${modulesInserted} module(s) ajouté(s). Disponible dans le module Formation.`
            : "Votre formation est visible dans le module Formation.",
        });
      }

      setForm({ title: "", description: "", category: "Général", level: "beginner", duration_minutes: "60", is_paid: false, price: "0" });
      setCoverFile(null);
      setCoverPreview("");
      setAiContent("");
      setAiFileName("");
      setVideoUrls([""]);
      setChapterPreview([]);
      resetDiag();
      onOpenChange(false);
      onCreated?.();
    } catch (err: any) {
      const fe = friendlyError(err);
      pushDiag({ step: "error", label: "Publication échouée", status: "ko", code: fe.code, detail: fe.description });
      toast({ title: fe.title, description: fe.description, variant: "destructive" });
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
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <Label>Titre *</Label>
              {aiContent.trim().length >= 50 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAutoFillMetadata}
                  disabled={metaLoading || aiBusy}
                  className="gap-1.5 text-[11px] h-7"
                >
                  {metaLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3 text-primary" />}
                  Auto-remplir avec l'IA
                </Button>
              )}
            </div>
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Ex: Cultiver le maïs en saison sèche" required />
            {aiContent.trim().length >= 50 && !form.title.trim() && (
              <p className="text-[10px] text-muted-foreground">
                Astuce : cliquez sur « Auto-remplir avec l'IA » pour générer titre, description et catégorie depuis votre document.
              </p>
            )}
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
              <br />
              <span className="text-[10px]">Taille max document : 10 Mo. Formats : .txt, .md, .pdf, .docx</span>
            </p>

            <div className="space-y-1.5">
              <input id="ai-doc" type="file" accept=".txt,.md,.pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={handleAiFile} className="hidden" />
              <label htmlFor="ai-doc" className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-primary/40 hover:border-primary/70 cursor-pointer text-xs text-foreground bg-background">
                <FileText className="w-3.5 h-3.5 text-primary" />
                {aiFileName ? aiFileName : "Importer un document (.txt, .md, .pdf, .docx) — max 10 Mo"}
              </label>
              <Textarea
                value={aiContent}
                onChange={(e) => { setAiContent(e.target.value); if (chapterPreview.length) setChapterPreview([]); }}
                rows={4}
                placeholder="Ou collez ici le contenu du document à structurer en chapitres…"
                className="text-xs"
              />
              {aiContent.trim().length >= 50 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handlePreviewChapters}
                  disabled={previewLoading || aiBusy}
                  className="gap-1.5 text-[11px] h-8"
                >
                  {previewLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Eye className="w-3.5 h-3.5" />}
                  {chapterPreview.length ? "Régénérer la prévisualisation" : "Prévisualiser les chapitres IA"}
                </Button>
              )}
            </div>

            {/* Diagnostic panel */}
            {diagnostics.length > 0 && (
              <div className="rounded-lg border border-border bg-background/60 p-2.5 space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-[11px] font-semibold flex items-center gap-1.5">
                    <Sparkles className="w-3 h-3 text-primary" />
                    Diagnostic en direct
                  </Label>
                  <button type="button" onClick={resetDiag} className="text-[10px] text-muted-foreground hover:text-foreground underline">
                    Effacer
                  </button>
                </div>
                <ul className="space-y-1">
                  {diagnostics.map((d, i) => (
                    <li key={i} className="flex items-start gap-2 text-[11px]">
                      <span
                        className={`mt-1 inline-block w-1.5 h-1.5 rounded-full shrink-0 ${
                          d.status === "ok" ? "bg-primary" :
                          d.status === "ko" ? "bg-destructive" :
                          d.status === "warn" ? "bg-yellow-500" : "bg-muted-foreground animate-pulse"
                        }`}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={d.status === "ko" ? "text-destructive font-medium" : "text-foreground"}>
                            {d.label}
                          </span>
                          {d.code && (
                            <code className="text-[9px] px-1 py-0.5 rounded bg-muted text-muted-foreground">
                              {d.code}
                            </code>
                          )}
                        </div>
                        {d.detail && (
                          <p className="text-[10px] text-muted-foreground break-words">{d.detail}</p>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Corrective actions when AI failed or extraction is incomplete */}
            {(lastAiError || aiBlocksPublish || extractionFailed || aiContentTooShort) && (
              <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 space-y-2">
                <div className="flex items-center gap-1.5">
                  <X className="w-3.5 h-3.5 text-destructive" />
                  <Label className="text-xs font-semibold text-destructive">
                    {lastAiError ? `Action requise — ${lastAiError.label}` : "Action requise avant publication"}
                  </Label>
                </div>
                {lastAiError?.detail && (
                  <p className="text-[11px] text-foreground">{lastAiError.detail}</p>
                )}
                <ul className="space-y-1.5 text-[11px]">
                  {(lastAiError?.code === "EMPTY_DOC" || lastAiError?.code === "PDF_SCAN" || lastAiError?.code === "EMPTY_TEXT" || aiContentTooShort) && (
                    <li className="flex items-start gap-2">
                      <span className="text-primary">→</span>
                      <button
                        type="button"
                        onClick={() => document.getElementById("ai-doc")?.scrollIntoView({ behavior: "smooth", block: "center" })}
                        className="text-left underline hover:text-primary"
                      >
                        Collez le texte du document manuellement (zone IA ci-dessus, min. 50 caractères).
                      </button>
                    </li>
                  )}
                  {(lastAiError?.code === "FILE_TOO_LARGE" || lastAiError?.code === "AI_FAIL") && (
                    <li className="flex items-start gap-2">
                      <span className="text-primary">→</span>
                      <span>Raccourcissez le document à <strong>≤10 Mo</strong> et conservez les passages clés (titres, étapes, conseils).</span>
                    </li>
                  )}
                  {lastAiError?.code === "BAD_FORMAT" && (
                    <li className="flex items-start gap-2">
                      <span className="text-primary">→</span>
                      <span>Convertissez votre fichier en <strong>.pdf</strong>, <strong>.docx</strong>, <strong>.txt</strong> ou <strong>.md</strong> avant import.</span>
                    </li>
                  )}
                  {lastAiError?.code === "PDF_PROTECTED" && (
                    <li className="flex items-start gap-2">
                      <span className="text-primary">→</span>
                      <span>Retirez le mot de passe du PDF puis réimportez.</span>
                    </li>
                  )}
                  {lastAiError?.code === "429" && (
                    <li className="flex items-start gap-2">
                      <span className="text-primary">→</span>
                      <span>Attendez 60 secondes puis cliquez à nouveau sur « Prévisualiser les chapitres IA ».</span>
                    </li>
                  )}
                  {lastAiError?.code === "402" && (
                    <li className="flex items-start gap-2">
                      <span className="text-primary">→</span>
                      <span>Crédits IA épuisés — rechargez dans <strong>Paramètres &gt; Espace de travail &gt; Utilisation</strong>.</span>
                    </li>
                  )}
                  {lastAiError?.code === "NETWORK" && (
                    <li className="flex items-start gap-2">
                      <span className="text-primary">→</span>
                      <span>Vérifiez votre connexion internet puis réessayez.</span>
                    </li>
                  )}
                  {aiBlocksPublish && !lastAiError && (
                    <li className="flex items-start gap-2">
                      <span className="text-primary">→</span>
                      <button
                        type="button"
                        onClick={handlePreviewChapters}
                        disabled={previewLoading || aiBusy}
                        className="text-left underline hover:text-primary disabled:opacity-50"
                      >
                        Cliquez pour générer la prévisualisation des chapitres IA maintenant.
                      </button>
                    </li>
                  )}
                  <li className="flex items-start gap-2">
                    <span className="text-primary">→</span>
                    <span>Ou ajoutez au moins une <strong>vidéo</strong> ci-dessous pour publier sans IA.</span>
                  </li>
                </ul>
              </div>
            )}

            {chapterPreview.length > 0 && (
              <div className="space-y-2 p-3 bg-background border border-primary/30 rounded-lg">
                <div className="flex items-center gap-1.5">
                  <Edit3 className="w-3.5 h-3.5 text-primary" />
                  <Label className="text-xs font-semibold">
                    {chapterPreview.length} chapitre(s) — modifiez avant publication
                  </Label>
                </div>
                {chapterPreview.map((ch, idx) => (
                  <div key={idx} className="space-y-1.5 p-2.5 rounded-md bg-muted/40 border border-border">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-primary shrink-0">#{idx + 1}</span>
                      <Input
                        value={ch.title}
                        onChange={(e) => updateChapterField(idx, "title", e.target.value)}
                        placeholder="Titre du chapitre"
                        className="text-xs h-8 flex-1"
                      />
                      <Input
                        type="number"
                        min={1}
                        value={ch.duration_minutes}
                        onChange={(e) => updateChapterField(idx, "duration_minutes", e.target.value)}
                        className="text-xs h-8 w-16"
                        title="Durée (min)"
                      />
                      <Button type="button" variant="ghost" size="icon" onClick={() => removeChapter(idx)} className="h-8 w-8 shrink-0">
                        <Trash2 className="w-3.5 h-3.5 text-destructive" />
                      </Button>
                    </div>
                    <Textarea
                      value={ch.description}
                      onChange={(e) => updateChapterField(idx, "description", e.target.value)}
                      rows={2}
                      placeholder="Description du chapitre"
                      className="text-[11px]"
                    />
                  </div>
                ))}
                <p className="text-[10px] text-muted-foreground italic">
                  ✓ Les chapitres ci-dessus seront utilisés tels quels (l'IA ne sera pas relancée).
                </p>
              </div>
            )}
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
            <Button type="submit" variant="hero" disabled={isLoading || uploading || aiBusy || aiBlocksPublish || (extractionFailed && chapterPreview.length === 0 && cleanVideosCount === 0)}>
              {isLoading || aiBusy ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> {aiBusy ? "Génération IA…" : "Publication…"}</> : <><GraduationCap className="w-4 h-4 mr-2" /> Publier la formation</>}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddFormationModal;
