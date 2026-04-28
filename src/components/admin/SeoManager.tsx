import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { clearSeoCache } from "@/hooks/useSeoSettings";
import { Loader2, Save, Plus, Search, Upload, Sparkles, Image as ImageIcon, Eye } from "lucide-react";
import { Link } from "react-router-dom";

interface SeoRow {
  id: string;
  route: string;
  is_global: boolean;
  title: string | null;
  description: string | null;
  keywords: string | null;
  og_image_url: string | null;
  canonical_path: string | null;
  no_index: boolean;
}

const DEFAULT_OG = "https://storage.googleapis.com/gpt-engineer-file-uploads/C3YioAkra3hJ4npw1XZX0HbG8E32/social-images/social-1769858107990-NUKUCONNECT-LOGO5-2.png";

const SeoManager = () => {
  const { toast } = useToast();
  const [rows, setRows] = useState<SeoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<SeoRow | null>(null);
  const [newRoute, setNewRoute] = useState("");
  const [aiBusy, setAiBusy] = useState<"autofill" | "image" | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("seo_settings")
      .select("*")
      .order("is_global", { ascending: false })
      .order("route", { ascending: true });
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      setRows((data as SeoRow[]) || []);
      setSelected(prev => {
        if (!prev) return (data?.[0] as SeoRow) || null;
        return (data as SeoRow[])?.find(r => r.id === prev.id) || prev;
      });
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!selected) return;
    setSaving(selected.id);
    const { error } = await (supabase as any)
      .from("seo_settings")
      .update({
        title: selected.title,
        description: selected.description,
        keywords: selected.keywords,
        og_image_url: selected.og_image_url,
        canonical_path: selected.canonical_path,
        no_index: selected.no_index,
      })
      .eq("id", selected.id);
    setSaving(null);
    if (error) {
      toast({ title: "Erreur d'enregistrement", description: error.message, variant: "destructive" });
    } else {
      clearSeoCache(selected.route);
      toast({ title: "SEO enregistré", description: `Mise à jour de ${selected.route}` });
      load();
    }
  };

  const addRoute = async () => {
    const route = newRoute.trim();
    if (!route.startsWith("/")) {
      toast({ title: "Format invalide", description: "La route doit commencer par /", variant: "destructive" });
      return;
    }
    const { data, error } = await (supabase as any)
      .from("seo_settings")
      .insert({ route, title: route, description: "" })
      .select()
      .single();
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      setNewRoute("");
      setSelected(data as SeoRow);
      load();
    }
  };

  // AI autofill via edge function
  const aiAutofill = async () => {
    if (!selected) return;
    setAiBusy("autofill");
    const { data, error } = await supabase.functions.invoke("seo-ai-assist", {
      body: { action: "autofill", route: selected.route, context: selected.description || selected.title || "" },
    });
    setAiBusy(null);
    if (error || !data?.success) {
      toast({ title: "Échec auto-remplissage", description: error?.message || data?.error || "Erreur IA", variant: "destructive" });
      return;
    }
    const d = data.data || {};
    setSelected({
      ...selected,
      title: d.title || selected.title,
      description: d.description || selected.description,
      keywords: d.keywords || selected.keywords,
      canonical_path: d.canonical_path || selected.canonical_path || (selected.route === "__global__" ? "/" : selected.route),
      og_image_url: selected.og_image_url || DEFAULT_OG,
    });
    toast({ title: "Champs remplis par l'IA", description: "Vérifiez puis enregistrez." });
  };

  // AI generate OG image via edge function (saves to bucket + DB)
  const aiGenerateOg = async () => {
    if (!selected) return;
    setAiBusy("image");
    const { data, error } = await supabase.functions.invoke("seo-ai-assist", {
      body: { action: "generate_og", route: selected.route, context: selected.description || selected.title || "" },
    });
    setAiBusy(null);
    if (error || !data?.success) {
      toast({ title: "Échec génération image", description: error?.message || data?.error || "Erreur IA", variant: "destructive" });
      return;
    }
    setSelected({ ...selected, og_image_url: data.og_image_url });
    clearSeoCache(selected.route);
    toast({ title: "Image OG générée", description: "Image sauvegardée et liée à la page." });
    load();
  };

  // Direct upload of image to bucket
  const handleUpload = async (file: File) => {
    if (!selected) return;
    setUploading(true);
    const safeRoute = selected.route.replace(/[^a-zA-Z0-9_-]/g, "_") || "global";
    const ext = file.name.split(".").pop() || "png";
    const path = `${safeRoute}-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from("seo-og-images").upload(path, file, {
      contentType: file.type,
      upsert: true,
    });
    if (upErr) {
      setUploading(false);
      toast({ title: "Échec de l'upload", description: upErr.message, variant: "destructive" });
      return;
    }
    const { data: pub } = supabase.storage.from("seo-og-images").getPublicUrl(path);
    const { error: dbErr } = await (supabase as any)
      .from("seo_settings")
      .update({ og_image_url: pub.publicUrl })
      .eq("id", selected.id);
    setUploading(false);
    if (dbErr) {
      toast({ title: "Image envoyée mais non liée", description: dbErr.message, variant: "destructive" });
      return;
    }
    setSelected({ ...selected, og_image_url: pub.publicUrl });
    clearSeoCache(selected.route);
    toast({ title: "Image OG mise à jour", description: "Sauvegardée dans le bucket." });
    load();
  };

  const filtered = rows.filter(r =>
    r.route.toLowerCase().includes(search.toLowerCase()) ||
    (r.title || "").toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return <div className="flex items-center justify-center p-8"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
      {/* Routes list */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Pages</CardTitle>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher" className="pl-8 h-9" />
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <Input value={newRoute} onChange={e => setNewRoute(e.target.value)} placeholder="/nouvelle-route" className="h-9" />
            <Button size="sm" onClick={addRoute}><Plus className="w-4 h-4" /></Button>
          </div>
          <Link to="/admin/seo-preview" className="text-[11px] text-primary hover:underline inline-flex items-center gap-1 pt-1">
            <Eye className="w-3 h-3" /> Page de test SEO
          </Link>
        </CardHeader>
        <CardContent className="p-2 max-h-[60vh] overflow-y-auto space-y-1">
          {filtered.map(r => (
            <button
              key={r.id}
              onClick={() => setSelected(r)}
              className={`w-full text-left px-3 py-2 rounded-md text-xs transition-colors ${
                selected?.id === r.id ? "bg-primary/10 text-primary" : "hover:bg-muted"
              }`}
            >
              <div className="font-medium truncate">{r.is_global ? "🌐 Global (défaut)" : r.route}</div>
              {r.title && <div className="text-muted-foreground truncate text-[11px]">{r.title}</div>}
            </button>
          ))}
        </CardContent>
      </Card>

      {/* Editor + preview */}
      {selected && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{selected.is_global ? "Paramètres SEO globaux" : `Édition : ${selected.route}`}</CardTitle>
            <CardDescription>Ces valeurs surchargent le SEO codé en dur de la page.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Titre SEO ({(selected.title || "").length}/60)</Label>
              <Input value={selected.title || ""} onChange={e => setSelected({ ...selected, title: e.target.value })} maxLength={120} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Description ({(selected.description || "").length}/160)</Label>
              <Textarea rows={3} value={selected.description || ""} onChange={e => setSelected({ ...selected, description: e.target.value })} maxLength={300} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Mots-clés (séparés par des virgules)</Label>
              <Input value={selected.keywords || ""} onChange={e => setSelected({ ...selected, keywords: e.target.value })} />
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Image OG (1200x630)</Label>
                <Input value={selected.og_image_url || ""} onChange={e => setSelected({ ...selected, og_image_url: e.target.value })} placeholder="https://..." />
                <div className="flex flex-wrap gap-2 pt-1">
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={e => e.target.files?.[0] && handleUpload(e.target.files[0])}
                  />
                  <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
                    {uploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                    Uploader
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={aiGenerateOg} disabled={aiBusy === "image"}>
                    {aiBusy === "image" ? <Loader2 className="w-3 h-3 animate-spin" /> : <ImageIcon className="w-3 h-3" />}
                    Générer l'image OG (IA)
                  </Button>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">URL canonique</Label>
                <Input value={selected.canonical_path || ""} onChange={e => setSelected({ ...selected, canonical_path: e.target.value })} placeholder="/ma-page" />
              </div>
            </div>
            <div className="flex items-center justify-between rounded-md border p-3">
              <div>
                <Label className="text-xs">Désindexer (noindex)</Label>
                <p className="text-[11px] text-muted-foreground">Empêche Google d'indexer cette page</p>
              </div>
              <Switch checked={selected.no_index} onCheckedChange={v => setSelected({ ...selected, no_index: v })} />
            </div>

            {/* Google preview */}
            <div className="rounded-md border p-3 bg-muted/30">
              <p className="text-xs font-semibold mb-2">Aperçu Google</p>
              <div className="space-y-1">
                <p className="text-[11px] text-muted-foreground truncate">www.nukuconnect.com{selected.canonical_path || selected.route}</p>
                <p className="text-base text-blue-700 dark:text-blue-400 truncate">{selected.title || "Titre"}</p>
                <p className="text-xs text-muted-foreground line-clamp-2">{selected.description || "Description"}</p>
              </div>
            </div>

            {/* Social preview */}
            <div className="rounded-md border overflow-hidden">
              <div className="aspect-[1200/630] bg-muted flex items-center justify-center">
                {selected.og_image_url ? (
                  <img src={selected.og_image_url} alt="OG preview" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-xs text-muted-foreground">Aucune image OG</span>
                )}
              </div>
              <div className="p-3 bg-card">
                <p className="text-[11px] uppercase text-muted-foreground">www.nukuconnect.com</p>
                <p className="text-sm font-semibold truncate">{selected.title}</p>
                <p className="text-xs text-muted-foreground line-clamp-2">{selected.description}</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={aiAutofill} disabled={aiBusy === "autofill"}>
                {aiBusy === "autofill" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                Remplir automatiquement (IA)
              </Button>
              <Button size="sm" onClick={save} disabled={saving === selected.id}>
                {saving === selected.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Enregistrer
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default SeoManager;
