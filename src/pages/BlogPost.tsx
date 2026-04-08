import SEO from "@/components/SEO";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import MobileBottomNav from "@/components/layout/MobileBottomNav";
import { useParams, Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Calendar, Clock, Award, Share2, ExternalLink, ArrowRight } from "lucide-react";
import { articles as blogArticles } from "./Blog";

const articlesContent: Record<string, { content: string; sourceUrl?: string }> = {
  "nukuconnect-meilleure-innovation-togo-top-impact-2025": {
    sourceUrl: "https://actu-togo.tg/2026/02/05/togo-top-impact-2025-nukuconnect-sacre-meilleure-innovation-de-lannee/",
    content: `## NukuConnect sacré meilleure innovation de l'année 2025

La cérémonie **Togo Top Impact 2025** a récompensé les entreprises et personnalités ayant eu un impact significatif sur le développement économique et social du Togo. Parmi les lauréats, **NukuConnect** a remporté le prestigieux prix de la **meilleure innovation technologique de l'année**.

### Une reconnaissance méritée

NukuConnect, la marketplace agricole intelligente, a été distinguée pour son approche innovante qui combine l'intelligence artificielle et les technologies numériques pour transformer la chaîne de valeur agricole en Afrique.

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

> « Cette distinction nous encourage à poursuivre notre mission : transformer l'agriculture africaine grâce à la technologie et l'intelligence artificielle. » — Équipe NukuConnect`,
  },
  "intelligence-artificielle-agriculture-afrique": {
    content: `## Comment l'IA révolutionne l'agriculture en Afrique de l'Ouest

L'intelligence artificielle n'est plus réservée aux grandes exploitations des pays développés. En Afrique de l'Ouest, de plus en plus de startups et plateformes l'intègrent pour répondre aux défis spécifiques du continent.

### Détection des maladies des cultures

Grâce à la reconnaissance d'images, les agriculteurs peuvent désormais photographier leurs plants et obtenir un diagnostic instantané. Des applications comme **NukuConnect IA** analysent les feuilles et identifient les maladies, parasites et carences en quelques secondes.

### Optimisation des rendements

Les algorithmes de machine learning analysent les données climatiques, les types de sols et les historiques de production pour recommander :

- **Les meilleures périodes de semis** selon la région
- **Les variétés les plus adaptées** au climat local
- **Les techniques d'irrigation** optimales
- **Les rotations de cultures** les plus productives

### Matching intelligent acheteur-producteur

L'IA permet de connecter automatiquement les acheteurs aux producteurs les plus pertinents selon la localisation, la disponibilité et la qualité des produits.

### Les défis à relever

- **L'accès à internet** reste limité dans certaines zones rurales
- **La formation des agriculteurs** aux outils numériques est essentielle
- **La collecte de données locales** doit être renforcée pour améliorer les modèles

> L'avenir de l'agriculture africaine passe par une adoption intelligente et progressive de l'IA, adaptée aux réalités du terrain.`,
  },
  "tracabilite-produits-agricoles-confiance-consommateur": {
    content: `## La traçabilité des produits agricoles : un enjeu de confiance

Dans un marché où les consommateurs sont de plus en plus exigeants sur l'origine de leur alimentation, la traçabilité numérique devient un avantage concurrentiel majeur pour les producteurs.

### Qu'est-ce que la traçabilité numérique ?

C'est la capacité de suivre un produit tout au long de sa chaîne de valeur, de la production à la consommation, grâce à des outils numériques.

### Les bénéfices pour les producteurs

- **Valorisation des produits** : Les produits traçables se vendent jusqu'à 30% plus cher
- **Accès à de nouveaux marchés** : Les acheteurs B2B exigent de plus en plus la traçabilité
- **Réduction des pertes** : Le suivi en temps réel permet d'optimiser la logistique
- **Certification facilitée** : Les données collectées simplifient les audits

### Comment NukuConnect intègre la traçabilité

La plateforme permet aux producteurs d'enregistrer :

1. **L'origine du produit** : localisation exacte de la ferme
2. **Les conditions de production** : date de récolte, méthodes utilisées
3. **Les certifications** : bio, commerce équitable, etc.
4. **Le parcours logistique** : chaque étape du transport est enregistrée

### L'avenir de la traçabilité en Afrique

Avec l'essor de la blockchain et de l'IoT, la traçabilité deviendra bientôt la norme plutôt que l'exception dans le commerce agricole africain.`,
  },
  "marketplace-agricole-connecter-producteurs-acheteurs": {
    content: `## Marketplace agricole : connecter directement producteurs et acheteurs

Le modèle traditionnel du commerce agricole en Afrique implique de nombreux intermédiaires, ce qui réduit les marges des producteurs et augmente les prix pour les consommateurs.

### Le problème des intermédiaires

Dans la chaîne traditionnelle, un produit passe en moyenne par 3 à 5 intermédiaires avant d'atteindre le consommateur final. À chaque étape, une marge est ajoutée, parfois jusqu'à 200% du prix d'origine.

### La solution marketplace

Les plateformes comme NukuConnect permettent :

- **La mise en relation directe** entre producteurs et acheteurs
- **La transparence des prix** : les producteurs fixent leurs prix
- **La réduction des pertes** : les transactions sont plus rapides
- **L'accès à un marché élargi** : au-delà de la zone géographique locale

### Les résultats concrets

- Les producteurs voient leurs revenus augmenter de **40 à 60%** en moyenne
- Les acheteurs économisent **20 à 30%** sur leurs achats
- Les pertes post-récolte diminuent de **15%** grâce à une commercialisation plus rapide

> La digitalisation du commerce agricole n'est pas une option, c'est une nécessité pour nourrir une Afrique en pleine croissance démographique.`,
  },
  "formation-agricole-numerique-competences-producteurs": {
    content: `## Formation agricole numérique : renforcer les compétences des producteurs

L'accès à la formation est l'un des principaux leviers d'amélioration de la productivité agricole en Afrique. Les plateformes numériques ouvrent de nouvelles possibilités.

### Les défis de la formation traditionnelle

- **L'éloignement géographique** des centres de formation
- **Le coût** des formations présentielles
- **Le temps** que les agriculteurs ne peuvent pas consacrer aux déplacements
- **La langue** : beaucoup de contenus ne sont pas disponibles dans les langues locales

### La formation en ligne comme solution

Les modules de formation intégrés dans des plateformes comme NukuConnect permettent aux producteurs d'apprendre :

- **Les techniques de production** modernes et durables
- **La gestion financière** de leur exploitation
- **La commercialisation** de leurs produits
- **L'utilisation des outils numériques** pour optimiser leur activité

### Des formats adaptés

1. **Vidéos courtes** : des tutoriels de 5 à 10 minutes
2. **Quiz interactifs** : pour valider les acquis
3. **Certificats** : pour attester des compétences acquises
4. **Contenu hors-ligne** : accessible même sans connexion internet

### L'impact mesuré

Les producteurs ayant suivi au moins 3 modules de formation sur NukuConnect ont vu leur productivité augmenter de **25%** en moyenne sur 6 mois.`,
  },
};

const BlogPost = () => {
  const { slug } = useParams();
  const article = blogArticles.find((a) => a.slug === slug);
  const articleContent = slug ? articlesContent[slug] : null;

  if (!article || !articleContent) {
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

  // Similar articles (exclude current)
  const similarArticles = blogArticles.filter((a) => a.slug !== slug).slice(0, 3);

  return (
    <div className="min-h-screen pb-14 lg:pb-0">
      <SEO
        url={`/blog/${slug}`}
        title={article.title}
        description={article.excerpt}
        image={article.image}
        type="article"
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
                {articleContent.sourceUrl && (
                  <a href={articleContent.sourceUrl} target="_blank" rel="noopener noreferrer">
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
              {articleContent.content.split('\n').map((line: string, i: number) => {
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

          {/* Similar Articles */}
          {similarArticles.length > 0 && (
            <section className="mt-12 pt-8 border-t border-border">
              <h2 className="font-heading text-lg sm:text-xl font-bold text-foreground mb-4">Articles similaires</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {similarArticles.map((a) => (
                  <Link key={a.slug} to={`/blog/${a.slug}`}>
                    <Card className="overflow-hidden hover:shadow-elevated transition-all group h-full">
                      <div className="relative aspect-video overflow-hidden">
                        <img src={a.image} alt={a.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                      </div>
                      <CardContent className="p-3">
                        <Badge variant="outline" className="text-[10px] mb-1.5">{a.category}</Badge>
                        <h3 className="text-xs sm:text-sm font-bold text-foreground line-clamp-2 group-hover:text-primary transition-colors">{a.title}</h3>
                        <div className="flex items-center gap-2 mt-2 text-[10px] text-muted-foreground">
                          <Calendar className="w-3 h-3" /> {a.date}
                          <span className="text-primary font-medium flex items-center gap-0.5 ml-auto">
                            Lire <ArrowRight className="w-3 h-3" />
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
      </main>
      <Footer />
      <MobileBottomNav />
    </div>
  );
};

export default BlogPost;
