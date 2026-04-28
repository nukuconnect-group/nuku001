import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bot, MessageCircle, Users, MapPin, TrendingUp, Loader2, CalendarDays, Globe } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid, LineChart, Line } from "recharts";

/**
 * Analytics du chatbot Nuku AI : nombre de conversations, top questions,
 * visiteurs (comptes connus + anonymes) et localisations.
 */
export default function NukuAIAnalytics() {
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [liveCount, setLiveCount] = useState(0);

  const fetchQuestions = async () => {
    const { data } = await supabase
      .from("nuku_ai_questions" as any)
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);
    setQuestions((data as any) || []);
    setLoading(false);
  };

  useEffect(() => { fetchQuestions(); }, []);

  // Realtime — refresh on each new chatbot question
  useEffect(() => {
    const channel = supabase
      .channel("nuku-ai-questions-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "nuku_ai_questions" },
        (payload) => {
          setQuestions((prev) => [payload.new as any, ...prev].slice(0, 500));
          setLiveCount((c) => c + 1);
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const stats = useMemo(() => {
    const total = questions.length;
    const uniqueUsers = new Set(questions.filter(q => q.user_id).map(q => q.user_id)).size;
    const anonymous = questions.filter(q => !q.user_id).length;
    // Top 10 questions par fréquence (normalisées)
    const counts: Record<string, number> = {};
    questions.forEach(q => {
      const key = (q.question || "").trim().toLowerCase().slice(0, 80);
      if (!key) return;
      counts[key] = (counts[key] || 0) + 1;
    });
    const topQuestions = Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([q, n]) => ({ question: q, count: n }));
    // Top localisations
    const locCounts: Record<string, number> = {};
    questions.forEach(q => {
      const loc = [q.city, q.country].filter(Boolean).join(", ") || "Inconnu";
      locCounts[loc] = (locCounts[loc] || 0) + 1;
    });
    const topLocations = Object.entries(locCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([loc, n]) => ({ location: loc, count: n }));
    return { total, uniqueUsers, anonymous, topQuestions, topLocations };
  }, [questions]);

  if (loading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-3">
      {/* Live indicator */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-600" />
          </span>
          <span className="text-[11px] font-medium text-muted-foreground">Temps réel actif</span>
        </div>
        {liveCount > 0 && (
          <Badge variant="secondary" className="text-[10px]">+{liveCount} nouvelles depuis l'ouverture</Badge>
        )}
      </div>
      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Card><CardContent className="p-3 text-center">
          <MessageCircle className="w-5 h-5 mx-auto text-primary mb-1" />
          <p className="text-lg font-bold">{stats.total}</p>
          <p className="text-[10px] text-muted-foreground">Questions totales</p>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <Users className="w-5 h-5 mx-auto text-blue-600 mb-1" />
          <p className="text-lg font-bold">{stats.uniqueUsers}</p>
          <p className="text-[10px] text-muted-foreground">Comptes connus</p>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <Bot className="w-5 h-5 mx-auto text-purple-600 mb-1" />
          <p className="text-lg font-bold">{stats.anonymous}</p>
          <p className="text-[10px] text-muted-foreground">Visiteurs anonymes</p>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <MapPin className="w-5 h-5 mx-auto text-emerald-600 mb-1" />
          <p className="text-lg font-bold">{stats.topLocations.length}</p>
          <p className="text-[10px] text-muted-foreground">Localisations</p>
        </CardContent></Card>
      </div>

      {/* Top questions */}
      <Card>
        <CardHeader className="p-3 sm:p-4 pb-2">
          <CardTitle className="text-sm flex items-center gap-2"><TrendingUp className="w-4 h-4 text-primary" />Top questions posées</CardTitle>
          <CardDescription className="text-[11px]">Questions les plus fréquentes (normalisées)</CardDescription>
        </CardHeader>
        <CardContent className="p-3 sm:p-4 pt-0">
          {stats.topQuestions.length === 0 ? (
            <p className="text-xs text-center text-muted-foreground py-6">Aucune question encore enregistrée.</p>
          ) : (
            <div style={{ width: "100%", height: 220 }}>
              <ResponsiveContainer>
                <BarChart data={stats.topQuestions} layout="vertical" margin={{ left: 8, right: 8, top: 4, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" tick={{ fontSize: 10 }} />
                  <YAxis type="category" dataKey="question" tick={{ fontSize: 9 }} width={180} />
                  <Tooltip contentStyle={{ background: "hsl(var(--background))", border: "1px solid hsl(var(--border))", fontSize: 11 }} />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent questions list */}
      <Card>
        <CardHeader className="p-3 sm:p-4 pb-2">
          <CardTitle className="text-sm">Questions récentes (avec auteur et lieu)</CardTitle>
        </CardHeader>
        <CardContent className="p-3 sm:p-4 pt-0">
          <ScrollArea className="h-[280px]">
            <div className="space-y-1.5">
              {questions.slice(0, 50).map((q) => (
                <div key={q.id} className="p-2 rounded-md bg-muted/30 text-[11px]">
                  <p className="text-foreground/90 line-clamp-2">{q.question}</p>
                  <div className="flex flex-wrap items-center gap-2 mt-1 text-[9px] text-muted-foreground">
                    <Badge variant="outline" className="text-[8px] h-4">{q.user_name || (q.user_id ? "Compte" : "Anonyme")}</Badge>
                    {(q.city || q.country) && <span className="flex items-center gap-0.5"><MapPin className="w-2.5 h-2.5" />{[q.city, q.country].filter(Boolean).join(", ")}</span>}
                    <span className="ml-auto">{new Date(q.created_at).toLocaleString("fr-FR")}</span>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
