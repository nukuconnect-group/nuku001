import { useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Plus, Trash2, Layers, AlertCircle } from "lucide-react";

export interface TierDraft {
  min_quantity: string;
  max_quantity: string;
  price: string;
}

interface Props {
  value: TierDraft[];
  onChange: (tiers: TierDraft[]) => void;
  unit: string;
  basePrice?: string;
  onValidityChange?: (valid: boolean, errors: string[]) => void;
}

/**
 * Validate tier list. Returns array of error messages (empty = valid).
 * Rules:
 *  - min_quantity required and > 0
 *  - if max_quantity provided, must be >= min_quantity
 *  - price required and > 0
 *  - no overlap between ranges
 */
export function validateTiers(tiers: TierDraft[], opts: { required?: boolean } = {}): string[] {
  const errors: string[] = [];
  if (tiers.length === 0) {
    if (opts.required) {
      errors.push("Ajoutez au moins un palier de prix de gros pour inciter les acheteurs.");
    }
    return errors;
  }

  const parsed = tiers.map((t, i) => ({
    i,
    min: parseFloat(t.min_quantity),
    max: t.max_quantity ? parseFloat(t.max_quantity) : Infinity,
    price: parseFloat(t.price),
  }));

  parsed.forEach((p) => {
    if (!isFinite(p.min) || p.min <= 0) errors.push(`Palier ${p.i + 1} : quantité min invalide.`);
    if (p.max !== Infinity && (!isFinite(p.max) || p.max < p.min))
      errors.push(`Palier ${p.i + 1} : quantité max doit être ≥ min.`);
    if (!isFinite(p.price) || p.price <= 0) errors.push(`Palier ${p.i + 1} : prix invalide.`);
  });

  // Overlap check
  const sorted = [...parsed].sort((a, b) => a.min - b.min);
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const curr = sorted[i];
    if (curr.min <= prev.max) {
      errors.push(`Chevauchement entre palier ${prev.i + 1} et ${curr.i + 1}.`);
    }
  }
  return errors;
}

export default function PriceTiersEditor({ value, onChange, unit, basePrice, onValidityChange }: Props) {
  const errors = useMemo(() => validateTiers(value), [value]);

  // Notify parent of validity
  useMemo(() => {
    onValidityChange?.(errors.length === 0, errors);
  }, [errors, onValidityChange]);

  const update = (idx: number, patch: Partial<TierDraft>) => {
    onChange(value.map((t, i) => (i === idx ? { ...t, ...patch } : t)));
  };
  const add = () => {
    const last = value[value.length - 1];
    const nextMin = last ? String((parseFloat(last.max_quantity) || parseFloat(last.min_quantity) || 1) + 1) : "10";
    onChange([...value, { min_quantity: nextMin, max_quantity: "", price: basePrice || "" }]);
  };
  const remove = (idx: number) => onChange(value.filter((_, i) => i !== idx));

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-1.5 text-sm">
          <Layers className="w-3.5 h-3.5 text-primary" />
          Prix de gros par palier <span className="text-muted-foreground text-[10px] font-normal">(optionnel)</span>
        </Label>
        <Button type="button" size="sm" variant="outline" onClick={add} className="h-7 text-[10px] gap-1">
          <Plus className="w-3 h-3" />Ajouter palier
        </Button>
      </div>
      <p className="text-[10px] text-muted-foreground">
        Facultatif : ajoutez des paliers si vous souhaitez proposer un prix dégressif pour les gros volumes
        (ex. ≥ 10 unités). Sinon, le prix au détail s'applique à toutes les quantités.
      </p>

      {value.length === 0 ? (
        <Card className="p-3 text-center bg-muted/30 border-dashed">
          <p className="text-[11px] text-muted-foreground">
            Aucun palier défini — vous pouvez publier sans prix de gros.
          </p>
        </Card>
      ) : (
        <div className="space-y-2">
          {value.map((tier, idx) => (
            <Card key={idx} className="p-2 grid grid-cols-12 gap-2 items-end">
              <div className="col-span-3">
                <Label className="text-[9px] text-muted-foreground">Min ({unit})</Label>
                <Input type="number" inputMode="numeric" value={tier.min_quantity}
                  onChange={(e) => update(idx, { min_quantity: e.target.value })} className="h-7 text-xs" />
              </div>
              <div className="col-span-3">
                <Label className="text-[9px] text-muted-foreground">Max ({unit})</Label>
                <Input type="number" inputMode="numeric" value={tier.max_quantity} placeholder="∞"
                  onChange={(e) => update(idx, { max_quantity: e.target.value })} className="h-7 text-xs" />
              </div>
              <div className="col-span-5">
                <Label className="text-[9px] text-muted-foreground">Prix unitaire (FCFA)</Label>
                <Input type="number" inputMode="numeric" value={tier.price}
                  onChange={(e) => update(idx, { price: e.target.value })} className="h-7 text-xs" />
              </div>
              <div className="col-span-1">
                <Button type="button" size="sm" variant="ghost" onClick={() => remove(idx)} className="h-7 w-7 p-0 text-destructive">
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {errors.length > 0 && (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 p-2 space-y-1">
          {errors.map((err, i) => (
            <div key={i} className="flex items-start gap-1.5 text-[10px] text-destructive">
              <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
              <span>{err}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
