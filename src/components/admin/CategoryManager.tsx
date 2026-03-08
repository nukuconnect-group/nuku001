import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useCategories, DbCategory } from "@/hooks/useCategories";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Edit, LayoutGrid, Loader2, GripVertical, Save, X, ChevronDown } from "lucide-react";

const CategoryManager = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: categories = [], isLoading } = useCategories(false);
  const [newName, setNewName] = useState("");
  const [newEmoji, setNewEmoji] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newSubcategories, setNewSubcategories] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmoji, setEditEmoji] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editSubcategories, setEditSubcategories] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["categories"] });

  const addCategory = async () => {
    if (!newName.trim()) return;
    setSaving(true);
    const subs = newSubcategories.split(",").map(s => s.trim()).filter(Boolean);
    const { error } = await supabase.from("categories").insert({
      name: newName.trim(),
      emoji: newEmoji.trim() || "📦",
      description: newDescription.trim() || null,
      subcategories: subs,
      sort_order: categories.length,
    } as any);
    setSaving(false);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Catégorie ajoutée" });
    setNewName(""); setNewEmoji(""); setNewDescription(""); setNewSubcategories("");
    refresh();
  };

  const updateCategory = async (id: string) => {
    setSaving(true);
    const subs = editSubcategories.split(",").map(s => s.trim()).filter(Boolean);
    await supabase.from("categories").update({
      name: editName.trim(),
      emoji: editEmoji.trim() || "📦",
      description: editDescription.trim() || null,
      subcategories: subs,
    } as any).eq("id", id);
    setSaving(false);
    setEditingId(null);
    toast({ title: "Catégorie modifiée" });
    refresh();
  };

  const toggleActive = async (id: string, current: boolean) => {
    await supabase.from("categories").update({ is_active: !current } as any).eq("id", id);
    refresh();
  };

  const deleteCategory = async (id: string) => {
    if (!confirm("Supprimer cette catégorie ?")) return;
    await supabase.from("categories").delete().eq("id", id);
    toast({ title: "Catégorie supprimée" });
    refresh();
  };

  const startEdit = (cat: DbCategory) => {
    setEditingId(cat.id);
    setEditName(cat.name);
    setEditEmoji(cat.emoji || "");
    setEditDescription(cat.description || "");
    setEditSubcategories((cat.subcategories || []).join(", "));
  };

  return (
    <Card>
      <CardHeader className="p-3 sm:p-4 pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <LayoutGrid className="w-4 h-4 text-primary" />
          Gestion des catégories
        </CardTitle>
        <CardDescription className="text-[11px]">
          Créez et gérez les catégories. Elles apparaissent sur toute l'application.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-3 sm:p-4 pt-0 space-y-4">
        {/* Add new category */}
        <div className="space-y-2 p-3 rounded-lg bg-muted/50 border border-border">
          <div className="grid grid-cols-[60px_1fr] sm:grid-cols-[60px_1fr_1fr] gap-2">
            <div className="space-y-1">
              <Label className="text-[10px]">Emoji</Label>
              <Input value={newEmoji} onChange={(e) => setNewEmoji(e.target.value)} placeholder="🌾" className="h-8 text-center text-lg" maxLength={4} />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px]">Nom *</Label>
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Ex: Céréales" className="h-8 text-xs" />
            </div>
            <div className="space-y-1 col-span-2 sm:col-span-1">
              <Label className="text-[10px]">Description</Label>
              <Input value={newDescription} onChange={(e) => setNewDescription(e.target.value)} placeholder="Courte description" className="h-8 text-xs" />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-[10px]">Sous-catégories (séparées par virgule)</Label>
            <Input value={newSubcategories} onChange={(e) => setNewSubcategories(e.target.value)} placeholder="Ex: Maïs, Riz, Sorgho" className="h-8 text-xs" />
          </div>
          <Button size="sm" onClick={addCategory} disabled={!newName.trim() || saving} className="gap-1.5 h-8 text-xs w-full sm:w-auto">
            {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
            Ajouter la catégorie
          </Button>
        </div>

        {/* Categories list */}
        {isLoading ? (
          <div className="text-center py-6">
            <Loader2 className="w-5 h-5 animate-spin mx-auto text-primary" />
          </div>
        ) : categories.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-6">Aucune catégorie créée</p>
        ) : (
          <div className="space-y-1">
            {categories.map((cat) => (
              <div key={cat.id} className="border border-border rounded-lg overflow-hidden">
                {editingId === cat.id ? (
                  <div className="p-3 space-y-2 bg-muted/30">
                    <div className="grid grid-cols-[60px_1fr] gap-2">
                      <Input value={editEmoji} onChange={(e) => setEditEmoji(e.target.value)} className="h-8 text-center text-lg" maxLength={4} />
                      <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="h-8 text-xs" placeholder="Nom" />
                    </div>
                    <Input value={editDescription} onChange={(e) => setEditDescription(e.target.value)} placeholder="Description" className="h-8 text-xs" />
                    <div className="space-y-1">
                      <Label className="text-[10px]">Sous-catégories (virgule)</Label>
                      <Input value={editSubcategories} onChange={(e) => setEditSubcategories(e.target.value)} placeholder="Maïs, Riz, Sorgho" className="h-8 text-xs" />
                    </div>
                    <div className="flex gap-1.5">
                      <Button size="sm" className="h-7 text-xs gap-1" onClick={() => updateCategory(cat.id)}>
                        <Save className="w-3 h-3" /> Enregistrer
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setEditingId(null)}>
                        <X className="w-3 h-3" /> Annuler
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-2 p-2.5 hover:bg-muted/30 transition-colors">
                      <GripVertical className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                      <span className="text-lg flex-shrink-0">{cat.emoji || "📦"}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium">{cat.name}</p>
                        {cat.description && <p className="text-[10px] text-muted-foreground truncate">{cat.description}</p>}
                      </div>
                      <Badge variant={cat.is_active ? "default" : "secondary"} className="text-[9px] flex-shrink-0">
                        {cat.is_active ? "Active" : "Inactive"}
                      </Badge>
                      <Switch checked={cat.is_active} onCheckedChange={() => toggleActive(cat.id, cat.is_active)} className="scale-75" />
                      {cat.subcategories && cat.subcategories.length > 0 && (
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setExpandedId(expandedId === cat.id ? null : cat.id)}>
                          <ChevronDown className={`w-3 h-3 transition-transform ${expandedId === cat.id ? "rotate-180" : ""}`} />
                        </Button>
                      )}
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => startEdit(cat)}>
                        <Edit className="w-3 h-3" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => deleteCategory(cat.id)}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                    {expandedId === cat.id && cat.subcategories && cat.subcategories.length > 0 && (
                      <div className="px-10 pb-2 flex flex-wrap gap-1">
                        {cat.subcategories.map((sub) => (
                          <Badge key={sub} variant="outline" className="text-[10px]">{sub}</Badge>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CategoryManager;
