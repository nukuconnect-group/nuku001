import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Upload, FileSpreadsheet, Check, X, AlertTriangle, Loader2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ParsedProduct {
  name: string;
  description: string;
  category: string;
  price: number;
  unit: string;
  quantity: number;
  location: string;
  isOrganic: boolean;
  images: string[];
  valid: boolean;
  error?: string;
}

interface CSVProductImportProps {
  profileId: string;
  onImportComplete: () => void;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/\\n/g, " ")
    .trim()
    .slice(0, 1000);
}

function parseCSV(text: string): ParsedProduct[] {
  // Remove BOM
  const clean = text.replace(/^\uFEFF/, "");
  const lines = clean.split("\n").filter((l) => l.trim());
  if (lines.length < 2) return [];

  const headers = parseCSVLine(lines[0]);
  const nameIdx = headers.findIndex((h) => h === "Nom");
  const descShortIdx = headers.findIndex((h) => h === "Description courte");
  const descIdx = headers.findIndex((h) => h === "Description");
  const pricePromoIdx = headers.findIndex((h) => h === "Tarif promo");
  const priceRegIdx = headers.findIndex((h) => h === "Tarif régulier");
  const categoryIdx = headers.findIndex((h) => h === "Catégories");
  const imagesIdx = headers.findIndex((h) => h === "Images");
  const stockIdx = headers.findIndex((h) => h === "Stock");
  const publishedIdx = headers.findIndex((h) => h === "Publié");
  const visibilityIdx = headers.findIndex((h) => h === "Visibilité dans le catalogue");

  const products: ParsedProduct[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i]);
    const name = cols[nameIdx] || "";
    if (!name) continue;

    // Skip hidden or virtual products
    const published = cols[publishedIdx];
    const visibility = cols[visibilityIdx];
    if (published === "-1" || published === "0" || visibility === "hidden") continue;

    const pricePromo = parseFloat(cols[pricePromoIdx] || "0");
    const priceReg = parseFloat(cols[priceRegIdx] || "0");
    const price = pricePromo > 0 ? pricePromo : priceReg;

    const rawDesc = cols[descShortIdx] || cols[descIdx] || "";
    const description = stripHtml(rawDesc);

    const rawCategory = cols[categoryIdx] || "";
    const category = rawCategory.split(",")[0]?.trim() || "Agriculture";

    const rawImages = cols[imagesIdx] || "";
    const images = rawImages
      .split(",")
      .map((u: string) => u.trim())
      .filter((u: string) => u.startsWith("http"));

    const stock = parseInt(cols[stockIdx] || "0", 10);
    const valid = price > 0 && name.length > 0;

    products.push({
      name,
      description,
      category,
      price,
      unit: "kg",
      quantity: isNaN(stock) || stock <= 0 ? 100 : stock,
      location: "Lomé, Togo",
      isOrganic: false,
      images: images.slice(0, 4),
      valid,
      error: !valid
        ? price <= 0
          ? "Prix invalide"
          : "Nom manquant"
        : undefined,
    });
  }

  return products;
}

const CSVProductImport = ({ profileId, onImportComplete }: CSVProductImportProps) => {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [parsed, setParsed] = useState<ParsedProduct[]>([]);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [step, setStep] = useState<"upload" | "preview" | "done">("upload");

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith(".csv")) {
      toast({ title: "Format invalide", description: "Veuillez sélectionner un fichier .csv", variant: "destructive" });
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const products = parseCSV(text);
      if (products.length === 0) {
        toast({ title: "Fichier vide", description: "Aucun produit trouvé dans le CSV", variant: "destructive" });
        return;
      }
      setParsed(products);
      setStep("preview");
    };
    reader.readAsText(file, "utf-8");
  };

  const handleImport = async () => {
    const validProducts = parsed.filter((p) => p.valid);
    if (validProducts.length === 0) return;

    setImporting(true);
    setProgress(0);
    let imported = 0;

    for (const product of validProducts) {
      const { error } = await supabase.from("products").insert({
        name: product.name.slice(0, 200),
        description: product.description.slice(0, 2000),
        category: product.category.slice(0, 100),
        price: product.price,
        unit: product.unit,
        quantity_available: product.quantity,
        location: product.location,
        is_organic: product.isOrganic,
        images: product.images,
        producer_id: profileId,
      });

      if (!error) imported++;
      setProgress(Math.round(((imported) / validProducts.length) * 100));
    }

    setImporting(false);
    setStep("done");
    toast({
      title: `${imported} produit${imported > 1 ? "s" : ""} importé${imported > 1 ? "s" : ""}`,
      description: `Sur ${validProducts.length} produit${validProducts.length > 1 ? "s" : ""} valide${validProducts.length > 1 ? "s" : ""}`,
    });
    onImportComplete();
  };

  const validCount = parsed.filter((p) => p.valid).length;
  const invalidCount = parsed.filter((p) => !p.valid).length;

  if (step === "done") {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
            <Check className="w-6 h-6 text-primary" />
          </div>
          <h3 className="font-heading font-bold text-base mb-1">Import terminé !</h3>
          <p className="text-xs text-muted-foreground mb-4">
            Vos produits sont maintenant visibles sur le marketplace
          </p>
          <Button variant="outline" size="sm" className="text-xs" onClick={() => { setStep("upload"); setParsed([]); }}>
            Importer d'autres produits
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (step === "preview") {
    return (
      <Card>
        <CardHeader className="p-3 sm:p-4">
          <CardTitle className="text-sm flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-primary" />
            Aperçu de l'import
          </CardTitle>
          <div className="flex gap-2 mt-2">
            <Badge variant="secondary" className="text-[10px] gap-1">
              <Check className="w-2.5 h-2.5 text-green-500" />{validCount} valide{validCount > 1 ? "s" : ""}
            </Badge>
            {invalidCount > 0 && (
              <Badge variant="destructive" className="text-[10px] gap-1">
                <AlertTriangle className="w-2.5 h-2.5" />{invalidCount} invalide{invalidCount > 1 ? "s" : ""}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-3 sm:p-4 pt-0">
          <ScrollArea className="h-[300px] mb-4">
            <div className="space-y-2">
              {parsed.map((p, i) => (
                <div key={i} className={`flex items-center gap-3 p-2 rounded-lg border ${p.valid ? "border-border bg-card" : "border-destructive/30 bg-destructive/5"}`}>
                  {p.images[0] ? (
                    <img src={p.images[0]} alt={p.name} className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                      <FileSpreadsheet className="w-4 h-4 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground truncate">{p.name}</p>
                    <p className="text-[10px] text-muted-foreground">{p.category} • {p.price.toLocaleString()} FCFA</p>
                  </div>
                  {p.valid ? (
                    <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                  ) : (
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <X className="w-4 h-4 text-destructive" />
                      <span className="text-[9px] text-destructive">{p.error}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>

          {importing && (
            <div className="mb-4">
              <Progress value={progress} className="h-2" />
              <p className="text-[10px] text-muted-foreground mt-1 text-center">{progress}% importé...</p>
            </div>
          )}

          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="flex-1 text-xs" onClick={() => { setStep("upload"); setParsed([]); }} disabled={importing}>
              Annuler
            </Button>
            <Button variant="hero" size="sm" className="flex-1 text-xs gap-1" onClick={handleImport} disabled={importing || validCount === 0}>
              {importing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
              Importer {validCount} produit{validCount > 1 ? "s" : ""}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-dashed">
      <CardContent className="text-center py-6">
        <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleFile} />
        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
          <Upload className="w-5 h-5 text-primary" />
        </div>
        <h3 className="font-heading font-semibold text-sm mb-1">Importer des produits (CSV)</h3>
        <p className="text-[10px] text-muted-foreground mb-3 max-w-xs mx-auto">
          Importez vos produits depuis WooCommerce ou tout fichier CSV avec les colonnes : Nom, Prix, Catégories, Images
        </p>
        <Button variant="hero" size="sm" className="gap-1.5 text-xs" onClick={() => fileRef.current?.click()}>
          <FileSpreadsheet className="w-3.5 h-3.5" />
          Sélectionner un fichier CSV
        </Button>
      </CardContent>
    </Card>
  );
};

export default CSVProductImport;
