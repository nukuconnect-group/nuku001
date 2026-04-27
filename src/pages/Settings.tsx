import SEO from "@/components/SEO";
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/contexts/ProfileContext";
import { useLanguage, type LangCode, type CurrencyCode } from "@/contexts/LanguageContext";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import MobileBottomNav from "@/components/layout/MobileBottomNav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useResolvedUserType } from "@/hooks/useResolvedUserType";
import {
  User, Camera, Loader2, Save, Trash2, Plus, ChevronLeft, ChevronRight, Store, MapPin, Phone, Mail, FileText, Globe, DollarSign, Sun, Moon, Monitor
} from "lucide-react";
import { useTheme, type ThemeMode } from "@/contexts/ThemeContext";

const Settings = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, profile: ctxProfile, isLoading, isReady, updateProfile } = useProfile();
  const { lang, setLang, currency, setCurrency } = useLanguage();
  const { theme, setTheme } = useTheme();
  const resolvedUserType = useResolvedUserType(user?.id, ctxProfile?.user_type);

  // Form state
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState("");
  const [bio, setBio] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [coverImages, setCoverImages] = useState<string[]>([]);
  const [currentCoverIndex, setCurrentCoverIndex] = useState(0);

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const profile = ctxProfile;

  useEffect(() => {
    if (!isReady || isLoading) return;
    if (!user) navigate("/auth", { replace: true });
  }, [isReady, isLoading, user, navigate]);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || "");
      setLocation(profile.location || "");
      setBio(profile.bio || "");
      const imgs = (profile as any).cover_images as string[] | null;
      setCoverImages(imgs && imgs.length > 0 ? imgs : profile.cover_url ? [profile.cover_url] : []);
    }
    // Fetch phone from private table
    if (user) {
      supabase.from("profile_private").select("phone").eq("user_id", user.id).maybeSingle()
        .then(({ data }) => setPhone(data?.phone || ""));
    }
  }, [profile, user]);

  // Auto-rotate cover images
  useEffect(() => {
    if (coverImages.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentCoverIndex(prev => (prev + 1) % coverImages.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [coverImages.length]);

  const handleUploadImage = async (file: File, type: "avatar" | "cover") => {
    if (!user || !profile) return;
    const setter = type === "avatar" ? setIsUploadingAvatar : setIsUploadingCover;
    setter(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${user.id}/${type}-${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("product-images").upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from("product-images").getPublicUrl(path);

      if (type === "avatar") {
        await supabase.from("profiles").update({ avatar_url: publicUrl }).eq("id", profile.id);
        updateProfile({ avatar_url: publicUrl });
      } else {
        const newImages = [...coverImages, publicUrl];
        setCoverImages(newImages);
        await supabase.from("profiles").update({ cover_url: publicUrl, cover_images: newImages } as any).eq("id", profile.id);
        setCurrentCoverIndex(newImages.length - 1);
        updateProfile({ cover_url: publicUrl, cover_images: newImages });
      }
      toast({ title: "Image mise à jour ✓" });
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    } finally {
      setter(false);
    }
  };

  const handleRemoveCoverImage = async (index: number) => {
    const newImages = coverImages.filter((_, i) => i !== index);
    setCoverImages(newImages);
    setCurrentCoverIndex(prev => Math.min(prev, Math.max(0, newImages.length - 1)));
    await supabase.from("profiles").update({ 
      cover_url: newImages[0] || null, 
      cover_images: newImages 
    } as any).eq("id", profile.id);
    toast({ title: "Image supprimée" });
  };

  const handleSave = async () => {
    if (!profile || !user) return;
    setIsSaving(true);
    try {
      const { error } = await supabase.from("profiles").update({
        full_name: fullName, location, bio,
      }).eq("id", profile.id);
      if (error) throw error;
      // Save phone to private table
      await supabase.from("profile_private").upsert({ user_id: user.id, phone }, { onConflict: "user_id" });
      updateProfile({ full_name: fullName, location, bio });
      toast({ title: "Profil mis à jour ✓" });
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background pb-20 lg:pb-0">
        <SEO url="/settings" title="Paramètres du Profil" description="Gérez vos informations personnelles et les paramètres de votre compte." noIndex />
        <Header />
        <main className="pt-4 sm:pt-8 pb-8 sm:pb-12">
          <div className="container mx-auto px-3 sm:px-4 max-w-3xl space-y-5">
            <div className="h-7 w-48 rounded bg-muted animate-pulse" />
            <div className="h-44 rounded-xl bg-muted animate-pulse" />
            <div className="h-32 rounded-xl bg-muted animate-pulse" />
            <div className="h-56 rounded-xl bg-muted animate-pulse" />
            <div className="h-40 rounded-xl bg-muted animate-pulse" />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 lg:pb-0">
      <Header />
      <main className="pt-4 sm:pt-8 pb-8 sm:pb-12">
        <div className="container mx-auto px-3 sm:px-4 max-w-3xl">
          <h1 className="font-heading text-lg sm:text-2xl font-bold text-foreground mb-5">
            Paramètres du profil
          </h1>

          {/* Cover Images Carousel */}
          <Card className="mb-5 overflow-hidden">
            <CardHeader className="p-3 sm:p-4 pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Camera className="w-4 h-4 text-primary" />
                Images d'arrière-plan
              </CardTitle>
              <CardDescription className="text-[11px]">
                Ajoutez plusieurs images promotionnelles qui défilent sur votre profil
              </CardDescription>
            </CardHeader>
            <CardContent className="p-3 sm:p-4 pt-0">
              <div className="relative w-full h-40 sm:h-52 rounded-xl overflow-hidden bg-muted mb-3">
                {coverImages.length > 0 ? (
                  <>
                    {coverImages.map((img, i) => (
                      <img
                        key={i}
                        src={img}
                        alt={`Cover ${i + 1}`}
                        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ${
                          i === currentCoverIndex ? "opacity-100" : "opacity-0"
                        }`}
                      />
                    ))}
                    {coverImages.length > 1 && (
                      <>
                        <button
                          onClick={() => setCurrentCoverIndex(prev => (prev - 1 + coverImages.length) % coverImages.length)}
                          className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-background/80 flex items-center justify-center hover:bg-background transition-colors z-10"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setCurrentCoverIndex(prev => (prev + 1) % coverImages.length)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-background/80 flex items-center justify-center hover:bg-background transition-colors z-10"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
                          {coverImages.map((_, i) => (
                            <button
                              key={i}
                              onClick={() => setCurrentCoverIndex(i)}
                              className={`w-2 h-2 rounded-full transition-all ${
                                i === currentCoverIndex ? "bg-primary-foreground w-4" : "bg-primary-foreground/50"
                              }`}
                            />
                          ))}
                        </div>
                      </>
                    )}
                    <button
                      onClick={() => handleRemoveCoverImage(currentCoverIndex)}
                      className="absolute top-2 right-2 w-7 h-7 rounded-full bg-destructive/80 flex items-center justify-center hover:bg-destructive transition-colors z-10"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-destructive-foreground" />
                    </button>
                  </>
                ) : (
                  <div className="w-full h-full bg-gradient-to-r from-primary/20 to-accent/20 flex items-center justify-center">
                    <p className="text-xs text-muted-foreground">Aucune image d'arrière-plan</p>
                  </div>
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs"
                onClick={() => coverInputRef.current?.click()}
                disabled={isUploadingCover}
              >
                {isUploadingCover ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                Ajouter une image
              </Button>
              <input ref={coverInputRef} type="file" accept="image/*" className="hidden"
                onChange={(e) => { if (e.target.files?.[0]) handleUploadImage(e.target.files[0], "cover"); }} />
              {coverImages.length > 0 && (
                <p className="text-[10px] text-muted-foreground mt-2">
                  {coverImages.length} image{coverImages.length > 1 ? "s" : ""} • Image {currentCoverIndex + 1}/{coverImages.length}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Avatar + Info */}
          <Card className="mb-5">
            <CardHeader className="p-3 sm:p-4 pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <User className="w-4 h-4 text-primary" />
                Informations personnelles
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 sm:p-4 pt-0 space-y-5">
              {/* Avatar */}
              <div className="flex items-center gap-4">
                <div
                  className="relative w-20 h-20 rounded-full overflow-hidden bg-gradient-to-br from-primary to-accent cursor-pointer group flex-shrink-0"
                  onClick={() => avatarInputRef.current?.click()}
                >
                  {profile?.avatar_url ? (
                    <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <User className="w-8 h-8 text-primary-foreground" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-foreground/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-full">
                    {isUploadingAvatar ? (
                      <Loader2 className="w-5 h-5 animate-spin text-primary-foreground" />
                    ) : (
                      <Camera className="w-5 h-5 text-primary-foreground" />
                    )}
                  </div>
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{profile?.full_name}</p>
                  <p className="text-xs text-muted-foreground capitalize">
                    {resolvedUserType === "producer" ? "Fournisseur" : 
                     resolvedUserType === "driver" ? "Livreur" : 
                     resolvedUserType === "trainer" ? "Formateur" :
                     resolvedUserType === "learner" ? "Apprenant" : "Acheteur"}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Cliquez pour changer la photo</p>
                </div>
              </div>
              <input ref={avatarInputRef} type="file" accept="image/*" className="hidden"
                onChange={(e) => { if (e.target.files?.[0]) handleUploadImage(e.target.files[0], "avatar"); }} />

              {/* Form */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs font-semibold mb-1.5 flex items-center gap-1.5"><User className="w-3 h-3" /> Nom complet</Label>
                  <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Votre nom" className="text-sm h-10" />
                </div>
                <div>
                  <Label className="text-xs font-semibold mb-1.5 flex items-center gap-1.5"><Phone className="w-3 h-3" /> Téléphone</Label>
                  <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+228 XX XX XX XX" className="text-sm h-10" />
                </div>
                <div>
                  <Label className="text-xs font-semibold mb-1.5 flex items-center gap-1.5"><MapPin className="w-3 h-3" /> Localisation</Label>
                  <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Lomé, Togo" className="text-sm h-10" />
                </div>
                <div>
                  <Label className="text-xs font-semibold mb-1.5 flex items-center gap-1.5"><Mail className="w-3 h-3" /> Email</Label>
                  <Input value={user?.email || ""} disabled className="text-sm h-10 bg-muted" />
                </div>
              </div>
              <div>
                <Label className="text-xs font-semibold mb-1.5 flex items-center gap-1.5"><FileText className="w-3 h-3" /> Bio</Label>
                <Textarea value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Décrivez-vous en quelques mots..." rows={3} className="text-sm" />
              </div>

              <Button onClick={handleSave} disabled={isSaving} className="gap-2 w-full sm:w-auto">
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Enregistrer les modifications
              </Button>
            </CardContent>
          </Card>

          {/* Language & Currency */}
          <Card className="mb-5">
            <CardHeader className="p-3 sm:p-4 pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Globe className="w-4 h-4 text-primary" />
                Langue et devise
              </CardTitle>
              <CardDescription className="text-[11px]">
                Choisissez votre langue et votre devise préférée
              </CardDescription>
            </CardHeader>
            <CardContent className="p-3 sm:p-4 pt-0">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs font-semibold mb-1.5 flex items-center gap-1.5">
                    <Globe className="w-3 h-3" /> Langue
                  </Label>
                  <Select value={lang} onValueChange={(v) => setLang(v as LangCode)}>
                    <SelectTrigger className="text-sm h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fr">🇫🇷 Français</SelectItem>
                      <SelectItem value="en">🇬🇧 English</SelectItem>
                      <SelectItem value="ewe">🇹🇬 Ewe</SelectItem>
                      <SelectItem value="kab">🇹🇬 Kabyè</SelectItem>
                      <SelectItem value="wo">🇸🇳 Wolof</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs font-semibold mb-1.5 flex items-center gap-1.5">
                    <DollarSign className="w-3 h-3" /> Devise
                  </Label>
                  <Select value={currency} onValueChange={(v) => setCurrency(v as CurrencyCode)}>
                    <SelectTrigger className="text-sm h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="XOF">FCFA (XOF)</SelectItem>
                      <SelectItem value="USD">Dollar ($)</SelectItem>
                      <SelectItem value="EUR">Euro (€)</SelectItem>
                      <SelectItem value="GBP">Livre (£)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Appearance — Theme */}
          <Card className="mb-5">
            <CardHeader className="p-3 sm:p-4 pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Sun className="w-4 h-4 text-primary" />
                Apparence
              </CardTitle>
              <CardDescription className="text-[11px]">
                Choisissez le thème clair, sombre, ou suivez votre système.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-3 sm:p-4 pt-0">
              <div className="grid grid-cols-3 gap-2">
                {([
                  { value: "light", label: "Clair", Icon: Sun },
                  { value: "dark", label: "Sombre", Icon: Moon },
                  { value: "system", label: "Système", Icon: Monitor },
                ] as { value: ThemeMode; label: string; Icon: any }[]).map(({ value, label, Icon }) => (
                  <button
                    key={value}
                    onClick={() => setTheme(value)}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border transition-colors ${
                      theme === value
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-background hover:bg-muted text-foreground"
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="text-xs font-medium">{label}</span>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Become Producer (only for buyers) */}
          {resolvedUserType === "buyer" && (
            <Card className="bg-gradient-to-r from-primary/10 to-accent/10 border-primary/20">
              <CardContent className="p-4 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                    <Store className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-heading text-sm font-semibold text-foreground">Devenez fournisseur</h3>
                    <p className="text-[11px] text-muted-foreground">Vendez vos produits agricoles sur NUKUCONNECT</p>
                  </div>
                </div>
                <Button
                  onClick={() => navigate("/devenir-fournisseur")}
                  className="gap-1.5 text-xs w-full sm:w-auto"
                >
                  <Store className="w-3.5 h-3.5" />
                  Devenir fournisseur
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
      <Footer />
      <MobileBottomNav />
    </div>
  );
};

export default Settings;
