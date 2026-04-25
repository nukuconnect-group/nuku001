import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { QrCode, Loader2, Download, RefreshCw, CheckCircle2 } from "lucide-react";

interface Props {
  productId: string;
  producerId: string;
  productName: string;
}

/**
 * Affiche, uniquement pour le propriétaire du produit, un panneau permettant
 * de générer un numéro de lot et son QR code, puis de le sauvegarder en base
 * (table product_traceability) avant publication.
 */
export default function OwnerBatchQRGenerator({ productId, producerId, productName }: Props) {
  const { toast } = useToast();
  const [isOwner, setIsOwner] = useState(false);
  const [loading, setLoading] = useState(true);
  const [batchNumber, setBatchNumber] = useState<string>("");
  const [savedBatch, setSavedBatch] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [traceabilityId, setTraceabilityId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setLoading(false); return; }
      const { data: profile } = await supabase
        .from("profiles").select("id").eq("user_id", session.user.id).maybeSingle();
      if (profile?.id === producerId) {
        setIsOwner(true);
        const { data: trace } = await supabase
          .from("product_traceability")
          .select("id, batch_number")
          .eq("product_id", productId)
          .maybeSingle();
        if (trace) {
          setTraceabilityId(trace.id);
          setSavedBatch(trace.batch_number || null);
          if (trace.batch_number) setBatchNumber(trace.batch_number);
        }
      }
      setLoading(false);
    })();
  }, [productId, producerId]);

  const generateBatchNumber = () => {
    const yy = new Date().getFullYear().toString().slice(-2);
    const mm = String(new Date().getMonth() + 1).padStart(2, "0");
    const dd = String(new Date().getDate()).padStart(2, "0");
    const rand = Math.random().toString(36).slice(2, 7).toUpperCase();
    setBatchNumber(`LOT-${yy}${mm}${dd}-${rand}`);
  };

  const saveBatch = async () => {
    if (!batchNumber.trim()) {
      toast({ title: "Numéro requis", description: "Générez ou saisissez un numéro de lot.", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      if (traceabilityId) {
        const { error } = await supabase
          .from("product_traceability")
          .update({ batch_number: batchNumber.trim() })
          .eq("id", traceabilityId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("product_traceability")
          .insert({
            product_id: productId,
            producer_id: producerId,
            batch_number: batchNumber.trim(),
            status: "active",
          })
          .select("id")
          .single();
        if (error) throw error;
        setTraceabilityId(data.id);
      }
      setSavedBatch(batchNumber.trim());
      toast({ title: "Lot enregistré ✓", description: `Numéro de lot : ${batchNumber.trim()}` });
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    }
    setSaving(false);
  };

  if (loading || !isOwner) return null;

  const qrUrl = batchNumber
    ? `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(
        `${window.location.origin}/tracabilite?product=${productId}&batch=${batchNumber}&name=${encodeURIComponent(productName)}`
      )}`
    : null;

  return (
    <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-accent/5">
      <CardContent className="p-3 sm:p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <QrCode className="w-4 h-4 text-primary" />
            <span className="font-heading font-semibold text-xs sm:text-sm">Générer le QR du lot</span>
          </div>
          {savedBatch && (
            <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 text-[9px] gap-1">
              <CheckCircle2 className="w-2.5 h-2.5" /> Lot enregistré
            </Badge>
          )}
        </div>
        <p className="text-[10px] sm:text-[11px] text-muted-foreground">
          Associez un numéro de lot unique à ce produit avant publication. Le QR généré
          permettra à vos acheteurs et livreurs de vérifier la traçabilité du lot.
        </p>

        <div className="flex flex-col sm:flex-row gap-2">
          <Input
            value={batchNumber}
            onChange={(e) => setBatchNumber(e.target.value)}
            placeholder="LOT-..."
            className="h-9 text-xs flex-1"
          />
          <Button variant="outline" size="sm" className="h-9 gap-1.5 text-[11px]" onClick={generateBatchNumber}>
            <RefreshCw className="w-3.5 h-3.5" /> Générer auto
          </Button>
          <Button variant="hero" size="sm" className="h-9 gap-1.5 text-[11px]" onClick={saveBatch} disabled={saving}>
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
            {savedBatch === batchNumber ? "Enregistré" : "Associer le lot"}
          </Button>
        </div>

        {qrUrl && (
          <div className="flex items-start gap-3 pt-2 border-t border-border/40">
            <div className="bg-card p-2 rounded-lg border border-border flex-shrink-0">
              <img src={qrUrl} alt={`QR Lot ${batchNumber}`} className="w-24 h-24 sm:w-28 sm:h-28" />
            </div>
            <div className="flex-1 space-y-1.5">
              <p className="text-[10px] text-muted-foreground">QR pour le lot <strong>{batchNumber}</strong></p>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 h-7 text-[10px]"
                onClick={() => {
                  const link = document.createElement("a");
                  link.href = qrUrl.replace("size=220x220", "size=600x600");
                  link.download = `qr-lot-${batchNumber}.png`;
                  link.click();
                }}
              >
                <Download className="w-3 h-3" /> Télécharger HD
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
