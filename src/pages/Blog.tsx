import SEO from "@/components/SEO";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import MobileBottomNav from "@/components/layout/MobileBottomNav";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Calendar, Clock, Award } from "lucide-react";

const articles = [
  {
    slug: "nukuconnect-meilleure-innovation-togo-top-impact-2025",
    title: "Togo Top Impact 2025 : NukuConnect sacré meilleure innovation de l'année",
    excerpt: "La plateforme NukuConnect a été récompensée comme la meilleure innovation technologique de l'année lors de la cérémonie Togo Top Impact 2025, célébrant l'excellence et l'impact positif au Togo.",
    image: "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=800&h=400&fit=crop&q=80",
    date: "5 février 2026",
    readTime: "4 min",
    category: "Distinction",
    featured: true,
  },
];

const Blog = () => {
  return (
    <div className="min-h-screen pb-14 lg:pb-0">
      <SEO
        url="/blog"
        title="Blog - Actualités Agricoles | NukuConnect"
        description="Découvrez les dernières actualités, innovations et articles sur l'agriculture en Afrique. NukuConnect, la marketplace agricole intelligente."
      />
      <Header />
      <main className="py-6 sm:py-10">
        <div className="container mx-auto px-3 sm:px-4 max-w-7xl">
          <div className="text-center mb-8 sm:mb-12">
            <Badge className="mb-3 bg-primary/10 text-primary border-primary/30">
              <Award className="w-3 h-3 mr-1" /> Actualités
            </Badge>
            <h1 className="font-heading text-2xl sm:text-3xl lg:text-4xl font-extrabold text-foreground mb-3">
              Blog & Actualités
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground max-w-xl mx-auto">
              Les dernières actualités de NukuConnect et du monde agricole en Afrique.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {articles.map((article) => (
              <Link key={article.slug} to={`/blog/${article.slug}`}>
                <Card className="overflow-hidden hover:shadow-elevated transition-all group h-full">
                  <div className="relative aspect-video overflow-hidden">
                    <img
                      src={article.image}
                      alt={article.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    {article.featured && (
                      <Badge className="absolute top-3 left-3 bg-primary text-primary-foreground text-[10px]">
                        <Award className="w-3 h-3 mr-1" /> À la une
                      </Badge>
                    )}
                  </div>
                  <CardContent className="p-4 sm:p-5">
                    <Badge variant="outline" className="text-[10px] mb-2">{article.category}</Badge>
                    <h2 className="font-heading text-sm sm:text-base font-bold text-foreground mb-2 line-clamp-2 group-hover:text-primary transition-colors">
                      {article.title}
                    </h2>
                    <p className="text-xs text-muted-foreground mb-3 line-clamp-3">
                      {article.excerpt}
                    </p>
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" /> {article.date}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {article.readTime}
                        </span>
                      </div>
                      <span className="text-primary font-medium flex items-center gap-1">
                        Lire <ArrowRight className="w-3 h-3" />
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </main>
      <Footer />
      <MobileBottomNav />
    </div>
  );
};

export default Blog;
