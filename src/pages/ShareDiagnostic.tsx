import { useMemo, useState } from "react";
import SEO from "@/components/SEO";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import MobileBottomNav from "@/components/layout/MobileBottomNav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertTriangle, CheckCircle2, Copy, ExternalLink, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { productCrawlerUrl, shopCrawlerUrl } from "@/lib/shareOg";

type ShareType = "product" | "shop";

interface DiagnosticResponse {
  ok: boolean;
  resolved: boolean;
  requestedType: string;
  durationMs: number;
  meta: {
    title: string;
    description: string;
    image: string;
    url: string;
    hasTitle: boolean;
    hasDescription: boolean;
    hasImage: boolean;
    hasCanonicalUrl: boolean;
  };
  twitter: Record<string, string>;
  jsonLd: Record<string, unknown> | null;
  error?: string;
}

const platforms = ["WhatsApp", "Facebook", "LinkedIn", "Telegram"];

const ShareDiagnostic = () => {
  const [type, setType] = useState<ShareType>("product");
  const [identifier, setIdentifier] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DiagnosticResponse | null>(null);
  const [platformChecks, setPlatformChecks] = useState<Record<string, boolean>>({});

  const shareUrl = useMemo(() => {
    const clean = identifier.trim();
    return clean ? (type === "product" ? productCrawlerUrl(clean) : shopCrawlerUrl(clean)) : "";
  }, [identifier, type]);

  const runDiagnostic = async () => {
    if (!shareUrl) return;
    setLoading(true);
    setPlatformChecks({});
    try {
      const url = `${shareUrl}&format=json&diagnostic=1`;
      const response = await fetch(url, { cache: "no-store" });
      const data = await response.json();
      setResult(data);

      const checks: Record<string, boolean> = {};
      await Promise.all(platforms.map(async (platform) => {
        const res = await fetch(`${url}&crawler=${encodeURIComponent(platform.toLowerCase())}`, { cache: "no-store" });
        const body = await res.json().catch(() => null);
        checks[platform] = Boolean(res.ok && body?.meta?.hasTitle && body?.meta?.hasDescription && body?.meta?.image && body?.meta?.url);
      }));
      setPlatformChecks(checks);
      toast.success("Diagnostic terminé");
    } catch (error: any) {
      setResult({ ok: false, resolved: false, requestedType: type, durationMs: 0, meta: { title: "", description: "", image: "", url: "", hasTitle: false, hasDescription: false, hasImage: false, hasCanonicalUrl: false }, twitter: {}, jsonLd: null, error: error?.message || "Erreur réseau" });
      toast.error("Diagnostic impossible");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20 lg:pb-0">
      <SEO url="/diagnostic-partage" title="Diagnostic partage" description="Diagnostic des aperçus de partage NukuConnect." noIndex />
      <Header />
      <main className="container mx-auto px-4 py-8 max-w-5xl space-y-5">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">Diagnostic partage</h1>
          <p className="text-sm text-muted-foreground">Contrôle des balises OG, Twitter et JSON-LD servies aux crawlers sociaux.</p>
        </div>

        <Card>
          <CardContent className="p-4 space-y-4">
            <Tabs value={type} onValueChange={(value) => setType(value as ShareType)}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="product">Produit</TabsTrigger>
                <TabsTrigger value="shop">Profil / boutique</TabsTrigger>
              </TabsList>
            </Tabs>
            <div className="flex flex-col sm:flex-row gap-2">
              <Input value={identifier} onChange={(event) => setIdentifier(event.target.value)} placeholder={type === "product" ? "Slug ou ID produit" : "Nom boutique ou profil"} />
              <Button onClick={runDiagnostic} disabled={!identifier.trim() || loading} className="gap-2">
                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                Vérifier
              </Button>
            </div>
            {shareUrl && (
              <div className="flex items-center gap-2 rounded-md border border-border bg-muted/40 p-2 text-xs">
                <span className="flex-1 break-all text-muted-foreground">{shareUrl}</span>
                <Button variant="ghost" size="icon" onClick={() => navigator.clipboard.writeText(shareUrl).then(() => toast.success("Lien copié"))}><Copy className="w-4 h-4" /></Button>
                <Button variant="ghost" size="icon" onClick={() => window.open(shareUrl, "_blank", "noopener,noreferrer")}><ExternalLink className="w-4 h-4" /></Button>
              </div>
            )}
          </CardContent>
        </Card>

        {result && (
          <div className="grid lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="p-4 pb-2"><CardTitle className="text-base flex items-center gap-2">{result.ok ? <CheckCircle2 className="w-5 h-5 text-primary" /> : <AlertTriangle className="w-5 h-5 text-destructive" />} Statut de rendu</CardTitle></CardHeader>
              <CardContent className="p-4 pt-2 space-y-3 text-sm">
                <Badge variant={result.ok ? "default" : "destructive"}>{result.ok ? "Succès" : "Erreur"}</Badge>
                <p className="text-muted-foreground">Durée : {result.durationMs || 0} ms</p>
                {result.error && <p className="text-destructive text-xs">{result.error}</p>}
                <div className="grid grid-cols-2 gap-2">
                  {platforms.map((platform) => (
                    <div key={platform} className="flex items-center justify-between rounded-md bg-muted/40 px-3 py-2 text-xs">
                      <span>{platform}</span>
                      <Badge variant={platformChecks[platform] ? "default" : "outline"}>{platformChecks[platform] ? "OK" : "À vérifier"}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="p-4 pb-2"><CardTitle className="text-base">Open Graph / Twitter</CardTitle></CardHeader>
              <CardContent className="p-4 pt-2 space-y-2 text-xs">
                <p><strong>og:title</strong> : {result.meta.title || "—"}</p>
                <p><strong>og:description</strong> : {result.meta.description || "—"}</p>
                <p className="break-all"><strong>og:url</strong> : {result.meta.url || "—"}</p>
                <p className="break-all"><strong>og:image</strong> : {result.meta.image || "—"}</p>
                {result.meta.image && <img src={result.meta.image} alt="Aperçu Open Graph" className="mt-2 aspect-[1200/630] w-full rounded-md object-cover border border-border" />}
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader className="p-4 pb-2"><CardTitle className="text-base">JSON-LD généré</CardTitle></CardHeader>
              <CardContent className="p-4 pt-2">
                <pre className="max-h-80 overflow-auto rounded-md bg-muted p-3 text-xs">{JSON.stringify(result.jsonLd || {}, null, 2)}</pre>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
      <Footer />
      <MobileBottomNav />
    </div>
  );
};

export default ShareDiagnostic;