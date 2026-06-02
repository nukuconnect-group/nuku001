import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/contexts/ProfileContext";
import { Loader2, Plus, Trash2, Zap } from "lucide-react";
import { toast } from "sonner";

type Provider = "meta" | "tiktok" | "ga4" | "gtm" | "snapchat";
const PROVIDERS: { id: Provider; label: string; hint: string }[] = [
  { id: "meta", label: "Meta (Facebook/Instagram)", hint: "ID Pixel ex: 1234567890" },
  { id: "tiktok", label: "TikTok", hint: "SDK ID ex: C8XXXXXXXXXXX" },
  { id: "ga4", label: "Google Analytics 4", hint: "ID Mesure G-XXXXXXX" },
  { id: "gtm", label: "Google Tag Manager", hint: "GTM-XXXXX" },
  { id: "snapchat", label: "Snapchat", hint: "Pixel ID" },
];

type Pixel = { id: string; provider: Provider; pixel_id: string; is_active: boolean };

const PixelsManager = () => {
  const { profile } = useProfile();
  const [items, setItems] = useState<Pixel[]>([]);
  const [loading, setLoading] = useState(true);
  const [provider, setProvider] = useState<Provider>("meta");
  const [pixelId, setPixelId] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    if (!profile?.user_id) return;
    setLoading(true);
    const { data } = await supabase
      .from("tracking_pixels" as any)
      .select("id, provider, pixel_id, is_active")
      .eq("user_id", profile.user_id)
      .order("created_at", { ascending: false });
    setItems(((data as any[]) || []) as Pixel[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, [profile?.user_id]);

  const add = async () => {
    if (!profile?.user_id || !pixelId.trim()) return;
    setSaving(true);
    const { error } = await supabase.from("tracking_pixels" as any).upsert({
      user_id: profile.user_id, provider, pixel_id: pixelId.trim(), is_active: true,
    }, { onConflict: "user_id,provider" });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Pixel enregistré");
    setPixelId("");
    load();
  };

  const toggle = async (p: Pixel) => {
    await supabase.from("tracking_pixels" as any).update({ is_active: !p.is_active }).eq("id", p.id);
    load();
  };

  const remove = async (id: string) => {
    await supabase.from("tracking_pixels" as any).delete().eq("id", id);
    load();
  };

  return (
    <Card>
      <CardHeader className="p-4 pb-2">
        <CardTitle className="flex items-center gap-2 text-sm"><Zap className="w-4 h-4 text-primary" /> Pixels publicitaires</CardTitle>
        <CardDescription className="text-[11px]">Suivez les conversions de vos campagnes Meta, TikTok, Google, Snapchat.</CardDescription>
      </CardHeader>
      <CardContent className="p-4 space-y-4">
        <div className="grid sm:grid-cols-[1fr_1fr_auto] gap-2">
          <Select value={provider} onValueChange={(v) => setProvider(v as Provider)}>
            <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {PROVIDERS.map((p) => <SelectItem key={p.id} value={p.id} className="text-xs">{p.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Input
            value={pixelId}
            onChange={(e) => setPixelId(e.target.value)}
            placeholder={PROVIDERS.find((p) => p.id === provider)?.hint}
            className="h-9 text-xs"
          />
          <Button size="sm" onClick={add} disabled={saving || !pixelId.trim()} className="gap-1.5">
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />} Ajouter
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-4"><Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /></div>
        ) : items.length === 0 ? (
          <p className="text-[11px] text-muted-foreground text-center py-3">Aucun pixel configuré.</p>
        ) : (
          <div className="space-y-2">
            {items.map((p) => (
              <div key={p.id} className="flex items-center gap-3 p-2.5 rounded-lg border bg-muted/30">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold">{PROVIDERS.find((x) => x.id === p.provider)?.label}</p>
                  <p className="text-[10px] text-muted-foreground truncate font-mono">{p.pixel_id}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Label className="text-[10px]">Actif</Label>
                  <Switch checked={p.is_active} onCheckedChange={() => toggle(p)} />
                  <Button size="icon" variant="ghost" onClick={() => remove(p.id)}><Trash2 className="w-3.5 h-3.5 text-destructive" /></Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PixelsManager;
