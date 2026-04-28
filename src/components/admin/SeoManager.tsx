import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { clearSeoCache } from "@/hooks/useSeoSettings";
import { Loader2, Plus, Search, Upload, Sparkles, Image as ImageIcon, Eye, Rocket, AlertTriangle, CheckCircle2, FileEdit, CalendarClock, GitCompare } from "lucide-react";
import { Link } from "react-router-dom";
import { isKnownRoute, suggestRoutes } from "@/lib/appRoutes";
import { normalizeSeoSlug } from "@/lib/seoSlug";

interface SeoRow {
  id: string;
  route: string;
  is_global: boolean;
  title: string | null;
  description: string | null;
  keywords: string | null;
  og_image_url: string | null;
  og_image_sizes?: Record<string, string> | null;
  canonical_path: string | null;
  no_index: boolean;
  is_draft?: boolean;
  published_at?: string | null;
  scheduled_publish_at?: string | null;
}

// Fields that matter for the diff view
const DIFFABLE: Array<{ key: keyof SeoRow; label: string }> = [
  { key: "title", label: "Titre" },
  { key: "description", label: "Description" },
  { key: "keywords", label: "Mots-clés" },
  { key: "og_image_url", label: "Image OG" },
  { key: "canonical_path", label: "URL canonique" },
  { key: "no_index", label: "Désindexer" },
];

const DEFAULT_OG = "https://storage.googleapis.com/gpt-engineer-file-uploads/C3YioAkra3hJ4npw1XZX0HbG8E32/social-images/social-1769858107990-NUKUCONNECT-LOGO5-2.png";

// Slug validation: allow / followed by [a-z0-9-/] segments, no spaces, no caps
const SLUG_RE = /^\/[a-z0-9\-\/]*$/;

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
  const [confirmPublish, setConfirmPublish] = useState(false);
  const [scheduleAt, setScheduleAt] = useState<string>(""); // datetime-local string
  // Snapshot of the last-loaded values, used for the diff view
  const [original, setOriginal] = useState<SeoRow | null>(null);
  // Auto-regenerate OG images when title/description change (debounced)
  const [autoRegenOg, setAutoRegenOg] = useState<boolean>(() => {
    try { return localStorage.getItem("seo_auto_regen_og") === "1"; } catch { return false; }
  });
  const [autoRegenPending, setAutoRegenPending] = useState(false);
  const autoRegenTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
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
      const list = (data as SeoRow[]) || [];
      setRows(list);
      setSelected(prev => {
        const next = prev ? list.find(r => r.id === prev.id) || list[0] : list[0];
        // Refresh the original snapshot whenever we reload from the server
        setOriginal(next ? { ...next } : null);
        return next || null;
      });
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  // Validation of currently-selected route + slug
  const routeValidation = useMemo(() => {
    if (!selected) return { ok: true, message: "" };
    if (selected.is_global || selected.route === "__global__") return { ok: true, message: "Route globale" };
    if (!SLUG_RE.test(selected.route)) {
      return { ok: false, message: "Slug invalide : minuscules, chiffres, tirets et / uniquement (ex: /ma-page)" };
    }
    if (!isKnownRoute(selected.route)) {
      return { ok: false, message: "Cette route n'existe pas dans l'application." };
    }
    return { ok: true, message: "Route valide" };
  }, [selected]);

  const newRouteValidation = useMemo(() => {
    const r = newRoute.trim();
    if (!r) return { ok: false, message: "" };
    if (!SLUG_RE.test(r)) return { ok: false, message: "Slug invalide" };
    if (!isKnownRoute(r)) return { ok: false, message: "Route inconnue" };
    if (rows.some(x => x.route === r)) return { ok: false, message: "Déjà existante" };
    return { ok: true, message: "Route valide" };
  }, [newRoute, rows]);

  const newRouteSuggest = useMemo(
    () => (newRoute && !newRouteValidation.ok ? suggestRoutes(newRoute, 5) : []),
    [newRoute, newRouteValidation.ok]
  );

  const persist = async (extras: Partial<SeoRow> = {}) => {
    if (!selected) return false;
    setSaving(selected.id);
    const cleanCanonical = selected.canonical_path
      ? normalizeSeoSlug(selected.canonical_path)
      : selected.canonical_path;
    const { error } = await (supabase as any)
      .from("seo_settings")
      .update({
        title: selected.title,
        description: selected.description,
        keywords: selected.keywords,
        og_image_url: selected.og_image_url,
        canonical_path: cleanCanonical,
        no_index: selected.no_index,
        ...extras,
      })
      .eq("id", selected.id);
    setSaving(null);
    if (error) {
      const msg = error.message || "Erreur";
      let friendly = msg;
      if (msg.includes("unknown_route")) friendly = "Cette route n'existe pas dans l'application. Enregistrez en brouillon ou ajoutez-la à la liste autorisée.";
      else if (msg.includes("invalid_slug")) friendly = "Le slug n'est pas valide.";
      toast({ title: "Erreur d'enregistrement", description: friendly, variant: "destructive" });
      return false;
    }
    return true;
  };

  // Save as draft (does not affect visitors). Cancels any pending schedule.
  const saveDraft = async () => {
    const ok = await persist({ is_draft: true, scheduled_publish_at: null } as any);
    if (ok) {
      toast({ title: "Brouillon enregistré", description: "Aucun changement public. Publiez quand vous êtes prêt." });
      load();
    }
  };

  // Publish immediately
  const doPublish = async () => {
    if (!selected) return;
    if (!routeValidation.ok) {
      toast({ title: "Publication bloquée", description: routeValidation.message, variant: "destructive" });
      return;
    }
    const ok = await persist({ is_draft: false, published_at: new Date().toISOString(), scheduled_publish_at: null } as any);
    if (!ok) return;
    clearSeoCache();
    toast({ title: "Publié", description: `${selected.route} • cache invalidé.` });
    load();
  };

  // Schedule publication for later (kept as draft until time arrives)
  const doSchedule = async () => {
    if (!selected || !scheduleAt) return;
    if (!routeValidation.ok) {
      toast({ title: "Planification bloquée", description: routeValidation.message, variant: "destructive" });
      return;
    }
    const iso = new Date(scheduleAt).toISOString();
    if (new Date(iso).getTime() <= Date.now()) {
      toast({ title: "Date invalide", description: "Choisissez une date dans le futur.", variant: "destructive" });
      return;
    }
    const ok = await persist({ is_draft: true, scheduled_publish_at: iso } as any);
    if (ok) {
      toast({ title: "Publication planifiée", description: `Sera publié automatiquement le ${new Date(iso).toLocaleString()}.` });
      setScheduleAt("");
      load();
    }
  };

  const addRoute = async () => {
    const route = normalizeSeoSlug(newRoute);
    if (!newRouteValidation.ok) {
      toast({ title: "Route invalide", description: newRouteValidation.message, variant: "destructive" });
      return;
    }
    const { data, error } = await (supabase as any)
      .from("seo_settings")
      .insert({ route, title: route, description: "", is_draft: true })
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
    setSelected({ ...selected, og_image_url: data.og_image_url, og_image_sizes: data.og_image_sizes || selected.og_image_sizes });
    clearSeoCache(selected.route);
    const sizesCount = data.og_image_sizes ? Object.keys(data.og_image_sizes).length : 1;
    toast({ title: "Image OG générée", description: `${sizesCount} taille(s) sauvegardée(s).` });
    load();
  };

  // Persist toggle preference
  useEffect(() => {
    try { localStorage.setItem("seo_auto_regen_og", autoRegenOg ? "1" : "0"); } catch {}
  }, [autoRegenOg]);

  // Auto-regenerate OG images (all sizes) when title/description changes,
  // but only on draft entries (never silently regenerate published images).
  useEffect(() => {
    if (!autoRegenOg || !selected || !original) return;
    if (!selected.is_draft) return; // safety: only touch drafts
    const titleChanged = (selected.title || "") !== (original.title || "");
    const descChanged = (selected.description || "") !== (original.description || "");
    if (!titleChanged && !descChanged) return;
    if (!routeValidation.ok && !selected.is_global) return;

    if (autoRegenTimer.current) clearTimeout(autoRegenTimer.current);
    setAutoRegenPending(true);
    autoRegenTimer.current = setTimeout(async () => {
      setAutoRegenPending(false);
      await aiGenerateOg();
    }, 2500);

    return () => {
      if (autoRegenTimer.current) clearTimeout(autoRegenTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.title, selected?.description, autoRegenOg]);

  const handleUpload = async (file: File) => {
    if (!selected) return;
    setUploading(true);
    const safeRoute = selected.route.replace(/[^a-zA-Z0-9_-]/g, "_") || "global";
    const ext = file.name.split(".").pop() || "png";
    const path = `${safeRoute}-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from("seo-og-images").upload(path, file, {
      contentType: file.type, upsert: true,
    });
    if (upErr) {
      setUploading(false);
      toast({ title: "Échec de l'upload", description: upErr.message, variant: "destructive" });
      return;
    }
    const { data: pub } = supabase.storage.from("seo-og-images").getPublicUrl(path);
    const { error: dbErr } = await (supabase as any)
      .from("seo_settings").update({ og_image_url: pub.publicUrl }).eq("id", selected.id);
    setUploading(false);
    if (dbErr) {
      toast({ title: "Image envoyée mais non liée", description: dbErr.message, variant: "destructive" });
      return;
    }
    setSelected({ ...selected, og_image_url: pub.publicUrl });
    clearSeoCache(selected.route);
    toast({ title: "Image OG mise à jour" });
    load();
  };

  const filtered = rows.filter(r =>
    r.route.toLowerCase().includes(search.toLowerCase()) ||
    (r.title || "").toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return <div className="flex items-center justify-center p-8"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  }

  const publishDisabled = !routeValidation.ok || saving === selected?.id;

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
          <div className="space-y-1 pt-2">
            <div className="flex gap-2">
              <Input
                value={newRoute}
                onChange={e => setNewRoute(e.target.value)}
                placeholder="/nouvelle-route"
                className="h-9"
              />
              <Button size="sm" onClick={addRoute} disabled={!newRouteValidation.ok}><Plus className="w-4 h-4" /></Button>
            </div>
            {newRoute && (
              <p className={`text-[10px] flex items-center gap-1 ${newRouteValidation.ok ? "text-emerald-600" : "text-amber-600"}`}>
                {newRouteValidation.ok ? <CheckCircle2 className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                {newRouteValidation.message || "Vérification..."}
              </p>
            )}
            {newRouteSuggest.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {newRouteSuggest.map(s => (
                  <button key={s} onClick={() => setNewRoute(s)} className="text-[10px] px-1.5 py-0.5 rounded bg-muted hover:bg-muted/80">{s}</button>
                ))}
              </div>
            )}
          </div>
          <Link to="/admin/seo-preview" className="text-[11px] text-primary hover:underline inline-flex items-center gap-1 pt-1">
            <Eye className="w-3 h-3" /> Page de test SEO
          </Link>
        </CardHeader>
        <CardContent className="p-2 max-h-[60vh] overflow-y-auto space-y-1">
          {filtered.map(r => (
            <button
              key={r.id}
              onClick={() => { setSelected(r); setOriginal({ ...r }); setScheduleAt(""); }}
              className={`w-full text-left px-3 py-2 rounded-md text-xs transition-colors ${
                selected?.id === r.id ? "bg-primary/10 text-primary" : "hover:bg-muted"
              }`}
            >
              <div className="font-medium truncate flex items-center gap-1.5">
                <span className="truncate">{r.is_global ? "🌐 Global (défaut)" : r.route}</span>
                {r.is_draft && <Badge variant="secondary" className="text-[9px] px-1 py-0 h-4">brouillon</Badge>}
              </div>
              {r.title && <div className="text-muted-foreground truncate text-[11px]">{r.title}</div>}
            </button>
          ))}
        </CardContent>
      </Card>

      {/* Editor + preview */}
      {selected && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  {selected.is_global ? "Paramètres SEO globaux" : `Édition : ${selected.route}`}
                  {selected.is_draft && <Badge variant="secondary">Brouillon</Badge>}
                </CardTitle>
                <CardDescription>
                  {selected.published_at
                    ? `Dernière publication : ${new Date(selected.published_at).toLocaleString()}`
                    : "Jamais publié"}
                </CardDescription>
              </div>
              <Button asChild variant="outline" size="sm">
                <Link to={`/admin/seo-preview?route=${encodeURIComponent(selected.route)}`}>
                  <Eye className="w-4 h-4" /> Aperçu & historique
                </Link>
              </Button>
            </div>
            {!routeValidation.ok && !selected.is_global && (
              <div className="mt-2 flex items-center gap-2 text-xs text-amber-700 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-md p-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{routeValidation.message} La publication est désactivée.</span>
              </div>
            )}
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
                  <input ref={fileRef} type="file" accept="image/*" className="hidden"
                    onChange={e => e.target.files?.[0] && handleUpload(e.target.files[0])} />
                  <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
                    {uploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                    Uploader
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={aiGenerateOg} disabled={aiBusy === "image"}>
                    {aiBusy === "image" ? <Loader2 className="w-3 h-3 animate-spin" /> : <ImageIcon className="w-3 h-3" />}
                    Générer (IA)
                  </Button>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">URL canonique</Label>
                <Input value={selected.canonical_path || ""} onChange={e => setSelected({ ...selected, canonical_path: e.target.value })} placeholder="/ma-page" />
              </div>
            </div>
            <div className="flex items-center justify-between rounded-md border p-3 bg-muted/30">
              <div className="pr-3">
                <Label className="text-xs flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" /> Régénération auto de l'image OG
                </Label>
                <p className="text-[11px] text-muted-foreground">
                  Quand le titre ou la description change (brouillon uniquement), l'IA recrée automatiquement les images OG (toutes tailles) après 2,5 s.
                  {autoRegenPending && <span className="ml-1 text-amber-600">• régénération en attente…</span>}
                  {aiBusy === "image" && autoRegenOg && <span className="ml-1 text-primary">• génération en cours…</span>}
                </p>
              </div>
              <Switch checked={autoRegenOg} onCheckedChange={setAutoRegenOg} />
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

            {/* Scheduled publish info */}
            {selected.scheduled_publish_at && (
              <div className="rounded-md border border-blue-200 bg-blue-50 dark:bg-blue-950/30 dark:border-blue-900 p-3 flex items-center gap-2 text-xs">
                <CalendarClock className="w-4 h-4 text-blue-600" />
                <span>Publication planifiée : <strong>{new Date(selected.scheduled_publish_at).toLocaleString()}</strong></span>
              </div>
            )}

            {/* Schedule input */}
            <div className="rounded-md border p-3 space-y-2">
              <Label className="text-xs flex items-center gap-1.5"><CalendarClock className="w-3.5 h-3.5" /> Planifier une publication</Label>
              <div className="flex flex-col sm:flex-row gap-2">
                <Input
                  type="datetime-local"
                  value={scheduleAt}
                  onChange={e => setScheduleAt(e.target.value)}
                  min={new Date(Date.now() + 60_000).toISOString().slice(0, 16)}
                  className="h-9"
                />
                <Button size="sm" variant="outline" onClick={doSchedule} disabled={!scheduleAt || !routeValidation.ok || saving === selected.id}>
                  <CalendarClock className="w-4 h-4" /> Planifier
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground">
                Reste en brouillon jusqu'à la date choisie, puis devient public automatiquement.
              </p>
            </div>

            <div className="flex flex-wrap gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={aiAutofill} disabled={aiBusy === "autofill"}>
                {aiBusy === "autofill" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                Remplir (IA)
              </Button>
              <Button variant="secondary" size="sm" onClick={saveDraft} disabled={saving === selected.id}>
                {saving === selected.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileEdit className="w-4 h-4" />}
                Enregistrer brouillon
              </Button>
              <Button size="sm" onClick={() => setConfirmPublish(true)} disabled={publishDisabled}>
                <Rocket className="w-4 h-4" />
                Publier maintenant
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Diff + confirmation dialog */}
      <Dialog open={confirmPublish} onOpenChange={setConfirmPublish}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><GitCompare className="w-4 h-4" /> Comparer & publier</DialogTitle>
            <DialogDescription>
              Vérifiez les changements avant qu'ils soient servis aux visiteurs et aux crawlers.
              {selected && <><br /><span className="font-mono text-[11px]">{selected.route}</span></>}
            </DialogDescription>
          </DialogHeader>

          {selected && (
            <div className="space-y-2 text-xs">
              {(() => {
                const changes = DIFFABLE.filter(({ key }) => {
                  const a = (original?.[key] ?? "") as any;
                  const b = (selected[key] ?? "") as any;
                  return String(a) !== String(b);
                });
                if (changes.length === 0) {
                  return <p className="text-muted-foreground italic">Aucun changement par rapport à la version actuelle.</p>;
                }
                return changes.map(({ key, label }) => {
                  const oldVal = String(original?.[key] ?? "");
                  const newVal = String(selected[key] ?? "");
                  return (
                    <div key={String(key)} className="border rounded-md overflow-hidden">
                      <div className="px-3 py-1.5 bg-muted/50 font-semibold">{label}</div>
                      <div className="grid sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x">
                        <div className="p-2 bg-red-50 dark:bg-red-950/20">
                          <p className="text-[10px] uppercase text-red-700 dark:text-red-400 mb-1">Actuel</p>
                          <p className="break-all whitespace-pre-wrap font-mono">{oldVal || <span className="italic text-muted-foreground">vide</span>}</p>
                        </div>
                        <div className="p-2 bg-emerald-50 dark:bg-emerald-950/20">
                          <p className="text-[10px] uppercase text-emerald-700 dark:text-emerald-400 mb-1">Nouveau</p>
                          <p className="break-all whitespace-pre-wrap font-mono">{newVal || <span className="italic text-muted-foreground">vide</span>}</p>
                        </div>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmPublish(false)}>Annuler</Button>
            <Button onClick={() => { setConfirmPublish(false); doPublish(); }}>
              <Rocket className="w-4 h-4" /> Publier maintenant
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SeoManager;
