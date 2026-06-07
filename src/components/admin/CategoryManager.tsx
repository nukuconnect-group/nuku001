import { useState, useRef } from "react";
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
import { Plus, Trash2, Edit, LayoutGrid, Loader2, GripVertical, Save, X, ChevronDown, ImagePlus } from "lucide-react";

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
  const [editImageUrl, setEditImageUrl] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      image_url: editImageUrl,
    } as any).eq("id", id);
    setSaving(false);
    setEditingId(null);
    toast({ title: "Catégorie modifiée" });
    refresh();
  };

  // Client-side compression for large images (>2 MB or width > 2000px)
  const compressImage = async (file: File, maxBytes = 2 * 1024 * 1024, maxDim = 2000): Promise<File> => {
    if (file.size <= maxBytes && !file.type.includes("png")) return file;
    try {
      const bitmap = await createImageBitmap(file);
      const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
      const w = Math.round(bitmap.width * scale);
      const h = Math.round(bitmap.height * scale);
      const canvas = document.createElement("canvas");
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) return file;
      ctx.drawImage(bitmap, 0, 0, w, h);
      const blob: Blob | null = await new Promise((res) => canvas.toBlob(res, "image/jpeg", 0.85));
      if (!blob) return file;
      return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg" });
    } catch {
      return file;
    }
  };

  const uploadImage = async (id: string, rawFile: File) => {
    if (!rawFile.type.startsWith("image/")) {
      toast({ title: "Format invalide", description: "Choisissez une image (JPG, PNG, WebP).", variant: "destructive" });
      return;
    }
    // Garde-fou très large (50 Mo). Au-delà, on compresse côté client.
    if (rawFile.size > 50 * 1024 * 1024) {
      toast({ title: "Image trop lourde", description: "Maximum 50 Mo.", variant: "destructive" });
      return;
    }
    setUploadingId(id);
    const file = await compressImage(rawFile);
    const ext = (file.type.split("/")[1] || "jpg").replace("jpeg", "jpg");
    const path = `${id}/${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("category-images")
      .upload(path, file, { cacheControl: "3600", upsert: false, contentType: file.type });
    if (uploadError) {
      setUploadingId(null);
      toast({ title: "Échec de l'upload", description: uploadError.message, variant: "destructive" });
      return;
    }
    const { data: urlData } = supabase.storage.from("category-images").getPublicUrl(path);
    const publicUrl = urlData.publicUrl;
    if (editingId === id) {
      setEditImageUrl(publicUrl);
    } else {
      await supabase.from("categories").update({ image_url: publicUrl } as any).eq("id", id);
    }
    setUploadingId(null);
    toast({ title: "Image mise à jour" });
    refresh();
  };

  const removeImage = async (id: string) => {
    if (!confirm("Retirer l'image de cette catégorie ?")) return;
    if (editingId === id) {
      setEditImageUrl(null);
    } else {
      await supabase.from("categories").update({ image_url: null } as any).eq("id", id);
    }
    toast({ title: "Image retirée" });
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
    setEditImageUrl(cat.image_url || null);
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
          <p className="text-[10px] text-muted-foreground">💡 Vous pourrez ajouter une image après création (icône image en mode édition).</p>
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
                    {/* Image management */}
                    <div className="space-y-1.5">
                      <Label className="text-[10px]">Image de la catégorie (page d'accueil)</Label>
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-16 rounded-md overflow-hidden border border-border bg-muted flex-shrink-0 flex items-center justify-center">
                          {editImageUrl ? (
                            <img src={editImageUrl} alt="aperçu" className="w-full h-full object-cover" />
                          ) : (
                            <ImagePlus className="w-5 h-5 text-muted-foreground" />
                          )}
                        </div>
                        <div className="flex flex-col gap-1.5 flex-1">
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/jpeg,image/png,image/webp,image/gif"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) uploadImage(cat.id, file);
                              e.target.value = "";
                            }}
                          />
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-7 text-[11px] gap-1"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploadingId === cat.id}
                          >
                            {uploadingId === cat.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <ImagePlus className="w-3 h-3" />}
                            {editImageUrl ? "Remplacer" : "Téléverser"}
                          </Button>
                          {editImageUrl && (
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              className="h-7 text-[11px] text-destructive gap-1"
                              onClick={() => removeImage(cat.id)}
                            >
                              <Trash2 className="w-3 h-3" /> Retirer
                            </Button>
                          )}
                        </div>
                      </div>
                      <p className="text-[10px] text-muted-foreground">JPG, PNG ou WebP — jusqu'à 50 Mo (compression automatique). Si vide, une image par défaut s'affiche.</p>
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
                      {cat.image_url ? (
                        <img src={cat.image_url} alt={cat.name} className="w-9 h-9 rounded object-cover flex-shrink-0 border border-border" />
                      ) : (
                        <span className="text-lg flex-shrink-0">{cat.emoji || "📦"}</span>
                      )}
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
