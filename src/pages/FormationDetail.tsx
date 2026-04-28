import SEO from "@/components/SEO";
import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import MobileBottomNav from "@/components/layout/MobileBottomNav";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import {
  ArrowLeft, Clock, Users, Play, Star, BookOpen, Award, Lock,
  Loader2, CheckCircle2, ChevronDown, ChevronUp, FileText, Video,
  GraduationCap, CalendarClock, Download,
} from "lucide-react";

const FormationDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [formation, setFormation] = useState<any>(null);
  const [modules, setModules] = useState<any[]>([]);
  const [progress, setProgress] = useState<Record<string, boolean>>({});
  const [overallProgress, setOverallProgress] = useState(0);
  const [loading, setLoading] = useState(true);
  const [expandedModule, setExpandedModule] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      // Try by UUID first, then by slug
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
      const formRes = isUUID
        ? await supabase.from("formations" as any).select("*").eq("id", id).single()
        : await supabase.from("formations" as any).select("*").eq("slug", id).single();
      
      const formationData = formRes.data as any;
      setFormation(formationData);
      
      if (!formationData) { setLoading(false); return; }
      
      const formationId = formationData.id;
      const modRes = await supabase.from("formation_modules" as any).select("*").eq("formation_id", formationId).order("sort_order", { ascending: true });
      setModules((modRes.data as any[]) || []);

      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUserId(session.user.id);
        const { data: progData } = await supabase
          .from("formation_progress" as any)
          .select("module_id, completed")
          .eq("user_id", session.user.id)
          .eq("formation_id", formationId);

        const progMap: Record<string, boolean> = {};
        ((progData as any[]) || []).forEach((p: any) => {
          if (p.module_id) progMap[p.module_id] = p.completed;
        });
        setProgress(progMap);

        const completedCount = Object.values(progMap).filter(Boolean).length;
        const total = (modRes.data as any[])?.length || 1;
        setOverallProgress(Math.round((completedCount / total) * 100));
      }
      setLoading(false);
    };
    load();
  }, [id]);

  const toggleModuleComplete = async (moduleId: string) => {
    if (!userId || !formation) return;
    const formationId = formation.id;
    const isCompleted = !progress[moduleId];

    const { error } = await supabase.from("formation_progress" as any).upsert({
      user_id: userId,
      formation_id: formationId,
      module_id: moduleId,
      completed: isCompleted,
      progress_percent: 0,
    } as any, { onConflict: "user_id,formation_id,module_id" });

    if (!error) {
      const newProgress = { ...progress, [moduleId]: isCompleted };
      setProgress(newProgress);
      const completedCount = Object.values(newProgress).filter(Boolean).length;
      const pct = Math.round((completedCount / modules.length) * 100);
      setOverallProgress(pct);

      // Update overall progress
      await supabase.from("formation_progress" as any).upsert({
        user_id: userId,
        formation_id: formationId,
        module_id: null,
        completed: pct === 100,
        progress_percent: pct,
        completed_at: pct === 100 ? new Date().toISOString() : null,
      } as any, { onConflict: "user_id,formation_id,module_id" });

      // Auto-issue certificate when 100% reached
      if (pct === 100) {
        const { data: existing } = await supabase
          .from("certificates")
          .select("id")
          .eq("user_id", userId)
          .eq("formation_id", formationId)
          .maybeSingle();
        if (!existing) {
          const number = `NUKU-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
          await supabase.from("certificates").insert({
            user_id: userId,
            formation_id: formationId,
            certificate_number: number,
          });
        }
      }
    }
  };

  const formatDuration = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return h > 0 ? `${h}h${m > 0 ? `${m}` : ""}` : `${m}min`;
  };

  const totalDuration = modules.reduce((s, m) => s + (m.duration_minutes || 0), 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!formation) {
    return (
      <div className="min-h-screen bg-background pb-14 lg:pb-0">
        <Header />
        <div className="container mx-auto px-4 py-12 text-center">
          <p className="text-muted-foreground">Formation introuvable</p>
          <Link to="/formations"><Button variant="outline" className="mt-4">Retour</Button></Link>
        </div>
        <Footer /><MobileBottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-14 lg:pb-0">
      <SEO
        url={`/formations/${formation.slug || id}`}
        title={formation.title}
        description={formation.description || `Formation agricole : ${formation.title}. Niveau ${formation.level}.`}
        image={formation.image_url || undefined}
        type="article"
      />
      <Header />

      {/* Hero */}
      <section className="relative">
        <div className="h-40 sm:h-56 lg:h-72 relative overflow-hidden">
          {formation.image_url && (
            <img src={formation.image_url} alt={formation.title} className="w-full h-full object-cover" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
        </div>
        <div className="container mx-auto px-3 sm:px-4 -mt-16 sm:-mt-20 relative z-10">
          <Link to="/formations" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-3">
            <ArrowLeft className="w-3.5 h-3.5" /> Retour aux formations
          </Link>
          <div className="flex flex-wrap gap-2 mb-2">
            <Badge variant="secondary" className="text-[10px]">{formation.category}</Badge>
            <Badge variant="outline" className="text-[10px]">{formation.level === "beginner" ? "Débutant" : formation.level === "intermediate" ? "Intermédiaire" : "Avancé"}</Badge>
            <Badge className={formation.is_paid ? "bg-primary text-primary-foreground text-[10px]" : "bg-accent text-accent-foreground text-[10px]"}>
              {formation.is_paid ? `${formation.price?.toLocaleString("fr-FR")} FCFA` : "Gratuit"}
            </Badge>
          </div>
          <h1 className="font-heading text-lg sm:text-2xl lg:text-3xl font-bold text-foreground mb-2">{formation.title}</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mb-3 max-w-2xl">{formation.description}</p>
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mb-4">
            <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{formatDuration(totalDuration)}</span>
            <span className="flex items-center gap-1"><BookOpen className="w-3.5 h-3.5" />{modules.length} chapitres</span>
            <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" />{formation.students_count || 0} étudiants</span>
            <span className="flex items-center gap-1"><Star className="w-3.5 h-3.5 text-accent fill-accent" />{formation.rating || 0}</span>
            <span className="flex items-center gap-1"><GraduationCap className="w-3.5 h-3.5" />{formation.instructor}</span>
          </div>

          {/* Overall progress */}
          {userId && overallProgress > 0 && (
            <div className="max-w-md mb-4">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-muted-foreground">Votre progression</span>
                <span className="font-semibold text-primary">{overallProgress}%</span>
              </div>
              <Progress value={overallProgress} className="h-2" />
            </div>
          )}
        </div>
      </section>

      {/* Self-paced banner + Summary + Source document */}
      <section className="py-3 sm:py-5">
        <div className="container mx-auto px-3 sm:px-4 space-y-3">
          {/* Self-paced learning notice */}
          <div className="flex items-start gap-3 rounded-lg border border-primary/20 bg-primary/5 p-3 sm:p-4">
            <CalendarClock className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
            <div className="text-xs sm:text-sm">
              <p className="font-semibold text-foreground mb-0.5">Suivez à votre rythme</p>
              <p className="text-muted-foreground leading-relaxed">
                Vous pouvez avancer dans cette formation selon votre disponibilité.
                Votre progression est sauvegardée automatiquement, vous pouvez reprendre à tout moment.
              </p>
            </div>
          </div>

          {/* Summary */}
          {formation.summary && (
            <Card>
              <CardContent className="p-3 sm:p-4">
                <h2 className="font-heading text-sm sm:text-base font-bold text-foreground mb-2 flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-primary" />
                  Résumé de la formation
                </h2>
                <p className="text-xs sm:text-sm text-muted-foreground whitespace-pre-line leading-relaxed">
                  {formation.summary}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Source PDF preview */}
          {formation.source_document_url && (
            <Card>
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <h2 className="font-heading text-sm sm:text-base font-bold text-foreground flex items-center gap-2">
                    <FileText className="w-4 h-4 text-primary" />
                    Document de la formation
                  </h2>
                  <a href={formation.source_document_url} target="_blank" rel="noopener noreferrer" download>
                    <Button variant="outline" size="sm" className="text-xs gap-1">
                      <Download className="w-3 h-3" /> Télécharger
                    </Button>
                  </a>
                </div>
                {formation.source_document_name && (
                  <p className="text-[11px] text-muted-foreground mb-2 truncate">{formation.source_document_name}</p>
                )}
                <div className="w-full rounded-lg overflow-hidden border border-border bg-muted" style={{ height: "60vh", minHeight: 320 }}>
                  <iframe
                    src={`${formation.source_document_url}#view=FitH`}
                    title={formation.source_document_name || "Document"}
                    className="w-full h-full"
                  />
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </section>

      {/* Modules / Chapters */}
      <section className="py-4 sm:py-8">
        <div className="container mx-auto px-3 sm:px-4">
          <h2 className="font-heading text-sm sm:text-lg font-bold text-foreground mb-4 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-primary" />
            Programme du cours ({modules.length} chapitres)
          </h2>

          <div className="space-y-2">
            {modules.map((mod, idx) => {
              const isCompleted = progress[mod.id];
              const isExpanded = expandedModule === mod.id;

              return (
                <Card key={mod.id} className={`overflow-hidden transition-all ${isCompleted ? "border-primary/30 bg-primary/5" : ""}`}>
                  <button
                    onClick={() => setExpandedModule(isExpanded ? null : mod.id)}
                    className="w-full flex items-center gap-3 p-3 sm:p-4 text-left"
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold ${
                      isCompleted ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                    }`}>
                      {isCompleted ? <CheckCircle2 className="w-4 h-4" /> : idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-xs sm:text-sm text-foreground line-clamp-1">{mod.title}</h3>
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
                        {mod.content_type === "video" ? (
                          <span className="flex items-center gap-0.5"><Video className="w-3 h-3" />Vidéo</span>
                        ) : (
                          <span className="flex items-center gap-0.5"><FileText className="w-3 h-3" />PDF</span>
                        )}
                        <span>• {mod.duration_minutes}min</span>
                      </div>
                    </div>
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                  </button>

                  {isExpanded && (
                    <CardContent className="pt-0 px-3 sm:px-4 pb-3 sm:pb-4 border-t border-border space-y-3">
                      {mod.description && (
                        <p className="text-xs text-muted-foreground whitespace-pre-line">{mod.description}</p>
                      )}

                      {/* Content viewer — self-paced learning */}
                      {mod.content_url && mod.content_type === "video" && (() => {
                        const url = mod.content_url as string;
                        const ytMatch = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{11})/);
                        const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
                        if (ytMatch) {
                          return (
                            <div className="aspect-video w-full rounded-lg overflow-hidden bg-muted">
                              <iframe
                                src={`https://www.youtube.com/embed/${ytMatch[1]}`}
                                title={mod.title}
                                className="w-full h-full"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                              />
                            </div>
                          );
                        }
                        if (vimeoMatch) {
                          return (
                            <div className="aspect-video w-full rounded-lg overflow-hidden bg-muted">
                              <iframe
                                src={`https://player.vimeo.com/video/${vimeoMatch[1]}`}
                                title={mod.title}
                                className="w-full h-full"
                                allow="autoplay; fullscreen; picture-in-picture"
                                allowFullScreen
                              />
                            </div>
                          );
                        }
                        // Direct video file
                        if (/\.(mp4|webm|ogg|mov)$/i.test(url)) {
                          return (
                            <video
                              src={url}
                              controls
                              className="w-full rounded-lg bg-black aspect-video"
                            >
                              Votre navigateur ne supporte pas la lecture vidéo.
                            </video>
                          );
                        }
                        return (
                          <a href={url} target="_blank" rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline">
                            <Video className="w-3.5 h-3.5" /> Ouvrir la vidéo
                          </a>
                        );
                      })()}

                      {mod.content_url && mod.content_type !== "video" && (
                        <a href={mod.content_url} target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline">
                          <FileText className="w-3.5 h-3.5" /> Ouvrir la ressource
                        </a>
                      )}

                      <div className="flex flex-wrap gap-2 pt-1">
                        {userId ? (
                          <>
                            <Button
                              variant={isCompleted ? "outline" : "hero"}
                              size="sm"
                              className="text-xs gap-1"
                              onClick={(e) => { e.stopPropagation(); toggleModuleComplete(mod.id); }}
                            >
                              {isCompleted ? (
                                <><CheckCircle2 className="w-3 h-3" />Terminé — annuler</>
                              ) : (
                                <><CheckCircle2 className="w-3 h-3" />Marquer comme terminé</>
                              )}
                            </Button>
                            {idx < modules.length - 1 && isCompleted && (
                              <Button variant="outline" size="sm" className="text-xs gap-1"
                                onClick={(e) => { e.stopPropagation(); setExpandedModule(modules[idx + 1].id); }}>
                                <Play className="w-3 h-3" /> Chapitre suivant
                              </Button>
                            )}
                          </>
                        ) : (
                          <Link to="/auth">
                            <Button variant="hero" size="sm" className="text-xs gap-1">
                              <Lock className="w-3 h-3" />Connectez-vous pour suivre
                            </Button>
                          </Link>
                        )}
                      </div>
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </div>

          {/* Certificate */}
          {overallProgress === 100 && (
            <Card className="mt-6 bg-gradient-hero text-primary-foreground">
              <CardContent className="p-4 sm:p-6 flex items-center gap-4">
                <Award className="w-10 h-10 flex-shrink-0" />
                <div>
                  <h3 className="font-heading font-bold text-base sm:text-lg">Félicitations ! 🎉</h3>
                  <p className="text-xs sm:text-sm opacity-90">Votre certificat a été généré et est disponible dans votre profil.</p>
                </div>
                <Link to="/learner-dashboard" className="ml-auto flex-shrink-0">
                  <Button variant="secondary" size="sm" className="text-xs">
                    <Award className="w-3.5 h-3.5 mr-1" />Voir mon certificat
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}
        </div>
      </section>

      <Footer />
      <MobileBottomNav />
    </div>
  );
};

export default FormationDetail;
