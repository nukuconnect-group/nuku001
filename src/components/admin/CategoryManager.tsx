import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Edit, LayoutGrid, Loader2, GripVertical, Save, X } from "lucide-react";

interface Category {
  id: string;
  name: string;
  icon: string;
  description: string | null;
  is_active: boolean;
  sort_order: number;
}

const CategoryManager = () => {
  const { toast } = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchCategories = async () => {
    const { data } = await supabase
      .from("categories")
      .select("*")
      .order("sort_order", { ascending: true });
    setCategories((data as any[]) || []);
    setIsLoading(false);
  };

  useEffect(() => { fetchCategories(); }, []);

  const addCategory = async () => {
    if (!newName.trim()) return;
    setSaving(true);
    const { error } = await supabase.from("categories").insert({
      name: newName.trim(),
      description: newDescription.trim() || null,
      sort_order: categories.length,
    } as any);
    setSaving(false);
    if (error) {
      toast({ title: "Erreur", description: error.message.includes("unique") ? "Cette catégorie existe déjà" : error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Catégorie ajoutée" });
    setNewName("");
    setNewDescription("");
    fetchCategories();
  };

  const updateCategory = async (id: string) => {
    setSaving(true);
    await supabase.from("categories").update({
      name: editName.trim(),
      description: editDescription.trim() || null,
    } as any).eq("id", id);
    setSaving(false);
    setEditingId(null);
    toast({ title: "Catégorie modifiée" });
    fetchCategories();
  };

  const toggleActive = async (id: string, current: boolean) => {
    await supabase.from("categories").update({ is_active: !current } as any).eq("id", id);
    fetchCategories();
  };

  const deleteCategory = async (id: string) => {
    if (!confirm("Supprimer cette catégorie ?")) return;
    await supabase.from("categories").delete().eq("id", id);
    toast({ title: "Catégorie supprimée" });
    fetchCategories();
  };

  return (
    <Card>
      <CardHeader className="p-3 sm:p-4 pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <LayoutGrid className="w-4 h-4 text-primary" />
          Gestion des catégories
        </CardTitle>
        <CardDescription className="text-[11px]">
          Créez et gérez les catégories disponibles pour les fournisseurs
        </CardDescription>
      </CardHeader>
      <CardContent className="p-3 sm:p-4 pt-0 space-y-4">
        {/* Add new category */}
        <div className="flex flex-col sm:flex-row gap-2 p-3 rounded-lg bg-muted/50 border border-border">
          <div className="flex-1 space-y-2">
            <Label className="text-xs">Nom de la catégorie</Label>
            <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Ex: Céréales" className="h-8 text-xs" />
          </div>
          <div className="flex-1 space-y-2">
            <Label className="text-xs">Description (optionnel)</Label>
            <Input value={newDescription} onChange={(e) => setNewDescription(e.target.value)} placeholder="Courte description" className="h-8 text-xs" />
          </div>
          <div className="flex items-end">
            <Button size="sm" onClick={addCategory} disabled={!newName.trim() || saving} className="gap-1.5 h-8 text-xs">
              {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
              Ajouter
            </Button>
          </div>
        </div>

        {/* Categories list */}
        {isLoading ? (
          <div className="text-center py-6">
            <Loader2 className="w-5 h-5 animate-spin mx-auto text-primary" />
          </div>
        ) : categories.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-6">Aucune catégorie créée</p>
        ) : (
          <div className="space-y-1.5">
            {categories.map((cat) => (
              <div key={cat.id} className="flex items-center gap-2 p-2.5 rounded-lg border border-border hover:bg-muted/30 transition-colors">
                <GripVertical className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                {editingId === cat.id ? (
                  <>
                    <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="h-7 text-xs flex-1" />
                    <Input value={editDescription} onChange={(e) => setEditDescription(e.target.value)} placeholder="Description" className="h-7 text-xs flex-1" />
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => updateCategory(cat.id)}>
                      <Save className="w-3 h-3 text-primary" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditingId(null)}>
                      <X className="w-3 h-3" />
                    </Button>
                  </>
                ) : (
                  <>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium">{cat.name}</p>
                      {cat.description && <p className="text-[10px] text-muted-foreground truncate">{cat.description}</p>}
                    </div>
                    <Badge variant={cat.is_active ? "default" : "secondary"} className="text-[9px]">
                      {cat.is_active ? "Active" : "Inactive"}
                    </Badge>
                    <Switch checked={cat.is_active} onCheckedChange={() => toggleActive(cat.id, cat.is_active)} className="scale-75" />
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setEditingId(cat.id); setEditName(cat.name); setEditDescription(cat.description || ""); }}>
                      <Edit className="w-3 h-3" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => deleteCategory(cat.id)}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
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
