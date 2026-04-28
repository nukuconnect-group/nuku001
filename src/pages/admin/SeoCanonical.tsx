import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft, Copy, AlertTriangle, CheckCircle2, ExternalLink, RefreshCw, Globe, Search, Loader2,
} from "lucide-react";
import {
  TRACKING_PARAMS,
  listTrackingParams,
  stripTrackingFromUrl,
  buildCanonicalPath,
} from "@/lib/trackingParams";

const BASE_URL = "https://www.nukuconnect.com";

interface OgPreview {
  status?: number;
  finalUrl?: string;
  title?: string | null;
  canonical?: string | null;
  og?: { title?: string | null; description?: string | null; image?: string | null; url?: string | null };
  twitter?: { title?: string | null; description?: string | null; image?: string | null; card?: string | null };
}

const SEARCH_CONSOLE_URL = "https://search.google.com/search-console";

const SEO_AUDIT_KEY = "seo_canonical_audit_v1";
type AuditEntry = { url: string; canonical: string; checked_at: string; status: "indexed" | "consolidated" | "pending" };

const SeoCanonical = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [params] = useSearchParams();
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [inputUrl, setInputUrl] = useState(params.get("url") || `${BASE_URL}/?srsltid=EXAMPLE&utm_source=google`);
  const [previewBusy, setPreviewBusy] = useState(false);
  const [preview, setPreview] = useState<OgPreview | null>(null);
  const [audit, setAudit] = useState<AuditEntry[]>([]);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u?.user) { setAuthorized(false); return; }
      const { data } = await (supabase as any)
        .from("user_roles").select("role")
        .eq("user_id", u.user.id).eq("role", "admin").maybeSingle();
      setAuthorized(!!data);
    })();
    try {
      const raw = localStorage.getItem(SEO_AUDIT_KEY);
      if (raw) setAudit(JSON.parse(raw));
    } catch { /* ignore */ }
  }, []);

  // === Live computation for the URL the user is INSPECTING (no navigation needed) ===
  const inspection = useMemo(() => {
    let parsed: URL | null = null;
    try { parsed = new URL(inputUrl); } catch { /* invalid url */ }
    if (!parsed) {
      return { valid: false as const };
    }
    const dirty = listTrackingParams(parsed.toString());
    const cleanedPath = stripTrackingFromUrl(parsed.toString());
    const canonicalPath = buildCanonicalPath(parsed.toString());
    return {
      valid: true as const,
      origin: parsed.origin,
      pathname: parsed.pathname,
      search: parsed.search,
      hash: parsed.hash,
      dirtyParams: dirty,
      cleanedUrl: parsed.origin + cleanedPath,
      canonicalUrl: BASE_URL + canonicalPath,
      ogUrl: BASE_URL + canonicalPath,
    };
  }, [inputUrl]);

  const copy = async (label: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast({ title: "Copié", description: `${label} copié dans le presse-papier.` });
    } catch {
      toast({ title: "Erreur", description: "Impossible de copier", variant: "destructive" });
    }
  };

  const fetchOgPreview = async () => {
    if (!inspection.valid) {
      toast({ title: "URL invalide", description: "Saisis une URL absolue (https://...)", variant: "destructive" });
      return;
    }
    setPreviewBusy(true);
    setPreview(null);
    try {
      const { data, error } = await supabase.functions.invoke("seo-og-fetch", {
        body: { url: inputUrl },
      });
      if (error) throw error;
      setPreview(data as OgPreview);
    } catch (e: any) {
      toast({ title: "Échec du preview", description: e?.message || String(e), variant: "destructive" });
    } finally {
      setPreviewBusy(false);
    }
  };

  const addToAudit = () => {
    if (!inspection.valid) return;
    const entry: AuditEntry = {
      url: inputUrl,
      canonical: inspection.canonicalUrl,
      checked_at: new Date().toISOString(),
      status: "pending",
    };
    const next = [entry, ...audit.filter(a => a.url !== entry.url)].slice(0, 100);
    setAudit(next);
    try { localStorage.setItem(SEO_AUDIT_KEY, JSON.stringify(next)); } catch { /* ignore */ }
    toast({ title: "Ajouté au suivi", description: "URL ajoutée au tableau de bord SEO." });
  };

  const setEntryStatus = (url: string, status: AuditEntry["status"]) => {
    const next = audit.map(a => a.url === url ? { ...a, status, checked_at: new Date().toISOString() } : a);
    setAudit(next);
    try { localStorage.setItem(SEO_AUDIT_KEY, JSON.stringify(next)); } catch { /* ignore */ }
  };

  const removeEntry = (url: string) => {
    const next = audit.filter(a => a.url !== url);
    setAudit(next);
    try { localStorage.setItem(SEO_AUDIT_KEY, JSON.stringify(next)); } catch { /* ignore */ }
  };

  if (authorized === null) {
    return <div className="container py-10 text-center text-sm text-muted-foreground">Vérification…</div>;
  }
  if (!authorized) {
    return <div className="container py-10 text-center text-sm text-muted-foreground">Accès admin requis.</div>;
  }

  const consolidatedCount = audit.filter(a => a.status === "consolidated").length;
  const progressPct = audit.length === 0 ? 0 : Math.round((consolidatedCount / audit.length) * 100);

  return (
    <div className="container py-6 space-y-4 max-w-5xl">
      <div className="flex items-center justify-between gap-2">
        <Button variant="ghost" size="sm" onClick={() => navigate("/admin")}>
          <ArrowLeft className="w-4 h-4" /> Retour admin
        </Button>
        <Button variant="outline" size="sm" onClick={() => navigate("/admin/seo-preview")}>
          Gestion SEO <ExternalLink className="w-4 h-4 ml-1" />
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="w-5 h-5" /> Inspection canonical & paramètres de tracking
          </CardTitle>
          <CardDescription>
            Vérifie quelle URL canonique sera servie et détecte les paramètres parasites
            (srsltid, gclid, utm_*, fbclid, msclkid, …).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="seo-url">URL à inspecter</Label>
            <div className="flex gap-2">
              <Input
                id="seo-url"
                value={inputUrl}
                onChange={(e) => setInputUrl(e.target.value)}
                placeholder="https://www.nukuconnect.com/?srsltid=..."
              />
              <Button onClick={() => setInputUrl(window.location.origin + window.location.pathname + window.location.search)} variant="outline" size="sm" title="Utiliser l'URL courante">
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {!inspection.valid && (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" /> URL invalide — saisis une URL absolue.
            </div>
          )}

          {inspection.valid && (
            <div className="space-y-3">
              {inspection.dirtyParams.length > 0 ? (
                <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
                  <div className="flex items-center gap-2 font-medium text-amber-700 dark:text-amber-400">
                    <AlertTriangle className="w-4 h-4" /> {inspection.dirtyParams.length} paramètre(s) de tracking détecté(s)
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {inspection.dirtyParams.map((p) => (
                      <Badge key={p} variant="outline" className="font-mono">{p}</Badge>
                    ))}
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Ces paramètres seront retirés automatiquement de la barre d'adresse
                    et ne seront PAS inclus dans la canonical.
                  </p>
                </div>
              ) : (
                <div className="rounded-md border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" /> Aucun paramètre de tracking détecté.
                </div>
              )}

              <div className="grid gap-2 text-sm">
                <RowKV label="Canonical" value={inspection.canonicalUrl} onCopy={(v) => copy("Canonical", v)} highlight />
                <RowKV label="og:url" value={inspection.ogUrl} onCopy={(v) => copy("og:url", v)} />
                <RowKV label="URL nettoyée (barre)" value={inspection.cleanedUrl} onCopy={(v) => copy("URL nettoyée", v)} />
              </div>

              <div className="flex flex-wrap gap-2">
                <Button onClick={fetchOgPreview} disabled={previewBusy} size="sm">
                  {previewBusy ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Search className="w-4 h-4 mr-1" />}
                  Simuler le partage Open Graph / Twitter
                </Button>
                <Button onClick={addToAudit} variant="outline" size="sm">
                  Ajouter au suivi SEO
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {preview && (
        <Card>
          <CardHeader>
            <CardTitle>Tags réellement servis (vue crawler)</CardTitle>
            <CardDescription>
              Réponse HTTP {preview.status ?? "?"} — URL finale : <code className="text-xs">{preview.finalUrl}</code>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <RowKV label="<title>" value={preview.title || "—"} />
            <RowKV label="<link rel=canonical>" value={preview.canonical || "—"} highlight />
            <Separator className="my-2" />
            <RowKV label="og:title" value={preview.og?.title || "—"} />
            <RowKV label="og:description" value={preview.og?.description || "—"} />
            <RowKV label="og:url" value={preview.og?.url || "—"} highlight />
            <RowKV label="og:image" value={preview.og?.image || "—"} />
            <Separator className="my-2" />
            <RowKV label="twitter:card" value={preview.twitter?.card || "—"} />
            <RowKV label="twitter:title" value={preview.twitter?.title || "—"} />
            <RowKV label="twitter:image" value={preview.twitter?.image || "—"} />

            {inspection.valid && preview.canonical && preview.canonical !== inspection.canonicalUrl && (
              <div className="mt-3 rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 mt-0.5 text-amber-600" />
                <div>
                  <div className="font-medium text-amber-700 dark:text-amber-400">Canonical du serveur ≠ canonical attendu</div>
                  <div className="text-xs mt-1">Servi: <code>{preview.canonical}</code> · Attendu: <code>{inspection.canonicalUrl}</code></div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Paramètres strippés</CardTitle>
          <CardDescription>
            Liste centralisée des paramètres retirés automatiquement de l'URL (le param <code>ref</code> est PRÉSERVÉ pour l'affiliation).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-1">
            {TRACKING_PARAMS.map(p => <Badge key={p} variant="secondary" className="font-mono text-xs">{p}</Badge>)}
            <Badge variant="secondary" className="font-mono text-xs">utm_*</Badge>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Suivi des URL indexées avec paramètres</CardTitle>
          <CardDescription>
            Suivi manuel guidé via Google Search Console — coche les URLs consolidées pour suivre la progression.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-md border bg-muted/30 p-3 text-sm space-y-2">
            <div className="font-medium">Procédure (Search Console)</div>
            <ol className="list-decimal ml-5 space-y-1 text-xs text-muted-foreground">
              <li>Ouvre <a className="underline" href={SEARCH_CONSOLE_URL} target="_blank" rel="noopener">Google Search Console</a> → propriété <code>nukuconnect.com</code>.</li>
              <li>Section <strong>Pages</strong> → filtre <em>"Page avec redirection"</em> ou <em>"Variante avec une URL canonique différente sélectionnée par Google"</em>.</li>
              <li>Pour chaque URL listée ci-dessous : utilise <strong>Inspection d'URL</strong> et lis le champ <em>"URL canonique sélectionnée par Google"</em>.</li>
              <li>Si elle correspond à la canonical attendue → marque <strong>Consolidée</strong>. Sinon → <strong>En attente</strong>.</li>
              <li>Pour forcer un re-crawl : clique <strong>Demander une indexation</strong>.</li>
            </ol>
          </div>

          {audit.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune URL en suivi. Inspecte une URL ci-dessus puis clique « Ajouter au suivi SEO ».</p>
          ) : (
            <>
              <div className="flex items-center gap-3 text-sm">
                <div className="font-medium">Progression : {progressPct}%</div>
                <div className="flex-1 h-2 rounded bg-muted overflow-hidden">
                  <div className="h-full bg-emerald-500 transition-all" style={{ width: `${progressPct}%` }} />
                </div>
                <div className="text-xs text-muted-foreground">{consolidatedCount}/{audit.length} consolidées</div>
              </div>

              <div className="space-y-2">
                {audit.map((a) => (
                  <div key={a.url} className="rounded-md border p-3 text-sm space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="font-mono text-xs break-all">{a.url}</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          → canonical : <code>{a.canonical}</code>
                        </div>
                      </div>
                      <Badge variant={a.status === "consolidated" ? "default" : a.status === "indexed" ? "secondary" : "outline"}>
                        {a.status === "consolidated" ? "Consolidée" : a.status === "indexed" ? "Encore indexée" : "En attente"}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" onClick={() => setEntryStatus(a.url, "consolidated")}>
                        <CheckCircle2 className="w-4 h-4 mr-1" /> Marquer consolidée
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setEntryStatus(a.url, "indexed")}>
                        Encore indexée
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setEntryStatus(a.url, "pending")}>
                        En attente
                      </Button>
                      <Button size="sm" variant="ghost" asChild>
                        <a href={`https://search.google.com/search-console/inspect?resource_id=${encodeURIComponent("sc-domain:nukuconnect.com")}&id=${encodeURIComponent(a.url)}`} target="_blank" rel="noopener">
                          Inspecter dans GSC <ExternalLink className="w-3 h-3 ml-1" />
                        </a>
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => removeEntry(a.url)} className="ml-auto">
                        Supprimer
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

const RowKV = ({ label, value, onCopy, highlight }: { label: string; value: string; onCopy?: (v: string) => void; highlight?: boolean }) => (
  <div className={`flex items-start gap-2 rounded p-2 ${highlight ? "bg-primary/5 border border-primary/20" : "bg-muted/40"}`}>
    <div className="w-40 shrink-0 text-xs text-muted-foreground pt-0.5">{label}</div>
    <div className="flex-1 font-mono text-xs break-all">{value}</div>
    {onCopy && (
      <Button size="sm" variant="ghost" className="h-6 px-2" onClick={() => onCopy(value)}>
        <Copy className="w-3 h-3" />
      </Button>
    )}
  </div>
);

export default SeoCanonical;
