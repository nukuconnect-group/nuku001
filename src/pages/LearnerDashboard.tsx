import SupportWidget from "@/components/SupportWidget";
import SEO from "@/components/SEO";
import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/contexts/ProfileContext";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import MobileBottomNav from "@/components/layout/MobileBottomNav";
import AffiliationCard from "@/components/dashboard/AffiliationCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  GraduationCap, BookOpen, Award, Clock, Play, Star, User,
  Loader2, Settings, TrendingUp
} from "lucide-react";
import DashboardLayout, { DashboardSidebarItem } from "@/components/layout/DashboardLayout";

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
    // Role guard
    if (profile && profile.user_type !== "learner") {
      if (profile.user_type === "producer" || profile.user_type === "trainer") { navigate("/dashboard", { replace: true }); return; }
      if (profile.user_type === "driver") { navigate("/driver-dashboard", { replace: true }); return; }
      navigate("/buyer-dashboard", { replace: true }); return;
    }

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
      <div className="min-h-screen bg-background pb-20 lg:pb-0">
        <SEO url="/learner-dashboard" title="Espace Apprenant" description="Suivez vos formations agricoles et obtenez vos certificats." noIndex />
        <div className="container mx-auto px-3 sm:px-4 py-4 space-y-4">
          <div className="h-7 w-56 bg-muted animate-pulse rounded" />
          <div className="grid grid-cols-2 gap-3">
            {[1,2,3,4].map(i => <div key={i} className="h-20 bg-muted animate-pulse rounded-xl" />)}
          </div>
          <div className="space-y-3">
            {[1,2,3].map(i => <div key={i} className="h-28 bg-muted animate-pulse rounded-xl" />)}
          </div>
        </div>
      </div>
    );
  }

  const learnerSidebar: DashboardSidebarItem[] = [
    { label: "Mes formations", icon: GraduationCap, href: "/formations" },
    { label: "En cours", icon: BookOpen, onClick: () => window.scrollTo({ top: 400, behavior: "smooth" }) },
    { label: "Certificats", icon: Award, onClick: () => window.scrollTo({ top: 800, behavior: "smooth" }) },
    { label: "Catalogue", icon: TrendingUp, href: "/formations" },
    { label: "Messages", icon: Star, href: "/messages" },
    { label: "Paramètres", icon: Settings, href: "/settings" },
  ];

  return (
    <div className="min-h-screen bg-background pb-20 lg:pb-0">
      <Header />
      <DashboardLayout
        sidebarTitle="Espace Apprenant"
        sidebarSubtitle={profile?.full_name || "Mon compte"}
        items={learnerSidebar}
      >
      <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-4">
        {user?.id && <AffiliationCard userId={user.id} />}
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
              {certificates.map(cert => {
                const formation = formations.find(f => f.id === cert.formation_id);
                return (
                  <Card key={cert.id} className="bg-gradient-to-r from-primary/5 to-accent/5">
                    <CardContent className="p-3 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0">
                        <Award className="w-5 h-5 text-accent" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{formation?.title || "Formation"}</p>
                        <p className="text-[10px] text-muted-foreground font-mono truncate">N° {cert.certificate_number}</p>
                        <p className="text-[10px] text-muted-foreground">
                          Délivré le {new Date(cert.issued_at).toLocaleDateString("fr-FR")}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-[10px] h-7 gap-1 flex-shrink-0"
                        onClick={() => {
                          const html = `<html><head><title>Certificat ${cert.certificate_number}</title><style>body{font-family:Georgia,serif;background:#f8fafc;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;padding:20px}.cert{background:#fff;border:8px double #16a34a;padding:60px 50px;max-width:720px;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,.15)}.cert h1{font-size:38px;color:#15803d;margin:0 0 10px;letter-spacing:2px}.cert h2{font-size:22px;color:#1f2937;margin:30px 0 8px}.cert .name{font-size:32px;font-style:italic;color:#16a34a;margin:24px 0}.cert .formation{font-size:20px;font-weight:bold;color:#1f2937;margin:18px 0}.cert .meta{font-size:13px;color:#6b7280;margin-top:30px;border-top:1px solid #e5e7eb;padding-top:18px}@media print{body{background:#fff}}</style></head><body><div class="cert"><h1>CERTIFICAT</h1><p>de réussite</p><h2>Décerné à</h2><p class="name">${profile?.full_name || "Apprenant"}</p><p>pour avoir complété avec succès la formation</p><p class="formation">${formation?.title || "Formation NukuConnect"}</p><p>animée par <strong>${formation?.instructor || "—"}</strong></p><div class="meta"><div>N° ${cert.certificate_number}</div><div>Délivré le ${new Date(cert.issued_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}</div><div style="margin-top:10px">NukuConnect — Plateforme agricole intelligente</div></div></div><script>setTimeout(()=>window.print(),300)</script></body></html>`;
                          const w = window.open("", "_blank");
                          if (w) { w.document.write(html); w.document.close(); }
                        }}
                      >
                        <Award className="w-3 h-3" /> Voir
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
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
                        {f.is_paid ? `${f.price?.toLocaleString("en-US")} F` : "Gratuit"}
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
      </DashboardLayout>
      <Footer />
      <SupportWidget userId={user?.id} userName={profile?.full_name || undefined} />
      <MobileBottomNav />
    </div>
  );
};

export default LearnerDashboard;
