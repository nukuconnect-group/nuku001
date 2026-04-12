import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { GraduationCap, Play, Clock, BookOpen, Star, Award, ChevronRight, Loader2 } from "lucide-react";

interface Formation {
  id: string;
  title: string;
  instructor: string;
  image_url: string;
  duration_minutes: number;
  category: string;
  level: string;
  is_paid: boolean;
  price: number;
  modules_count: number;
  rating: number;
}

interface FormationProgress {
  formation_id: string;
  progress_percent: number;
}

const FormationsSection = () => {
  const [enrolledFormations, setEnrolledFormations] = useState<Formation[]>([]);
  const [progress, setProgress] = useState<FormationProgress[]>([]);
  const [certificates, setCertificates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.user) {
        setLoading(false);
        return;
      }

      // Only fetch formations the user is enrolled in
      const [progressRes, certsRes] = await Promise.all([
        supabase.from("formation_progress" as any).select("formation_id, progress_percent").eq("user_id", session.user.id).is("module_id", null),
        supabase.from("certificates" as any).select("*").eq("user_id", session.user.id),
      ]);
      
      const enrolledProgress = (progressRes.data as any[]) || [];
      setProgress(enrolledProgress);
      setCertificates((certsRes.data as any[]) || []);

      // Fetch only enrolled formations
      if (enrolledProgress.length > 0) {
        const formationIds = enrolledProgress.map(p => p.formation_id);
        const { data: formationsData } = await supabase
          .from("formations" as any)
          .select("*")
          .in("id", formationIds)
          .eq("is_published", true);
        setEnrolledFormations((formationsData as any[]) || []);
      }

      setLoading(false);
    };
    load();
  }, []);

  const getProgress = (formationId: string) => {
    const p = progress.find(pr => pr.formation_id === formationId);
    return p?.progress_percent || 0;
  };

  const formatDuration = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return h > 0 ? `${h}h ${m > 0 ? `${m}min` : ''}` : `${m}min`;
  };

  const levelLabels: Record<string, string> = {
    beginner: "Débutant",
    intermediate: "Intermédiaire",
    advanced: "Avancé",
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-heading text-sm sm:text-base font-semibold flex items-center gap-2">
          <GraduationCap className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
          Mes Formations
        </h3>
        <Link to="/formations">
          <Button variant="ghost" size="sm" className="gap-1 text-xs h-7">
            Tout voir <ChevronRight className="w-3 h-3" />
          </Button>
        </Link>
      </div>

      {/* Certificates count */}
      {certificates.length > 0 && (
        <div className="flex items-center gap-2 bg-primary/5 border border-primary/20 rounded-lg p-2.5">
          <Award className="w-4 h-4 text-primary flex-shrink-0" />
          <span className="text-xs text-foreground">
            <strong>{certificates.length}</strong> certificat{certificates.length > 1 ? "s" : ""} obtenu{certificates.length > 1 ? "s" : ""}
          </span>
        </div>
      )}

      {/* Only show enrolled formations */}
      {enrolledFormations.length === 0 ? (
        <Card className="p-6 text-center">
          <GraduationCap className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-xs text-muted-foreground mb-3">Vous n'êtes inscrit à aucune formation</p>
          <Link to="/formations">
            <Button variant="hero" size="sm" className="text-xs">Explorer les formations</Button>
          </Link>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {enrolledFormations.map((f) => {
            const prog = getProgress(f.id);
            return (
              <Card key={f.id} className="group overflow-hidden hover:shadow-elevated transition-all">
                <div className="flex">
                  <div className="relative w-24 h-24 sm:w-28 sm:h-28 overflow-hidden flex-shrink-0">
                    <img src={f.image_url} alt={f.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-8 h-8 rounded-full bg-foreground/50 flex items-center justify-center">
                        <Play className="w-4 h-4 text-primary-foreground" />
                      </div>
                    </div>
                    <Badge className="absolute top-1 left-1 text-[8px] px-1 py-0" variant={f.is_paid ? "default" : "secondary"}>
                      {f.is_paid ? `${f.price?.toLocaleString()} F` : "Gratuit"}
                    </Badge>
                  </div>
                  <CardContent className="p-2.5 flex-1 min-w-0">
                    <h4 className="font-semibold text-xs text-foreground line-clamp-2 mb-1">{f.title}</h4>
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground mb-1">
                      <span className="flex items-center gap-0.5"><Clock className="w-2.5 h-2.5" />{formatDuration(f.duration_minutes)}</span>
                      <span className="flex items-center gap-0.5"><BookOpen className="w-2.5 h-2.5" />{f.modules_count}</span>
                      <span className="flex items-center gap-0.5"><Star className="w-2.5 h-2.5 text-accent fill-accent" />{f.rating}</span>
                    </div>
                    <Badge variant="outline" className="text-[8px] px-1 py-0 mb-1.5">{levelLabels[f.level] || f.level}</Badge>
                    {prog > 0 && (
                      <div>
                        <div className="flex items-center justify-between text-[9px] mb-0.5">
                          <span className="text-muted-foreground">Progression</span>
                          <span className="font-medium text-primary">{prog}%</span>
                        </div>
                        <Progress value={prog} className="h-1" />
                      </div>
                    )}
                    {prog > 0 && prog < 100 && (
                      <Link to="/formations">
                        <Button variant="outline" size="sm" className="w-full text-[10px] h-6 mt-1 gap-1">
                          <Play className="w-3 h-3" /> Continuer
                        </Button>
                      </Link>
                    )}
                    {prog >= 100 && (
                      <Badge className="bg-green-100 text-green-800 text-[9px] mt-1">
                        <Award className="w-3 h-3 mr-0.5" /> Terminé
                      </Badge>
                    )}
                  </CardContent>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default FormationsSection;
