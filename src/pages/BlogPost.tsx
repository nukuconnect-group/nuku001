import SEO from "@/components/SEO";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import MobileBottomNav from "@/components/layout/MobileBottomNav";
import { useParams, Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Calendar, Clock, Award, Share2, ExternalLink } from "lucide-react";

const articles: Record<string, any> = {
  "nukuconnect-meilleure-innovation-togo-top-impact-2025": {
    title: "Togo Top Impact 2025 : NukuConnect sacré meilleure innovation de l'année",
    date: "5 février 2026",
    readTime: "4 min",
    category: "Distinction",
    image: "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=1200&h=600&fit=crop&q=80",
    sourceUrl: "https://actu-togo.tg/2026/02/05/togo-top-impact-2025-nukuconnect-sacre-meilleure-innovation-de-lannee/",
    content: `
## NukuConnect sacré meilleure innovation de l'année 2025

La cérémonie **Togo Top Impact 2025** a récompensé les entreprises et personnalités ayant eu un impact significatif sur le développement économique et social du Togo. Parmi les lauréats, **NukuConnect** a remporté le prestigieux prix de la **meilleure innovation technologique de l'année**.

### Une reconnaissance méritée

NukuConnect, la marketplace agricole intelligente, a été distinguée pour son approche innovante qui combine l'intelligence artificielle et les technologies numériques pour transformer la chaîne de valeur agricole en Afrique. La plateforme connecte efficacement les producteurs, fournisseurs, acheteurs et livreurs au sein d'un écosystème digitalisé.

### Les critères de sélection

Le jury a salué plusieurs aspects clés de NukuConnect :

- **L'innovation technologique** : Un assistant IA agricole qui fournit des conseils personnalisés aux producteurs
- **L'impact social** : La plateforme permet aux petits producteurs d'accéder à de nouveaux marchés
- **La traçabilité** : Un système complet de suivi des produits de la ferme à l'assiette
- **La logistique intégrée** : Un réseau de livreurs avec suivi GPS en temps réel
- **La formation** : Des modules de formation accessibles directement dans l'application

### Un écosystème complet

NukuConnect ne se limite pas à une simple marketplace. C'est un écosystème complet qui comprend :

1. **Une marketplace intelligente** avec matching IA entre acheteurs et vendeurs
2. **Un assistant agricole IA** pour accompagner les producteurs
3. **Un système de traçabilité** pour garantir la qualité des produits
4. **Une plateforme de formation** en agriculture et aquaculture
5. **Un réseau logistique** avec suivi en temps réel

### Vision pour l'avenir

L'équipe de NukuConnect ambitionne de devenir la plateforme agricole de référence en Afrique de l'Ouest, en continuant d'innover et d'intégrer de nouvelles technologies pour mieux servir les acteurs de la chaîne de valeur agricole.

> « Cette distinction nous encourage à poursuivre notre mission : transformer l'agriculture africaine grâce à la technologie et l'intelligence artificielle. » — Équipe NukuConnect

### À propos de Togo Top Impact

Togo Top Impact est une cérémonie annuelle qui récompense les entreprises, personnalités et initiatives ayant eu un impact positif significatif sur le développement du Togo. L'édition 2025 a mis en lumière l'innovation technologique comme moteur de croissance économique.
    `,
  },
};

const BlogPost = () => {
  const { slug } = useParams();
  const article = slug ? articles[slug] : null;

  if (!article) {
    return (
      <div className="min-h-screen pb-14 lg:pb-0">
        <Header />
        <main className="py-20 text-center">
          <h1 className="text-xl font-bold mb-4">Article non trouvé</h1>
          <Link to="/blog">
            <Button variant="outline">← Retour au blog</Button>
          </Link>
        </main>
        <Footer />
        <MobileBottomNav />
      </div>
    );
  }

  const handleShare = async () => {
    if (navigator.share) {
      await navigator.share({ title: article.title, url: window.location.href });
    } else {
      navigator.clipboard.writeText(window.location.href);
    }
  };

  return (
    <div className="min-h-screen pb-14 lg:pb-0">
      <SEO
        url={`/blog/${slug}`}
        title={`${article.title} | NukuConnect Blog`}
        description={article.content.slice(0, 155)}
        image={article.image}
      />
      <Header />
      <main className="py-6 sm:py-10">
        <div className="container mx-auto px-3 sm:px-4 max-w-4xl">
          <Link to="/blog" className="inline-flex items-center gap-1 text-xs text-primary hover:underline mb-4">
            <ArrowLeft className="w-3 h-3" /> Retour au blog
          </Link>

          <article>
            <div className="mb-6">
              <Badge className="mb-3 bg-primary/10 text-primary border-primary/30">
                <Award className="w-3 h-3 mr-1" /> {article.category}
              </Badge>
              <h1 className="font-heading text-xl sm:text-2xl lg:text-3xl font-extrabold text-foreground mb-3">
                {article.title}
              </h1>
              <div className="flex items-center gap-4 text-xs text-muted-foreground mb-4">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" /> {article.date}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" /> {article.readTime}
                </span>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="text-xs gap-1" onClick={handleShare}>
                  <Share2 className="w-3 h-3" /> Partager
                </Button>
                {article.sourceUrl && (
                  <a href={article.sourceUrl} target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" size="sm" className="text-xs gap-1">
                      <ExternalLink className="w-3 h-3" /> Source originale
                    </Button>
                  </a>
                )}
              </div>
            </div>

            <div className="rounded-xl overflow-hidden mb-8">
              <img
                src={article.image}
                alt={article.title}
                className="w-full h-48 sm:h-64 lg:h-80 object-cover"
              />
            </div>

            <div className="prose prose-sm sm:prose-base max-w-none text-foreground prose-headings:text-foreground prose-p:text-muted-foreground prose-strong:text-foreground prose-blockquote:border-primary prose-blockquote:text-primary/80 prose-li:text-muted-foreground">
              {article.content.split('\n').map((line: string, i: number) => {
                const trimmed = line.trim();
                if (!trimmed) return null;
                if (trimmed.startsWith('## ')) return <h2 key={i} className="text-lg sm:text-xl font-bold mt-6 mb-3">{trimmed.slice(3)}</h2>;
                if (trimmed.startsWith('### ')) return <h3 key={i} className="text-base sm:text-lg font-bold mt-5 mb-2">{trimmed.slice(4)}</h3>;
                if (trimmed.startsWith('> ')) return <blockquote key={i} className="border-l-4 border-primary pl-4 py-2 my-4 italic text-sm text-primary/80 bg-primary/5 rounded-r-lg">{trimmed.slice(2)}</blockquote>;
                if (trimmed.startsWith('- **')) {
                  const match = trimmed.match(/^- \*\*(.+?)\*\*\s*:\s*(.+)$/);
                  if (match) return <div key={i} className="flex items-start gap-2 my-1.5 text-sm"><span className="text-primary mt-1">•</span><span><strong className="text-foreground">{match[1]}</strong> : <span className="text-muted-foreground">{match[2]}</span></span></div>;
                }
                if (trimmed.match(/^\d+\.\s\*\*/)) {
                  const match = trimmed.match(/^\d+\.\s\*\*(.+?)\*\*\s*(.*)$/);
                  if (match) return <div key={i} className="flex items-start gap-2 my-1.5 text-sm"><span className="text-primary font-bold">{trimmed.match(/^\d+/)?.[0]}.</span><span><strong className="text-foreground">{match[1]}</strong> <span className="text-muted-foreground">{match[2]}</span></span></div>;
                }
                return <p key={i} className="text-sm sm:text-base leading-relaxed my-3 text-muted-foreground">{trimmed.replace(/\*\*(.+?)\*\*/g, '').includes(trimmed) ? trimmed : trimmed.split(/\*\*(.+?)\*\*/).map((part, j) => j % 2 === 1 ? <strong key={j} className="text-foreground">{part}</strong> : part)}</p>;
              })}
            </div>
          </article>
        </div>
      </main>
      <Footer />
      <MobileBottomNav />
    </div>
  );
};

export default BlogPost;
