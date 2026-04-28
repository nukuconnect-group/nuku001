import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Bot, MessageCircle, Users, MapPin, TrendingUp, Loader2, CalendarDays, Globe, Download, Filter, ChevronLeft, ChevronRight } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid, LineChart, Line } from "recharts";

// Convert an array of objects to a CSV string and trigger a download
function downloadCSV(filename: string, rows: Record<string, any>[]) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const escape = (v: any) => {
    if (v === null || v === undefined) return "";
    const s = String(v).replace(/"/g, '""');
    return /[",\n;]/.test(s) ? `"${s}"` : s;
  };
  const csv = [headers.join(","), ...rows.map(r => headers.map(h => escape(r[h])).join(","))].join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
}


/**
 * Analytics du chatbot Nuku AI : nombre de conversations, top questions,
 * visiteurs (comptes connus + anonymes) et localisations.
 */
export default function NukuAIAnalytics() {
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [liveCount, setLiveCount] = useState(0);
  // Filters & pagination
  const [search, setSearch] = useState("");
  const [countryFilter, setCountryFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 25;

  const fetchQuestions = async () => {
    const { data } = await supabase
      .from("nuku_ai_questions" as any)
      .select("*")
      .order("created_at", { ascending: false })
      .limit(2000);
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
          setQuestions((prev) => [payload.new as any, ...prev].slice(0, 2000));
          setLiveCount((c) => c + 1);
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  // Apply user-selected filters across all derived stats and lists
  const filteredQuestions = useMemo(() => {
    const s = search.trim().toLowerCase();
    const cf = countryFilter.trim().toLowerCase();
    const fromTs = dateFrom ? new Date(dateFrom + "T00:00:00").getTime() : null;
    const toTs = dateTo ? new Date(dateTo + "T23:59:59").getTime() : null;
    return questions.filter((q) => {
      if (s) {
        const hay = `${q.question || ""} ${q.user_name || ""} ${q.user_id || ""}`.toLowerCase();
        if (!hay.includes(s)) return false;
      }
      if (cf && !(q.country || "").toLowerCase().includes(cf)) return false;
      const t = q.created_at ? new Date(q.created_at).getTime() : 0;
      if (fromTs && t < fromTs) return false;
      if (toTs && t > toTs) return false;
      return true;
    });
  }, [questions, search, countryFilter, dateFrom, dateTo]);

  // Reset pagination when filters change
  useEffect(() => { setPage(1); }, [search, countryFilter, dateFrom, dateTo]);

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
    // Per-day series (last 14 days)
    const days: { date: string; label: string; count: number }[] = [];
    const now = new Date();
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      days.push({
        date: key,
        label: d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" }),
        count: 0,
      });
    }
    const dayMap = new Map(days.map(d => [d.date, d]));
    questions.forEach(q => {
      const k = (q.created_at || "").slice(0, 10);
      const entry = dayMap.get(k);
      if (entry) entry.count += 1;
    });
    // Per-country breakdown with unique visitors
    const countryAgg: Record<string, { country: string; questions: number; uniqueUsers: Set<string> }> = {};
    questions.forEach(q => {
      const c = q.country || "Inconnu";
      if (!countryAgg[c]) countryAgg[c] = { country: c, questions: 0, uniqueUsers: new Set() };
      countryAgg[c].questions += 1;
      countryAgg[c].uniqueUsers.add(q.user_id || q.session_id || q.id);
    });
    const countries = Object.values(countryAgg)
      .map(c => ({ country: c.country, questions: c.questions, users: c.uniqueUsers.size }))
      .sort((a, b) => b.questions - a.questions)
      .slice(0, 12);
    return { total, uniqueUsers, anonymous, topQuestions, topLocations, days, countries };
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

      {/* Per-day requests (last 14 days) */}
      <Card>
        <CardHeader className="p-3 sm:p-4 pb-2">
          <CardTitle className="text-sm flex items-center gap-2"><CalendarDays className="w-4 h-4 text-primary" />Requêtes par jour (14 derniers jours)</CardTitle>
          <CardDescription className="text-[11px]">Volume quotidien de questions posées au chatbot Nuku AI</CardDescription>
        </CardHeader>
        <CardContent className="p-3 sm:p-4 pt-0">
          <div style={{ width: "100%", height: 200 }}>
            <ResponsiveContainer>
              <LineChart data={stats.days} margin={{ left: 4, right: 8, top: 6, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="label" tick={{ fontSize: 9 }} />
                <YAxis tick={{ fontSize: 9 }} allowDecimals={false} />
                <Tooltip contentStyle={{ background: "hsl(var(--background))", border: "1px solid hsl(var(--border))", fontSize: 11 }} />
                <Line type="monotone" dataKey="count" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 2 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Per-country breakdown */}
      <Card>
        <CardHeader className="p-3 sm:p-4 pb-2">
          <CardTitle className="text-sm flex items-center gap-2"><Globe className="w-4 h-4 text-primary" />Utilisateurs par pays</CardTitle>
          <CardDescription className="text-[11px]">Nombre d'utilisateurs uniques et de questions par pays</CardDescription>
        </CardHeader>
        <CardContent className="p-3 sm:p-4 pt-0">
          {stats.countries.length === 0 ? (
            <p className="text-xs text-center text-muted-foreground py-6">Aucun pays détecté pour le moment.</p>
          ) : (
            <>
              <div style={{ width: "100%", height: 220 }}>
                <ResponsiveContainer>
                  <BarChart data={stats.countries} margin={{ left: 4, right: 8, top: 4, bottom: 24 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="country" tick={{ fontSize: 9 }} interval={0} angle={-25} textAnchor="end" />
                    <YAxis tick={{ fontSize: 9 }} allowDecimals={false} />
                    <Tooltip contentStyle={{ background: "hsl(var(--background))", border: "1px solid hsl(var(--border))", fontSize: 11 }} />
                    <Bar dataKey="users" name="Utilisateurs" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="questions" name="Questions" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 mt-2">
                {stats.countries.slice(0, 9).map((c) => (
                  <div key={c.country} className="p-1.5 bg-muted/30 rounded-md text-[10px]">
                    <p className="font-semibold truncate">{c.country}</p>
                    <p className="text-muted-foreground">{c.users} utilisateurs · {c.questions} questions</p>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

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
