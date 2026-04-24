import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Plus, Trash2, Layers } from "lucide-react";

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
}

export default function PriceTiersEditor({ value, onChange, unit, basePrice }: Props) {
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
          Tarifs dégressifs (gros / détail) — optionnel
        </Label>
        <Button type="button" size="sm" variant="outline" onClick={add} className="h-7 text-[10px] gap-1">
          <Plus className="w-3 h-3" />Ajouter palier
        </Button>
      </div>
      <p className="text-[10px] text-muted-foreground">
        Affichez plusieurs prix selon la quantité commandée (style Alibaba). Le prix de base sert pour les commandes ne correspondant à aucun palier.
      </p>

      {value.length === 0 ? (
        <Card className="p-3 text-center bg-muted/30 border-dashed">
          <p className="text-[11px] text-muted-foreground">Aucun palier — ajoutez-en pour proposer des prix gros.</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {value.map((tier, idx) => (
            <Card key={idx} className="p-2 grid grid-cols-12 gap-2 items-end">
              <div className="col-span-3">
                <Label className="text-[9px] text-muted-foreground">Min ({unit})</Label>
                <Input
                  type="number"
                  inputMode="numeric"
                  value={tier.min_quantity}
                  onChange={(e) => update(idx, { min_quantity: e.target.value })}
                  className="h-7 text-xs"
                />
              </div>
              <div className="col-span-3">
                <Label className="text-[9px] text-muted-foreground">Max ({unit})</Label>
                <Input
                  type="number"
                  inputMode="numeric"
                  value={tier.max_quantity}
                  placeholder="∞"
                  onChange={(e) => update(idx, { max_quantity: e.target.value })}
                  className="h-7 text-xs"
                />
              </div>
              <div className="col-span-5">
                <Label className="text-[9px] text-muted-foreground">Prix unitaire (FCFA)</Label>
                <Input
                  type="number"
                  inputMode="numeric"
                  value={tier.price}
                  onChange={(e) => update(idx, { price: e.target.value })}
                  className="h-7 text-xs"
                />
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
    </div>
  );
}
