import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/contexts/ProfileContext";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import MobileBottomNav from "@/components/layout/MobileBottomNav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  GraduationCap, BookOpen, Award, Clock, Play, Star, User,
  Loader2, Settings, TrendingUp
} from "lucide-react";

const LearnerDashboard = () => {
  const navigate = useNavigate();
  const { user, profile, isLoading: profileLoading, isReady } = useProfile();
  const [formations, setFormations] = useState<any[]>([]);
  const [progress, setProgress] = useState<Record<string, number>>({});
  const [certificates, setCertificates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Bonjour" : hour < 18 ? "Bon après-midi" : "Bonsoir";
  const firstName = profile?.full_name?.split(" ")[0] || "Apprenant";

  useEffect(() => {
    if (!isReady || profileLoading) return;
    if (!user) { navigate("/auth", { replace: true }); return; }

    const load = async () => {
      const { data } = await supabase
        .from("formations")
        .select("*")
        .eq("is_published", true)
        .order("created_at", { ascending: false });

      const formationsData = (data as any[]) || [];
      setFormations(formationsData);

      const [progressRes, certsRes] = await Promise.all([
        supabase.from("formation_progress").select("formation_id, progress_percent").eq("user_id", user.id).is("module_id", null),
        supabase.from("certificates").select("*").eq("user_id", user.id),
      ]);

      const progressMap: Record<string, number> = {};
      ((progressRes.data as any[]) || []).forEach(p => {
        progressMap[p.formation_id] = p.progress_percent;
      });
      setProgress(progressMap);
      setCertificates((certsRes.data as any[]) || []);
      setLoading(false);
    };
    load();
  }, [profileLoading, user, navigate]);

  const inProgressFormations = formations.filter(f => progress[f.id] && progress[f.id] > 0 && progress[f.id] < 100);
  const completedFormations = formations.filter(f => progress[f.id] >= 100);
  const availableFormations = formations.filter(f => !progress[f.id]);
  const totalHours = formations.reduce((s, f) => s + (f.duration_minutes || 0), 0) / 60;

  if (profileLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 lg:pb-0">
      <Header />
      <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center flex-shrink-0 overflow-hidden">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <User className="w-5 h-5 text-primary-foreground" />
              )}
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">{greeting}, {firstName} 👋</h1>
              <p className="text-sm text-muted-foreground">Bienvenue dans votre espace apprenant</p>
            </div>
          </div>
          <Link to="/settings">
            <Button variant="outline" size="sm" className="gap-1.5 text-xs">
              <Settings className="w-3.5 h-3.5" /> Paramètres
            </Button>
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <BookOpen className="w-4 h-4 text-primary" />
              <span className="text-xs text-muted-foreground">En cours</span>
            </div>
            <p className="text-lg font-bold">{inProgressFormations.length}</p>
          </Card>
          <Card className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <Award className="w-4 h-4 text-accent" />
              <span className="text-xs text-muted-foreground">Terminées</span>
            </div>
            <p className="text-lg font-bold">{completedFormations.length}</p>
          </Card>
          <Card className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <GraduationCap className="w-4 h-4 text-primary" />
              <span className="text-xs text-muted-foreground">Certificats</span>
            </div>
            <p className="text-lg font-bold">{certificates.length}</p>
          </Card>
          <Card className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Heures dispo</span>
            </div>
            <p className="text-lg font-bold">{Math.round(totalHours)}h</p>
          </Card>
        </div>

        {/* In Progress */}
        {inProgressFormations.length > 0 && (
          <div>
            <h2 className="font-semibold text-sm mb-3 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" /> Continuer ma formation
            </h2>
            <div className="space-y-3">
              {inProgressFormations.map(f => (
                <Card key={f.id} className="overflow-hidden">
                  <CardContent className="p-3 flex gap-3">
                    <div className="w-20 h-20 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                      {f.image_url ? (
                        <img src={f.image_url} alt={f.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <BookOpen className="w-6 h-6 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{f.title}</p>
                      <p className="text-xs text-muted-foreground">{f.instructor}</p>
                      <div className="mt-2">
                        <div className="flex items-center justify-between text-[10px] mb-1">
                          <span className="text-muted-foreground">Progression</span>
                          <span className="font-medium text-primary">{progress[f.id]}%</span>
                        </div>
                        <Progress value={progress[f.id]} className="h-1.5" />
                      </div>
                      <Button variant="hero" size="sm" className="mt-2 gap-1 text-xs h-7">
                        <Play className="w-3 h-3" /> Continuer
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Certificates */}
        {certificates.length > 0 && (
          <div>
            <h2 className="font-semibold text-sm mb-3 flex items-center gap-2">
              <Award className="w-4 h-4 text-accent" /> Mes certificats
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {certificates.map(cert => (
                <Card key={cert.id} className="bg-gradient-to-r from-primary/5 to-accent/5">
                  <CardContent className="p-3 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0">
                      <Award className="w-5 h-5 text-accent" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">Certificat #{cert.certificate_number.slice(0, 8)}</p>
                      <p className="text-[10px] text-muted-foreground">
                        Délivré le {new Date(cert.issued_at).toLocaleDateString("fr-FR")}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Available Formations */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-sm flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-primary" /> Formations disponibles
            </h2>
            <Link to="/formations">
              <Button variant="link" size="sm" className="text-xs">Voir tout</Button>
            </Link>
          </div>
          {availableFormations.length === 0 ? (
            <Card className="p-6 text-center">
              <GraduationCap className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">Aucune formation disponible pour le moment</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {availableFormations.slice(0, 6).map(f => (
                <Card key={f.id} className="overflow-hidden group hover:shadow-md transition-shadow">
                  <div className="flex">
                    <div className="w-24 h-24 overflow-hidden bg-muted flex-shrink-0">
                      {f.image_url ? (
                        <img src={f.image_url} alt={f.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <BookOpen className="w-6 h-6 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <CardContent className="p-3 flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{f.title}</p>
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-1">
                        <span className="flex items-center gap-0.5"><Clock className="w-3 h-3" />{Math.round((f.duration_minutes || 0) / 60)}h</span>
                        <span className="flex items-center gap-0.5"><Star className="w-3 h-3 text-accent fill-accent" />{f.rating}</span>
                      </div>
                      <Badge className="text-[9px] mt-1.5" variant={f.is_paid ? "default" : "secondary"}>
                        {f.is_paid ? `${f.price?.toLocaleString()} F` : "Gratuit"}
                      </Badge>
                      <Button variant="hero" size="sm" className="mt-2 gap-1 text-xs h-7 w-full">
                        <GraduationCap className="w-3 h-3" /> Commencer
                      </Button>
                    </CardContent>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
      <MobileBottomNav />
    </div>
  );
};

export default LearnerDashboard;
