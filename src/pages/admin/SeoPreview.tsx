import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowLeft, RefreshCw, ExternalLink, Copy, AlertTriangle, CheckCircle2 } from "lucide-react";
import { APP_ROUTES, isKnownRoute, suggestRoutes } from "@/lib/appRoutes";

interface SeoRow {
  route: string;
  title: string | null;
  description: string | null;
  keywords: string | null;
  og_image_url: string | null;
  og_image_sizes?: Record<string, string> | null;
  canonical_path: string | null;
  no_index: boolean;
}

const BASE_URL = "https://www.nukuconnect.com";
const SITE_NAME = "NUKUCONNECT";
const DEFAULT_DESC = "NUKUCONNECT : la marketplace agricole intelligente d'Afrique. Achetez et vendez des produits agricoles, connectez-vous avec des producteurs vérifiés.";
const DEFAULT_IMAGE = "https://storage.googleapis.com/gpt-engineer-file-uploads/C3YioAkra3hJ4npw1XZX0HbG8E32/social-images/social-1769858107990-NUKUCONNECT-LOGO5-2.png";

const SeoPreview = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [route, setRoute] = useState("/");
  const [loading, setLoading] = useState(false);
  const [row, setRow] = useState<SeoRow | null>(null);
  const [globalRow, setGlobalRow] = useState<SeoRow | null>(null);
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [showSuggest, setShowSuggest] = useState(false);

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
    setLoading(true);
    const [{ data: r }, { data: g }] = await Promise.all([
      (supabase as any).from("seo_settings").select("*").eq("route", route).maybeSingle(),
      (supabase as any).from("seo_settings").select("*").eq("route", "__global__").maybeSingle(),
    ]);
    setRow(r as SeoRow | null);
    setGlobalRow(g as SeoRow | null);
    setLoading(false);
  };

  useEffect(() => { if (authorized) fetchRow(); }, [authorized]);

  const known = isKnownRoute(route);
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
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: computed.fullTitle,
    description: computed.description,
    url: computed.canonicalUrl,
    image: computed.image,
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
      `<!-- Open Graph -->`,
      `<meta property="og:type" content="website" />`,
      `<meta property="og:title" content="${esc(computed.fullTitle)}" />`,
      `<meta property="og:description" content="${esc(computed.description)}" />`,
      `<meta property="og:url" content="${computed.canonicalUrl}" />`,
      `<meta property="og:image" content="${computed.image}" />`,
      `<meta property="og:image:width" content="1200" />`,
      `<meta property="og:image:height" content="630" />`,
      `<meta property="og:image" content="${computed.imageSquare}" />`,
      `<meta property="og:image:width" content="640" />`,
      `<meta property="og:image:height" content="640" />`,
      ``,
      `<!-- Twitter -->`,
      `<meta name="twitter:card" content="summary_large_image" />`,
      `<meta name="twitter:title" content="${esc(computed.fullTitle)}" />`,
      `<meta name="twitter:description" content="${esc(computed.description)}" />`,
      `<meta name="twitter:image" content="${computed.image}" />`,
      ``,
      `<!-- JSON-LD -->`,
      `<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>`,
    ].filter(Boolean).join("\n");
  }, [computed, jsonLd]);

  const copyHtml = async () => {
    try {
      await navigator.clipboard.writeText(htmlSnippet);
      toast({ title: "HTML copié", description: "Les balises SEO sont dans votre presse-papier." });
    } catch {
      toast({ title: "Copie échouée", description: "Sélectionnez et copiez manuellement.", variant: "destructive" });
    }
  };

  if (authorized === false) {
    return <div className="container py-10 text-center text-sm text-muted-foreground">Accès admin requis.</div>;
  }
  if (authorized === null) {
    return <div className="container py-10 flex justify-center"><Loader2 className="w-5 h-5 animate-spin" /></div>;
  }

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
          <CardDescription>Saisissez ou choisissez une route existante de l'application.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Input
                value={route}
                onChange={e => { setRoute(e.target.value); setShowSuggest(true); }}
                onFocus={() => setShowSuggest(true)}
                onBlur={() => setTimeout(() => setShowSuggest(false), 150)}
                placeholder="/ma-page"
                list="seo-routes"
              />
              <datalist id="seo-routes">
                {APP_ROUTES.map(r => <option key={r} value={r} />)}
              </datalist>
              {showSuggest && suggestions.length > 0 && (
                <div className="absolute z-10 mt-1 w-full bg-popover border rounded-md shadow-md max-h-56 overflow-y-auto">
                  {suggestions.map(s => (
                    <button
                      key={s}
                      type="button"
                      className="w-full text-left px-3 py-1.5 text-xs hover:bg-muted"
                      onMouseDown={() => { setRoute(s); setShowSuggest(false); }}
                    >{s}</button>
                  ))}
                </div>
              )}
            </div>
            <Button onClick={fetchRow} disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              Charger
            </Button>
            <Button variant="outline" asChild disabled={!known}>
              <a href={route} target="_blank" rel="noreferrer"><ExternalLink className="w-4 h-4" /> Voir la page</a>
            </Button>
          </div>
          {!known ? (
            <p className="text-[11px] text-amber-600 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" /> Route inconnue dans l'application. Vérifiez l'orthographe ou choisissez une suggestion.
            </p>
          ) : (
            <p className="text-[11px] text-emerald-600 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Route valide.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3 flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">Balises finales calculées</CardTitle>
            <CardDescription>Source : <span className="font-mono">{computed.source}</span></CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={copyHtml}>
            <Copy className="w-4 h-4" /> Copier le HTML des balises
          </Button>
        </CardHeader>
        <CardContent className="space-y-3 text-xs font-mono">
          <Field label="title" value={computed.fullTitle} />
          <Field label="meta description" value={computed.description} />
          {computed.keywords && <Field label="meta keywords" value={computed.keywords} />}
          <Field label="link rel=canonical" value={computed.canonicalUrl} />
          <Field label="meta robots" value={computed.noIndex ? "noindex, nofollow" : "index, follow (par défaut)"} />
          <div className="border-t pt-3 space-y-2">
            <p className="font-semibold not-italic font-sans">Open Graph</p>
            <Field label="og:title" value={computed.fullTitle} />
            <Field label="og:description" value={computed.description} />
            <Field label="og:image (1200x630)" value={computed.image} />
            <Field label="og:image (640x640)" value={computed.imageSquare} />
            <Field label="og:url" value={computed.canonicalUrl} />
            <Field label="og:type" value="website" />
          </div>
          <div className="border-t pt-3 space-y-2">
            <p className="font-semibold not-italic font-sans">Twitter</p>
            <Field label="twitter:card" value="summary_large_image" />
            <Field label="twitter:title" value={computed.fullTitle} />
            <Field label="twitter:image" value={computed.image} />
          </div>
          <div className="border-t pt-3">
            <p className="font-semibold not-italic font-sans mb-2">JSON-LD</p>
            <pre className="bg-muted p-3 rounded-md overflow-x-auto text-[11px]">{JSON.stringify(jsonLd, null, 2)}</pre>
          </div>
          <div className="border-t pt-3">
            <p className="font-semibold not-italic font-sans mb-2">HTML brut (à coller dans &lt;head&gt;)</p>
            <pre className="bg-muted p-3 rounded-md overflow-x-auto text-[11px] whitespace-pre-wrap">{htmlSnippet}</pre>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Aperçu images OG</CardTitle>
        </CardHeader>
        <CardContent className="grid sm:grid-cols-2 gap-4">
          <div className="rounded-md border overflow-hidden">
            <div className="aspect-[1200/630] bg-muted">
              <img src={computed.image} alt="OG 1200x630" className="w-full h-full object-cover" />
            </div>
            <p className="p-2 text-[11px] text-muted-foreground">1200 × 630 (Facebook, LinkedIn)</p>
          </div>
          <div className="rounded-md border overflow-hidden max-w-xs">
            <div className="aspect-square bg-muted">
              <img src={computed.imageSquare} alt="OG 640x640" className="w-full h-full object-cover" />
            </div>
            <p className="p-2 text-[11px] text-muted-foreground">640 × 640 (WhatsApp, Twitter)</p>
          </div>
        </CardContent>
      </Card>
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
