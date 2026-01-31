import { useState } from "react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import MobileBottomNav from "@/components/layout/MobileBottomNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Search, 
  GraduationCap, 
  Clock, 
  Users, 
  Play,
  Star,
  BookOpen,
  Award,
  Filter,
  Lock
} from "lucide-react";

interface Course {
  id: string;
  title: string;
  description: string;
  instructor: string;
  image: string;
  duration: string;
  students: number;
  rating: number;
  level: "Débutant" | "Intermédiaire" | "Avancé";
  category: string;
  isPaid: boolean;
  price?: number;
  modules: number;
  progress?: number;
}

const courses: Course[] = [
  {
    id: "1",
    title: "Agriculture Biologique: Les Bases",
    description: "Apprenez les fondamentaux de l'agriculture biologique et les techniques de culture sans pesticides.",
    instructor: "Dr. Kofi Mensah",
    image: "https://images.unsplash.com/photo-1574943320219-553eb213f72d?w=400",
    duration: "4h 30min",
    students: 1250,
    rating: 4.8,
    level: "Débutant",
    category: "Agriculture Bio",
    isPaid: false,
    modules: 8,
    progress: 45,
  },
  {
    id: "2",
    title: "Élevage Avicole Moderne",
    description: "Techniques modernes d'élevage de volailles pour maximiser la production et la qualité.",
    instructor: "Essi Amouzou",
    image: "https://images.unsplash.com/photo-1548550023-2bdb3c5beed7?w=400",
    duration: "6h 15min",
    students: 890,
    rating: 4.7,
    level: "Intermédiaire",
    category: "Élevage",
    isPaid: true,
    price: 15000,
    modules: 12,
  },
  {
    id: "3",
    title: "Gestion des Maladies des Cultures",
    description: "Identifiez et traitez les maladies courantes des cultures tropicales.",
    instructor: "Dr. Ama Koffi",
    image: "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=400",
    duration: "5h 00min",
    students: 2100,
    rating: 4.9,
    level: "Intermédiaire",
    category: "Protection des cultures",
    isPaid: false,
    modules: 10,
    progress: 80,
  },
  {
    id: "4",
    title: "Irrigation et Gestion de l'Eau",
    description: "Optimisez l'utilisation de l'eau dans votre exploitation agricole.",
    instructor: "Yao Agbeko",
    image: "https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=400",
    duration: "3h 45min",
    students: 670,
    rating: 4.6,
    level: "Débutant",
    category: "Techniques agricoles",
    isPaid: true,
    price: 10000,
    modules: 6,
  },
  {
    id: "5",
    title: "Commerce Agricole et Marketing",
    description: "Apprenez à vendre vos produits efficacement et à développer votre clientèle.",
    instructor: "Akossiwa Dosseh",
    image: "https://images.unsplash.com/photo-1542838132-92c53300491e?w=400",
    duration: "4h 00min",
    students: 1560,
    rating: 4.8,
    level: "Avancé",
    category: "Business",
    isPaid: true,
    price: 20000,
    modules: 8,
  },
  {
    id: "6",
    title: "Culture du Riz: Du Semis à la Récolte",
    description: "Guide complet pour la riziculture dans les zones tropicales.",
    instructor: "Komlan Assou",
    image: "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400",
    duration: "7h 30min",
    students: 980,
    rating: 4.7,
    level: "Débutant",
    category: "Céréales",
    isPaid: false,
    modules: 14,
  },
];

const categories = ["Tous", "Agriculture Bio", "Élevage", "Protection des cultures", "Techniques agricoles", "Business", "Céréales"];
const levels = ["Tous", "Débutant", "Intermédiaire", "Avancé"];

const Formations = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Tous");
  const [selectedLevel, setSelectedLevel] = useState("Tous");
  const [showFreeOnly, setShowFreeOnly] = useState(false);

  const filteredCourses = courses.filter((course) => {
    const matchesSearch =
      course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      selectedCategory === "Tous" || course.category === selectedCategory;
    const matchesLevel =
      selectedLevel === "Tous" || course.level === selectedLevel;
    const matchesFree = !showFreeOnly || !course.isPaid;
    return matchesSearch && matchesCategory && matchesLevel && matchesFree;
  });

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("fr-FR").format(price);
  };

  return (
    <div className="min-h-screen bg-background pb-20 lg:pb-0">
      <Header />

      {/* Hero */}
      <section className="pt-24 pb-12 bg-gradient-earth">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <Badge variant="secondary" className="mb-4">
              <GraduationCap className="w-3 h-3 mr-1" />
              Formations agricoles
            </Badge>
            <h1 className="font-heading text-3xl lg:text-4xl font-bold text-foreground mb-4">
              Apprenez à votre rythme
            </h1>
            <p className="text-muted-foreground mb-8">
              Des formations gratuites et payantes pour améliorer vos compétences agricoles.
            </p>

            {/* Search */}
            <div className="relative max-w-xl mx-auto">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                placeholder="Rechercher une formation..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 h-12 text-base"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-8 border-b border-border">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="text-center p-4">
              <div className="font-heading text-2xl lg:text-3xl font-bold text-primary">25+</div>
              <div className="text-sm text-muted-foreground">Formations disponibles</div>
            </div>
            <div className="text-center p-4">
              <div className="font-heading text-2xl lg:text-3xl font-bold text-primary">8 500+</div>
              <div className="text-sm text-muted-foreground">Étudiants inscrits</div>
            </div>
            <div className="text-center p-4">
              <div className="font-heading text-2xl lg:text-3xl font-bold text-primary">15</div>
              <div className="text-sm text-muted-foreground">Formateurs experts</div>
            </div>
            <div className="text-center p-4">
              <div className="font-heading text-2xl lg:text-3xl font-bold text-primary">95%</div>
              <div className="text-sm text-muted-foreground">Taux de satisfaction</div>
            </div>
          </div>
        </div>
      </section>

      {/* Filters */}
      <section className="py-6 border-b border-border">
        <div className="container mx-auto px-4">
          <div className="flex flex-col lg:flex-row lg:items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">Filtres:</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => (
                <Button
                  key={cat}
                  variant={selectedCategory === cat ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(cat)}
                >
                  {cat}
                </Button>
              ))}
            </div>
            <div className="flex gap-2">
              <Button
                variant={showFreeOnly ? "default" : "outline"}
                size="sm"
                onClick={() => setShowFreeOnly(!showFreeOnly)}
              >
                Gratuit uniquement
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Courses Grid */}
      <section className="py-12">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <p className="text-muted-foreground">
              <span className="font-semibold text-foreground">{filteredCourses.length}</span> formations trouvées
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {filteredCourses.map((course) => (
              <Card key={course.id} className="group overflow-hidden hover:shadow-elevated transition-all duration-300">
                <div className="flex sm:flex-col">
                  {/* Thumbnail - Side on mobile, top on larger screens */}
                  <div className="relative w-28 h-28 sm:w-full sm:h-auto sm:aspect-video overflow-hidden flex-shrink-0">
                    <img
                      src={course.image}
                      alt={course.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-foreground/40 opacity-0 group-hover:opacity-100 transition-opacity hidden sm:flex items-center justify-center">
                      <Button variant="secondary" size="sm" className="gap-2">
                        <Play className="w-4 h-4" />
                        Aperçu
                      </Button>
                    </div>
                    {/* Mobile play icon overlay */}
                    <div className="absolute inset-0 flex items-center justify-center sm:hidden">
                      <div className="w-10 h-10 rounded-full bg-foreground/60 flex items-center justify-center">
                        <Play className="w-5 h-5 text-primary-foreground" />
                      </div>
                    </div>
                    <div className="absolute top-2 left-2 flex gap-1">
                      <Badge variant={course.isPaid ? "default" : "secondary"} className="text-[10px] px-1.5 py-0.5">
                        {course.isPaid ? `${formatPrice(course.price!)} F` : "Gratuit"}
                      </Badge>
                    </div>
                  </div>

                  {/* Content */}
                  <CardContent className="p-3 sm:p-4 flex-1">
                    <div className="flex items-center gap-2 mb-1 sm:mb-2">
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                        {course.level}
                      </Badge>
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 hidden sm:inline-flex">
                        {course.category}
                      </Badge>
                    </div>
                    
                    <h3 className="font-heading font-semibold text-sm sm:text-base text-foreground mb-1 line-clamp-2">
                      {course.title}
                    </h3>
                    
                    <p className="text-xs text-muted-foreground mb-2 line-clamp-1 sm:line-clamp-2 hidden sm:block">
                      {course.description}
                    </p>

                    <div className="flex items-center gap-2 text-[10px] sm:text-xs text-muted-foreground mb-2">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {course.duration}
                      </span>
                      <span className="flex items-center gap-1">
                        <BookOpen className="w-3 h-3" />
                        {course.modules}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 mb-2 sm:mb-3">
                      <Star className="w-3 h-3 text-accent fill-accent" />
                      <span className="text-xs font-medium">{course.rating}</span>
                      <span className="text-[10px] text-muted-foreground truncate">• {course.instructor}</span>
                    </div>

                    {course.progress !== undefined && (
                      <div className="mb-2 sm:mb-3">
                        <div className="flex items-center justify-between text-[10px] mb-1">
                          <span className="text-muted-foreground">Progression</span>
                          <span className="font-medium text-primary">{course.progress}%</span>
                        </div>
                        <Progress value={course.progress} className="h-1.5" />
                      </div>
                    )}

                    <Button variant="hero" size="sm" className="w-full gap-1 text-xs sm:text-sm">
                      {course.progress !== undefined ? (
                        <>
                          <Play className="w-3 h-3" />
                          Continuer
                        </>
                      ) : (
                        <>
                          <GraduationCap className="w-3 h-3" />
                          {course.isPaid ? "S'inscrire" : "Commencer"}
                        </>
                      )}
                    </Button>
                  </CardContent>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Certification Banner */}
      <section className="py-12 bg-gradient-hero">
        <div className="container mx-auto px-4">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-6 text-primary-foreground">
            <div className="flex items-center gap-4">
              <Award className="w-12 h-12" />
              <div>
                <h3 className="font-heading text-xl font-bold">Obtenez votre certification</h3>
                <p className="opacity-90">Complétez les formations et recevez un certificat reconnu.</p>
              </div>
            </div>
            <Button variant="secondary" className="gap-2">
              <Award className="w-4 h-4" />
              Voir mes certificats
            </Button>
          </div>
        </div>
      </section>

      <Footer />
      <MobileBottomNav />
    </div>
  );
};

export default Formations;
