import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAIPreferences, AIPreferences } from "@/hooks/useAIPreferences";
import { useQueryClient } from "@tanstack/react-query";
import { Sparkles, Loader2, Save } from "lucide-react";

const toList = (value: string) =>
  value
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);

interface Props {
  userId?: string;
  role?: "buyer" | "producer";
}

const AIPreferencesPanel = ({ userId, role = "buyer" }: Props) => {
  const { t } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { prefs, loading, saving, save } = useAIPreferences(userId);
  const [form, setForm] = useState<AIPreferences>(prefs);

  useEffect(() => {
    setForm(prefs);
  }, [prefs]);

  const update = <K extends keyof AIPreferences>(key: K, value: AIPreferences[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const handleSave = async () => {
    const { error } = await save(form);
    if (error) {
      toast({ title: t("aiPrefs.error"), description: error, variant: "destructive" });
      return;
    }
    // Rafraîchit immédiatement les recommandations IA
    queryClient.invalidateQueries({ queryKey: ["ai-recommendations", role, userId] });
    toast({ title: t("aiPrefs.saved"), description: t("aiPrefs.savedDesc") });
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-4 space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/20">
      <CardHeader className="p-3 sm:p-5 pb-2">
        <CardTitle className="text-sm sm:text-base flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          {t("aiPrefs.title")}
          <Badge variant="secondary" className="text-[8px] ml-auto">IA</Badge>
        </CardTitle>
        <CardDescription className="text-[11px] sm:text-xs">{t("aiPrefs.subtitle")}</CardDescription>
      </CardHeader>
      <CardContent className="p-3 sm:p-5 pt-0 space-y-4">
        <div className="space-y-1.5">
          <Label className="text-xs">{t("aiPrefs.categories")}</Label>
          <Input
            className="text-xs"
            value={form.preferred_categories.join(", ")}
            placeholder={t("aiPrefs.categoriesPlaceholder")}
            onChange={(e) => update("preferred_categories", toList(e.target.value))}
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">{t("aiPrefs.interests")}</Label>
          <Input
            className="text-xs"
            value={form.interests.join(", ")}
            placeholder={t("aiPrefs.interestsPlaceholder")}
            onChange={(e) => update("interests", toList(e.target.value))}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">{t("aiPrefs.budgetMin")}</Label>
            <Input
              type="number"
              inputMode="numeric"
              className="text-xs"
              value={form.budget_min ?? ""}
              onChange={(e) => update("budget_min", e.target.value ? Number(e.target.value) : null)}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">{t("aiPrefs.budgetMax")}</Label>
            <Input
              type="number"
              inputMode="numeric"
              className="text-xs"
              value={form.budget_max ?? ""}
              onChange={(e) => update("budget_max", e.target.value ? Number(e.target.value) : null)}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">{t("aiPrefs.radius")}</Label>
            <Input
              type="number"
              inputMode="numeric"
              className="text-xs"
              value={form.radius_km}
              onChange={(e) => update("radius_km", Number(e.target.value) || 0)}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">{t("aiPrefs.region")}</Label>
            <Input
              className="text-xs"
              value={form.preferred_region ?? ""}
              onChange={(e) => update("preferred_region", e.target.value || null)}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">{t("aiPrefs.notes")}</Label>
          <Textarea
            className="text-xs min-h-[70px]"
            value={form.notes ?? ""}
            placeholder={t("aiPrefs.notesPlaceholder")}
            onChange={(e) => update("notes", e.target.value || null)}
          />
        </div>

        <div className="flex items-center justify-between gap-3">
          <Label className="text-xs font-normal">{t("aiPrefs.usePurchase")}</Label>
          <Switch
            checked={form.use_purchase_history}
            onCheckedChange={(v) => update("use_purchase_history", v)}
          />
        </div>
        <div className="flex items-center justify-between gap-3">
          <Label className="text-xs font-normal">{t("aiPrefs.useSearch")}</Label>
          <Switch
            checked={form.use_search_history}
            onCheckedChange={(v) => update("use_search_history", v)}
          />
        </div>

        <Button onClick={handleSave} disabled={saving} className="w-full gap-2 text-xs h-9">
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          {t("aiPrefs.save")}
        </Button>
      </CardContent>
    </Card>
  );
};

export default AIPreferencesPanel;
