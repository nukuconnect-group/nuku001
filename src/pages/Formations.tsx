import SEO from "@/components/SEO";
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import MobileBottomNav from "@/components/layout/MobileBottomNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import heroFormations from "@/assets/hero-formations.jpg";
import { 
  Search, GraduationCap, Clock, Play, Star, BookOpen, Award, Filter, Loader2,
  Home, Library, Layers, Hammer, TrendingUp, ChevronRight, PlayCircle, CheckCircle2
} from "lucide-react";
import DashboardLayout, { DashboardSidebarItem } from "@/components/layout/DashboardLayout";
import { useLanguage } from "@/contexts/LanguageContext";

const levelLabels: Record<string, string> = {
  beginner: "Débutant",
  intermediate: "Intermédiaire",
  advanced: "Avancé",
};

const Formations = () => {
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Tous");
  const [selectedAuthor, setSelectedAuthor] = useState("Tous");
  const [showFreeOnly, setShowFreeOnly] = useState(false);
  const [formations, setFormations] = useState<any[]>([]);
  const [progress, setProgress] = useState<Record<string, number>>({});
  const [certificates, setCertificates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<string[]>(["Tous"]);
  const [authors, setAuthors] = useState<string[]>(["Tous"]);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("formations" as any)
        .select("*")
        .eq("is_published", true)
        .order("created_at", { ascending: false });
      
      const formationsData = (data as any[]) || [];
      setFormations(formationsData);
      
      // Extract categories
      const cats = ["Tous", ...new Set(formationsData.map((f: any) => f.category).filter(Boolean))];
      setCategories(cats as string[]);
      const auths = ["Tous", ...new Set(formationsData.map((f: any) => f.instructor).filter(Boolean))];
      setAuthors(auths as string[]);

      // Get user progress
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const [progressRes, certsRes] = await Promise.all([
          supabase.from("formation_progress" as any).select("formation_id, progress_percent").eq("user_id", session.user.id).is("module_id", null),
          supabase.from("certificates" as any).select("*").eq("user_id", session.user.id),
        ]);
        const progressMap: Record<string, number> = {};
        ((progressRes.data as any[]) || []).forEach(p => { progressMap[p.formation_id] = p.progress_percent; });
        setProgress(progressMap);
        setCertificates((certsRes.data as any[]) || []);
      }
      setLoading(false);
    };
    load();
  }, []);

  const filteredCourses = formations.filter((course) => {
    const matchesSearch = course.title?.toLowerCase().includes(searchQuery.toLowerCase()) || course.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "Tous" || course.category === selectedCategory;
    const matchesAuthor = selectedAuthor === "Tous" || course.instructor === selectedAuthor;
    const matchesFree = !showFreeOnly || !course.is_paid;
    return matchesSearch && matchesCategory && matchesAuthor && matchesFree;
  });

  const formatPrice = (price: number) => new Intl.NumberFormat("en-US").format(price);
  const formatDuration = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return h > 0 ? `${h}h ${m > 0 ? `${m}min` : ''}` : `${m}min`;
  };

  const featuredCourse = filteredCourses[0] || formations[0];
  const continueCourses = filteredCourses.filter((course) => progress[course.id] > 0).slice(0, 4);
  const learningPaths = categories.filter((cat) => cat !== "Tous").slice(0, 5);

  const learningSidebar: DashboardSidebarItem[] = [
    { label: t("nav.home"), icon: Home, href: "/formations" },
    { label: "Ma bibliothèque", icon: Library, onClick: () => { setShowFreeOnly(false); setSelectedCategory("Tous"); window.scrollTo({ top: 600, behavior: "smooth" }); } },
    { label: "Contenus", icon: Layers, onClick: () => { setSelectedCategory("Tous"); window.scrollTo({ top: 400, behavior: "smooth" }); } },
    { label: "Pratique", icon: Hammer, onClick: () => window.scrollTo({ top: 600, behavior: "smooth" }) },
    { label: "Certifications", icon: Award, badge: certificates.length || undefined, onClick: () => window.scrollTo({ top: 2000, behavior: "smooth" }) },
    { label: "Tendances", icon: TrendingUp, onClick: () => { setSelectedCategory("Tous"); window.scrollTo({ top: 400, behavior: "smooth" }); } },
    { label: "Gratuit uniquement", icon: Star, onClick: () => setShowFreeOnly(v => !v) },
  ];

  return (
    <div className="min-h-screen bg-background pb-20 lg:pb-0">
      <SEO
        url="/formations"
        title="Formations Agricoles"
        description="Accédez à des formations agricoles gratuites et certifiantes. Apprenez les techniques modernes de culture, d'élevage et de gestion agricole."
        image="https://fpnhdihvnfsiymopbjgt.supabase.co/storage/v1/object/public/product-images/og/og-formations.jpg"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "ItemList",
          "name": "Formations agricoles NUKUCONNECT",
          "url": "https://www.nukuconnect.com/formations",
          "description": "Formations en agriculture, aquaculture et gestion agricole en Afrique."
        }}
      />
      <Header />
      <DashboardLayout
        sidebarTitle="NukuConnect Learning"
        sidebarSubtitle="Développez vos compétences"
        items={learningSidebar}
      >

      <main className="bg-background">
      {/* LinkedIn Learning style hero */}
      <section className="border-b border-border bg-card">
        <div className="container mx-auto px-3 sm:px-4 lg:px-6 py-5 sm:py-7">
          <div className="grid lg:grid-cols-[1.35fr_.65fr] gap-4 lg:gap-6 items-stretch">
            <div className="relative overflow-hidden rounded-xl min-h-[280px] lg:min-h-[360px] bg-muted">
              <img
                src={featuredCourse?.image_url || heroFormations}
                alt={featuredCourse?.title || "Formation agricole digitale NukuConnect"}
                className="absolute inset-0 w-full h-full object-cover"
                width={1536}
                height={768}
              />
              <div className="absolute inset-0 bg-gradient-to-r from-background/95 via-background/75 to-background/20" />
              <div className="relative h-full p-5 sm:p-7 lg:p-9 flex flex-col justify-end max-w-2xl">
                <Badge variant="secondary" className="w-fit mb-3 gap-1.5">
                  <PlayCircle className="w-3.5 h-3.5" /> Recommandé pour vous
                </Badge>
                <h1 className="font-heading text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground mb-3">
                  {featuredCourse?.title || "Développez vos compétences agricoles"}
                </h1>
                <p className="text-sm sm:text-base text-muted-foreground line-clamp-2 mb-4">
                  {featuredCourse?.description || "Formations pratiques, contenus courts et certifications pour producteurs, fournisseurs et acheteurs."}
                </p>
                <div className="flex flex-wrap items-center gap-2 mb-5 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{formatDuration(featuredCourse?.duration_minutes || 90)}</span>
                  <span className="inline-flex items-center gap-1"><BookOpen className="w-3.5 h-3.5" />{featuredCourse?.modules_count || 4} modules</span>
                  <span className="inline-flex items-center gap-1"><Star className="w-3.5 h-3.5 text-accent fill-accent" />{featuredCourse?.rating || 4.8}</span>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Link to={featuredCourse ? `/formations/${featuredCourse.slug || featuredCourse.id}` : "#"}>
                    <Button variant="hero" className="gap-2 w-full sm:w-auto">
                      <Play className="w-4 h-4" /> Commencer le cours
                    </Button>
                  </Link>
                  <Button variant="outline" className="gap-2 w-full sm:w-auto" onClick={() => document.getElementById("formation-catalogue")?.scrollIntoView({ behavior: "smooth" })}>
                    Explorer le catalogue <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>

            <aside className="rounded-xl border border-border bg-background p-4 space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Rechercher une compétence..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 h-10 text-sm" />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-lg bg-primary/10 p-2 text-center">
                  <p className="text-lg font-bold text-primary">{formations.length}</p>
                  <p className="text-[10px] text-muted-foreground">Cours</p>
                </div>
                <div className="rounded-lg bg-accent/10 p-2 text-center">
                  <p className="text-lg font-bold text-accent-foreground">{certificates.length}</p>
                  <p className="text-[10px] text-muted-foreground">Certifs</p>
                </div>
                <div className="rounded-lg bg-secondary/10 p-2 text-center">
                  <p className="text-lg font-bold text-secondary-foreground">95%</p>
                  <p className="text-[10px] text-muted-foreground">Avis</p>
                </div>
              </div>
              <div>
                <h2 className="text-sm font-semibold text-foreground mb-2">Parcours populaires</h2>
                <div className="space-y-2">
                  {(learningPaths.length ? learningPaths : ["Agriculture", "Aquaculture", "Vente agricole"]).map((path) => (
                    <button key={path} type="button" onClick={() => setSelectedCategory(path)} className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-muted text-left">
                      <CheckCircle2 className="w-4 h-4 text-primary" />
                      <span className="text-xs font-medium flex-1 truncate">{path}</span>
                      <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                    </button>
                  ))}
                </div>
              </div>
            </aside>
          </div>
        </div>
      </section>

      {/* Filters */}
      <section className="py-4 border-b border-border bg-background sticky top-16 z-20">
        <div className="container mx-auto px-4">
          <div className="flex flex-col lg:flex-row lg:items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">Filtres:</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => (
                <Button key={cat} variant={selectedCategory === cat ? "default" : "outline"} size="sm" onClick={() => setSelectedCategory(cat)}>
                  {cat}
                </Button>
              ))}
            </div>
            {authors.length > 1 && (
              <select
                value={selectedAuthor}
                onChange={(e) => setSelectedAuthor(e.target.value)}
                className="text-sm bg-background border border-input rounded-md px-2 py-1.5 h-9"
                aria-label="Filtrer par auteur"
              >
                {authors.map((a) => (
                  <option key={a} value={a}>{a === "Tous" ? "Tous les auteurs" : a}</option>
                ))}
              </select>
            )}
            <Button variant={showFreeOnly ? "default" : "outline"} size="sm" onClick={() => setShowFreeOnly(!showFreeOnly)}>
              Gratuit uniquement
            </Button>
          </div>
        </div>
      </section>

      {/* Courses Grid */}
      {continueCourses.length > 0 && (
        <section className="py-6 border-b border-border">
          <div className="container mx-auto px-4">
            <h2 className="font-heading text-lg font-bold mb-3">Reprendre là où vous étiez</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {continueCourses.map((course) => (
                <Link key={course.id} to={`/formations/${course.slug || course.id}`} className="rounded-xl border border-border bg-card p-3 hover:shadow-elevated transition-all">
                  <p className="text-sm font-semibold line-clamp-1 mb-2">{course.title}</p>
                  <Progress value={progress[course.id] || 0} className="h-1.5 mb-2" />
                  <p className="text-[10px] text-muted-foreground">{progress[course.id]}% terminé</p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      <section id="formation-catalogue" className="py-8">
        <div className="container mx-auto px-4">
          <p className="text-muted-foreground mb-6">
            <span className="font-semibold text-foreground">{filteredCourses.length}</span> formations trouvées
          </p>

          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
              {filteredCourses.map((course) => {
                const prog = progress[course.id] || 0;
                return (
                  <Card key={course.id} className="group overflow-hidden hover:shadow-elevated transition-all duration-300 flex flex-col">
                    {/* Image always on top */}
                    <div className="relative w-full aspect-[4/3] overflow-hidden flex-shrink-0">
                      <img src={course.image_url || heroFormations} alt={course.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                      <div className="absolute inset-0 bg-foreground/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <div className="w-10 h-10 rounded-full bg-foreground/60 flex items-center justify-center">
                          <Play className="w-5 h-5 text-primary-foreground" />
                        </div>
                      </div>
                      <Badge className="absolute top-2 left-2 text-[10px]" variant={course.is_paid ? "default" : "secondary"}>
                        {course.is_paid ? `${formatPrice(course.price)} F` : "Gratuit"}
                      </Badge>
                    </div>
                    {/* Content always below */}
                    <CardContent className="p-3 sm:p-4 flex-1 flex flex-col">
                      <div className="flex items-center gap-1.5 mb-1">
                        <Badge variant="outline" className="text-[9px] px-1 py-0">{levelLabels[course.level] || course.level}</Badge>
                        <Badge variant="outline" className="text-[9px] px-1 py-0 hidden sm:inline-flex">{course.category}</Badge>
                      </div>
                      <h3 className="font-heading font-semibold text-xs sm:text-sm text-foreground mb-1 line-clamp-2">{course.title}</h3>
                      <p className="text-[10px] text-muted-foreground mb-1.5 line-clamp-2 hidden sm:block">{course.description}</p>
                      <div className="flex items-center gap-2 text-[9px] sm:text-xs text-muted-foreground mb-1.5">
                        <span className="flex items-center gap-0.5"><Clock className="w-3 h-3" />{formatDuration(course.duration_minutes)}</span>
                        <span className="flex items-center gap-0.5"><BookOpen className="w-3 h-3" />{course.modules_count}</span>
                      </div>
                      <div className="flex items-center gap-1 mb-2">
                        <Star className="w-3 h-3 text-accent fill-accent" />
                        <span className="text-[10px] font-medium">{course.rating}</span>
                        <span className="text-[9px] text-muted-foreground truncate">• {course.instructor}</span>
                      </div>
                      {prog > 0 && (
                        <div className="mb-2">
                          <div className="flex items-center justify-between text-[9px] mb-0.5">
                            <span className="text-muted-foreground">Progression</span>
                            <span className="font-medium text-primary">{prog}%</span>
                          </div>
                          <Progress value={prog} className="h-1.5" />
                        </div>
                      )}
                      <div className="mt-auto">
                        <Link to={`/formations/${course.slug || course.id}`}>
                          <Button variant="hero" size="sm" className="w-full gap-1 text-[10px] sm:text-xs">
                            {prog > 0 ? <><Play className="w-3 h-3" />Continuer</> : <><GraduationCap className="w-3 h-3" />{course.is_paid ? "S'inscrire" : "Commencer"}</>}
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Certification Banner */}
      <section className="py-10 bg-gradient-hero">
        <div className="container mx-auto px-4">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-6 text-primary-foreground">
            <div className="flex items-center gap-4">
              <Award className="w-12 h-12" />
              <div>
                <h3 className="font-heading text-xl font-bold">Obtenez votre certification</h3>
                <p className="opacity-90">Complétez les formations et recevez un certificat reconnu.</p>
              </div>
            </div>
            <Button variant="secondary" className="gap-2"><Award className="w-4 h-4" />Voir mes certificats ({certificates.length})</Button>
          </div>
        </div>
      </section>
      </main>
      </DashboardLayout>
      <Footer />
      <MobileBottomNav />
    </div>
  );
};

export default Formations;
