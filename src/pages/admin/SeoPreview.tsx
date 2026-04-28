import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ArrowLeft, RefreshCw, ExternalLink } from "lucide-react";

interface SeoRow {
  route: string;
  title: string | null;
  description: string | null;
  keywords: string | null;
  og_image_url: string | null;
  canonical_path: string | null;
  no_index: boolean;
}

const BASE_URL = "https://www.nukuconnect.com";
const SITE_NAME = "NUKUCONNECT";
const DEFAULT_DESC = "NUKUCONNECT : la marketplace agricole intelligente d'Afrique. Achetez et vendez des produits agricoles, connectez-vous avec des producteurs vérifiés.";
const DEFAULT_IMAGE = "https://storage.googleapis.com/gpt-engineer-file-uploads/C3YioAkra3hJ4npw1XZX0HbG8E32/social-images/social-1769858107990-NUKUCONNECT-LOGO5-2.png";

const SeoPreview = () => {
  const navigate = useNavigate();
  const [route, setRoute] = useState("/");
  const [loading, setLoading] = useState(false);
  const [row, setRow] = useState<SeoRow | null>(null);
  const [globalRow, setGlobalRow] = useState<SeoRow | null>(null);
  const [authorized, setAuthorized] = useState<boolean | null>(null);

  // Admin guard
  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u?.user) { setAuthorized(false); return; }
      const { data } = await (supabase as any)
        .from("user_roles")
        .select("role")
        .eq("user_id", u.user.id)
        .eq("role", "admin")
        .maybeSingle();
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

  const computed = useMemo(() => {
    const r = row || ({} as Partial<SeoRow>);
    const g = globalRow || ({} as Partial<SeoRow>);
    const title = r.title || g.title;
    const description = r.description || g.description || DEFAULT_DESC;
    const image = r.og_image_url || g.og_image_url || DEFAULT_IMAGE;
    const canonical = r.canonical_path || g.canonical_path || route;
    const noIndex = r.no_index ?? g.no_index ?? false;
    const keywords = r.keywords || g.keywords;
    const fullTitle = title ? `${title} | ${SITE_NAME}` : `${SITE_NAME} - Marketplace Agricole Intelligent d'Afrique`;
    const canonicalUrl = `${BASE_URL}${canonical}`;
    return { fullTitle, description, image, canonicalUrl, noIndex, keywords, source: row ? "BDD (route)" : globalRow ? "BDD (global)" : "Code par défaut" };
  }, [row, globalRow, route]);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: computed.fullTitle,
    description: computed.description,
    url: computed.canonicalUrl,
    image: computed.image,
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
          <CardDescription>Saisissez n'importe quelle route (ex: /, /marketplace, /formations) pour voir les balises finales appliquées.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row gap-2">
          <Input value={route} onChange={e => setRoute(e.target.value)} placeholder="/ma-page" />
          <Button onClick={fetchRow} disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Charger
          </Button>
          <Button variant="outline" asChild>
            <a href={route} target="_blank" rel="noreferrer"><ExternalLink className="w-4 h-4" /> Voir la page</a>
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Balises finales calculées</CardTitle>
          <CardDescription>Source : <span className="font-mono">{computed.source}</span></CardDescription>
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
            <Field label="og:image" value={computed.image} />
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
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Aperçu image OG</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-hidden max-w-xl">
            <div className="aspect-[1200/630] bg-muted">
              <img src={computed.image} alt="OG" className="w-full h-full object-cover" />
            </div>
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
