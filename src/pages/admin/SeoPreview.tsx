import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loader2, ArrowLeft, RefreshCw, ExternalLink, Copy, AlertTriangle, CheckCircle2, History, Globe, Smartphone, RotateCcw } from "lucide-react";
import { APP_ROUTES, isKnownRoute, suggestRoutes } from "@/lib/appRoutes";
import { normalizeSeoSlug, isValidSlugShape } from "@/lib/seoSlug";
import { clearSeoCache } from "@/hooks/useSeoSettings";

interface SeoRow {
  id?: string;
  route: string;
  title: string | null;
  description: string | null;
  keywords: string | null;
  og_image_url: string | null;
  og_image_sizes?: Record<string, string> | null;
  canonical_path: string | null;
  no_index: boolean;
}

interface HistoryRow {
  id: string;
  seo_settings_id: string;
  route: string;
  title: string | null;
  description: string | null;
  keywords: string | null;
  og_image_url: string | null;
  og_image_sizes?: Record<string, string> | null;
  canonical_path: string | null;
  no_index: boolean;
  is_draft: boolean;
  action: string;
  changed_by_email: string | null;
  created_at: string;
}

const BASE_URL = "https://www.nukuconnect.com";
const SITE_NAME = "NUKUCONNECT";
const DEFAULT_DESC = "NUKUCONNECT : la marketplace agricole intelligente d'Afrique.";
const DEFAULT_IMAGE = "https://storage.googleapis.com/gpt-engineer-file-uploads/C3YioAkra3hJ4npw1XZX0HbG8E32/social-images/social-1769858107990-NUKUCONNECT-LOGO5-2.png";

const SeoPreview = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [params] = useSearchParams();
  const [route, setRoute] = useState(params.get("route") || "/");
  const [loading, setLoading] = useState(false);
  const [row, setRow] = useState<SeoRow | null>(null);
  const [globalRow, setGlobalRow] = useState<SeoRow | null>(null);
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [showSuggest, setShowSuggest] = useState(false);
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [restoreCandidate, setRestoreCandidate] = useState<HistoryRow | null>(null);
  const [liveTags, setLiveTags] = useState<any | null>(null);
  const [liveBusy, setLiveBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u?.user) { setAuthorized(false); return; }
      const { data } = await (supabase as any)
        .from("user_roles").select("role")
        .eq("user_id", u.user.id).eq("role", "admin").maybeSingle();
      setAuthorized(!!data);
    })();
  }, []);

  const fetchRow = async () => {
    // Refuse to load tags for an unknown / malformed route, even if forced via URL.
    const normalized = normalizeSeoSlug(route);
    if (!isValidSlugShape(route) || !isKnownRoute(normalized)) {
      setRow(null);
      setGlobalRow(null);
      setHistory([]);
      setLiveTags(null);
      toast({
        title: "Route inconnue",
        description: "Cette route n'existe pas dans l'application. Aucun tag SEO n'est affiché.",
        variant: "destructive",
      });
      return;
    }
    setLoading(true);
    setLiveTags(null);
    const [{ data: r }, { data: g }] = await Promise.all([
      (supabase as any).from("seo_settings").select("*").eq("route", normalized).maybeSingle(),
      (supabase as any).from("seo_settings").select("*").eq("route", "__global__").maybeSingle(),
    ]);
    setRow(r as SeoRow | null);
    setGlobalRow(g as SeoRow | null);
    setLoading(false);
    if (r?.id) loadHistory(r.id);
    else setHistory([]);
  };

  const loadHistory = async (settingsId: string) => {
    setHistoryLoading(true);
    const { data } = await (supabase as any)
      .from("seo_settings_history")
      .select("*")
      .eq("seo_settings_id", settingsId)
      .order("created_at", { ascending: false })
      .limit(50);
    setHistory((data as HistoryRow[]) || []);
    setHistoryLoading(false);
  };

  useEffect(() => { if (authorized) fetchRow(); /* eslint-disable-next-line */ }, [authorized]);

  const normalizedRoute = useMemo(() => normalizeSeoSlug(route), [route]);
  const slugShapeOk = useMemo(() => isValidSlugShape(route), [route]);
  const known = isKnownRoute(normalizedRoute);
  const routeOk = slugShapeOk && known;
  const suggestions = useMemo(() => suggestRoutes(route, 8), [route]);

  const computed = useMemo(() => {
    const r = row || ({} as Partial<SeoRow>);
    const g = globalRow || ({} as Partial<SeoRow>);
    const title = r.title || g.title;
    const description = r.description || g.description || DEFAULT_DESC;
    const image = r.og_image_url || g.og_image_url || DEFAULT_IMAGE;
    const imageSquare = (r.og_image_sizes?.["640x640"]) || (g.og_image_sizes?.["640x640"]) || image;
    const canonical = r.canonical_path || g.canonical_path || route;
    const noIndex = r.no_index ?? g.no_index ?? false;
    const keywords = r.keywords || g.keywords;
    const fullTitle = title ? `${title} | ${SITE_NAME}` : `${SITE_NAME} - Marketplace Agricole Intelligent d'Afrique`;
    const canonicalUrl = `${BASE_URL}${canonical}`;
    return { fullTitle, description, image, imageSquare, canonicalUrl, noIndex, keywords, source: row ? "BDD (route)" : globalRow ? "BDD (global)" : "Code par défaut" };
  }, [row, globalRow, route]);

  const jsonLd = {
    "@context": "https://schema.org", "@type": "WebPage",
    name: computed.fullTitle, description: computed.description, url: computed.canonicalUrl, image: computed.image,
  };

  const htmlSnippet = useMemo(() => {
    const esc = (s: string) => String(s).replace(/"/g, "&quot;");
    const robots = computed.noIndex ? "noindex, nofollow" : "index, follow";
    return [
      `<title>${computed.fullTitle}</title>`,
      `<meta name="description" content="${esc(computed.description)}" />`,
      computed.keywords ? `<meta name="keywords" content="${esc(computed.keywords)}" />` : "",
      `<meta name="robots" content="${robots}" />`,
      `<link rel="canonical" href="${computed.canonicalUrl}" />`,
      ``,
      `<meta property="og:type" content="website" />`,
      `<meta property="og:title" content="${esc(computed.fullTitle)}" />`,
      `<meta property="og:description" content="${esc(computed.description)}" />`,
      `<meta property="og:url" content="${computed.canonicalUrl}" />`,
      `<meta property="og:image" content="${computed.image}" />`,
      `<meta property="og:image" content="${computed.imageSquare}" />`,
      ``,
      `<meta name="twitter:card" content="summary_large_image" />`,
      `<meta name="twitter:title" content="${esc(computed.fullTitle)}" />`,
      `<meta name="twitter:description" content="${esc(computed.description)}" />`,
      `<meta name="twitter:image" content="${computed.image}" />`,
      ``,
      `<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>`,
    ].filter(Boolean).join("\n");
  }, [computed, jsonLd]);

  const copyHtml = async () => {
    try {
      await navigator.clipboard.writeText(htmlSnippet);
      toast({ title: "HTML copié" });
    } catch {
      toast({ title: "Copie échouée", variant: "destructive" });
    }
  };

  const fetchLive = async () => {
    setLiveBusy(true);
    const { data, error } = await supabase.functions.invoke("seo-og-fetch", {
      body: { url: `${BASE_URL}${route}` },
    });
    setLiveBusy(false);
    if (error || !data?.success) {
      toast({ title: "Récupération échouée", description: error?.message || data?.error || "Erreur", variant: "destructive" });
      return;
    }
    setLiveTags(data.tags);
    toast({ title: "Tags récupérés", description: `Status HTTP ${data.status}` });
  };

  const restoreVersion = async (h: HistoryRow) => {
    if (!row?.id) return;
    const { error } = await (supabase as any)
      .from("seo_settings")
      .update({
        title: h.title,
        description: h.description,
        keywords: h.keywords,
        og_image_url: h.og_image_url,
        og_image_sizes: h.og_image_sizes,
        canonical_path: h.canonical_path,
        no_index: h.no_index,
        is_draft: false,
        published_at: new Date().toISOString(),
      })
      .eq("id", row.id);
    if (error) {
      toast({ title: "Restauration échouée", description: error.message, variant: "destructive" });
      return;
    }
    clearSeoCache();
    toast({ title: "Version restaurée et publiée" });
    fetchRow();
  };

  if (authorized === false) return <div className="container py-10 text-center text-sm text-muted-foreground">Accès admin requis.</div>;
  if (authorized === null) return <div className="container py-10 flex justify-center"><Loader2 className="w-5 h-5 animate-spin" /></div>;

  return (
    <div className="container max-w-5xl py-6 space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => navigate("/admin")}>
          <ArrowLeft className="w-4 h-4" /> Retour admin
        </Button>
        <h1 className="text-xl font-semibold">Aperçu SEO d'une route</h1>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Route à inspecter</CardTitle>
          <CardDescription>Saisissez ou choisissez une route existante.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Input
                value={route}
                onChange={e => { setRoute(e.target.value); setShowSuggest(true); }}
                onFocus={() => setShowSuggest(true)}
                onBlur={() => setTimeout(() => setShowSuggest(false), 150)}
                placeholder="/ma-page" list="seo-routes"
              />
              <datalist id="seo-routes">{APP_ROUTES.map(r => <option key={r} value={r} />)}</datalist>
              {showSuggest && suggestions.length > 0 && (
                <div className="absolute z-10 mt-1 w-full bg-popover border rounded-md shadow-md max-h-56 overflow-y-auto">
                  {suggestions.map(s => (
                    <button key={s} type="button"
                      className="w-full text-left px-3 py-1.5 text-xs hover:bg-muted"
                      onMouseDown={() => { setRoute(s); setShowSuggest(false); }}>{s}</button>
                  ))}
                </div>
              )}
            </div>
            <Button onClick={fetchRow} disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              Charger
            </Button>
            <Button variant="outline" asChild disabled={!known}>
              <a href={route} target="_blank" rel="noreferrer"><ExternalLink className="w-4 h-4" /> Voir</a>
            </Button>
          </div>
          {!known ? (
            <p className="text-[11px] text-amber-600 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" /> Route inconnue. Vérifiez l'orthographe ou choisissez une suggestion.
            </p>
          ) : (
            <p className="text-[11px] text-emerald-600 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Route valide.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Computed tags */}
      <Card>
        <CardHeader className="pb-3 flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">Balises finales calculées</CardTitle>
            <CardDescription>Source : <span className="font-mono">{computed.source}</span></CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={copyHtml}>
            <Copy className="w-4 h-4" /> Copier le HTML
          </Button>
        </CardHeader>
        <CardContent className="space-y-3 text-xs font-mono">
          <Field label="title" value={computed.fullTitle} />
          <Field label="meta description" value={computed.description} />
          {computed.keywords && <Field label="meta keywords" value={computed.keywords} />}
          <Field label="canonical" value={computed.canonicalUrl} />
          <Field label="robots" value={computed.noIndex ? "noindex, nofollow" : "index, follow"} />
          <div className="border-t pt-3 space-y-2">
            <p className="font-semibold not-italic font-sans">Open Graph / Twitter</p>
            <Field label="og:image (1200×630)" value={computed.image} />
            <Field label="og:image (640×640)" value={computed.imageSquare} />
          </div>
          <div className="border-t pt-3">
            <p className="font-semibold not-italic font-sans mb-2">HTML brut</p>
            <pre className="bg-muted p-3 rounded-md overflow-x-auto text-[11px] whitespace-pre-wrap">{htmlSnippet}</pre>
          </div>
        </CardContent>
      </Card>

      {/* Mobile preview */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><Smartphone className="w-4 h-4" /> Aperçu mobile</CardTitle>
          <CardDescription>Rendu de la carte sociale comme sur smartphone (WhatsApp / Twitter mobile).</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center">
          <div className="w-[320px] rounded-[2rem] border-4 border-foreground/10 bg-background shadow-xl overflow-hidden">
            <div className="bg-muted/50 px-3 py-1.5 text-[10px] text-muted-foreground text-center border-b">{BASE_URL}{route}</div>
            <div className="p-3 space-y-2">
              <div className="rounded-lg border overflow-hidden">
                <div className="aspect-square bg-muted">
                  <img src={computed.imageSquare} alt="OG mobile" className="w-full h-full object-cover" />
                </div>
                <div className="p-2 bg-card">
                  <p className="text-[9px] uppercase text-muted-foreground truncate">{BASE_URL.replace("https://", "")}</p>
                  <p className="text-xs font-semibold line-clamp-2">{computed.fullTitle}</p>
                  <p className="text-[10px] text-muted-foreground line-clamp-2 mt-0.5">{computed.description}</p>
                </div>
              </div>
              {/* Google mobile */}
              <div className="border-t pt-2">
                <p className="text-[9px] text-muted-foreground truncate">{BASE_URL.replace("https://", "")}{computed.canonicalUrl.replace(BASE_URL, "")}</p>
                <p className="text-sm text-blue-700 line-clamp-2">{computed.fullTitle}</p>
                <p className="text-[10px] text-muted-foreground line-clamp-3">{computed.description}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Live OG fetcher */}
      <Card>
        <CardHeader className="pb-3 flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2"><Globe className="w-4 h-4" /> Tags réellement servis</CardTitle>
            <CardDescription>Récupère le HTML public et extrait les balises (comme Facebook/Twitter).</CardDescription>
          </div>
          <Button size="sm" onClick={fetchLive} disabled={liveBusy || !known}>
            {liveBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Globe className="w-4 h-4" />}
            Récupérer
          </Button>
        </CardHeader>
        <CardContent className="text-xs font-mono space-y-2">
          {!liveTags && <p className="text-muted-foreground font-sans">Cliquez "Récupérer" pour comparer les balises servies au navigateur avec celles calculées ci-dessus.</p>}
          {liveTags && (
            <>
              <Field label="title (live)" value={liveTags.title || "—"} />
              <Field label="description (live)" value={liveTags.description || "—"} />
              <Field label="canonical (live)" value={liveTags.canonical || "—"} />
              <Field label="og:title (live)" value={liveTags.og?.title || "—"} />
              <Field label="og:image (live)" value={liveTags.og?.image || "—"} />
              <Field label="twitter:image (live)" value={liveTags.twitter?.image || "—"} />
              {liveTags.jsonLd?.length > 0 && (
                <div className="pt-2">
                  <p className="font-sans font-semibold mb-1">JSON-LD ({liveTags.jsonLd.length})</p>
                  <pre className="bg-muted p-2 rounded text-[10px] max-h-40 overflow-auto">{JSON.stringify(liveTags.jsonLd, null, 2)}</pre>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* History */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><History className="w-4 h-4" /> Historique des versions</CardTitle>
          <CardDescription>{row?.id ? `${history.length} version(s) enregistrée(s)` : "Cette route n'a pas encore d'entrée SEO."}</CardDescription>
        </CardHeader>
        <CardContent>
          {historyLoading ? (
            <div className="flex justify-center py-4"><Loader2 className="w-4 h-4 animate-spin" /></div>
          ) : history.length === 0 ? (
            <p className="text-xs text-muted-foreground">Aucun historique.</p>
          ) : (
            <div className="space-y-2 max-h-[420px] overflow-y-auto">
              {history.map(h => (
                <div key={h.id} className="border rounded-md p-3 text-xs space-y-1">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <Badge variant={h.action === "publish" ? "default" : h.action === "create" ? "secondary" : "outline"} className="text-[10px]">
                        {h.action}
                      </Badge>
                      {h.is_draft && <Badge variant="outline" className="text-[10px]">brouillon</Badge>}
                      <span className="text-muted-foreground">{new Date(h.created_at).toLocaleString()}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground truncate max-w-[180px]">{h.changed_by_email || "système"}</span>
                      <Button size="sm" variant="outline" onClick={() => setRestoreCandidate(h)} className="h-7">
                        <RotateCcw className="w-3 h-3" /> Restaurer
                      </Button>
                    </div>
                  </div>
                  <p className="font-medium truncate">{h.title || <span className="text-muted-foreground italic">sans titre</span>}</p>
                  <p className="text-muted-foreground line-clamp-2">{h.description || "—"}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!restoreCandidate} onOpenChange={(o) => !o && setRestoreCandidate(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restaurer cette version ?</AlertDialogTitle>
            <AlertDialogDescription>
              Les balises actuelles seront remplacées par celles de la version du {restoreCandidate && new Date(restoreCandidate.created_at).toLocaleString()} et publiées immédiatement.
              La version actuelle reste consultable dans l'historique.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (restoreCandidate) restoreVersion(restoreCandidate); setRestoreCandidate(null); }}>
              Restaurer & publier
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

const Field = ({ label, value }: { label: string; value: string }) => (
  <div className="grid sm:grid-cols-[180px_1fr] gap-1 sm:gap-3">
    <Label className="text-[11px] text-muted-foreground font-mono">{label}</Label>
    <span className="break-all">{value}</span>
  </div>
);

export default SeoPreview;
