import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { TrendingUp, BarChart3, Info } from "lucide-react";

const monthNames = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];

interface SalesChartProps {
  orders?: any[];
}

const buildSalesData = (orders: any[]) => {
  const now = new Date();
  const monthMap: Record<string, { ventes: number; commandes: number }> = {};
  
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    monthMap[key] = { ventes: 0, commandes: 0 };
  }

  orders.forEach(o => {
    const d = new Date(o.created_at);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    if (monthMap[key]) {
      monthMap[key].ventes += Number(o.total_price) || 0;
      monthMap[key].commandes += 1;
    }
  });

  return Object.entries(monthMap).map(([key, val]) => {
    const [, month] = key.split('-').map(Number);
    return { name: monthNames[month], ...val };
  });
};

const buildCategoryData = (orders: any[]) => {
  const catMap: Record<string, number> = {};
  orders.forEach(o => {
    const cat = o.products?.category || "Autre";
    catMap[cat] = (catMap[cat] || 0) + (Number(o.total_price) || 0);
  });
  const total = Object.values(catMap).reduce((s, v) => s + v, 0);
  if (total === 0) return [];
  return Object.entries(catMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, value]) => ({ name, value: Math.round((value / total) * 100) }));
};

// Neutral placeholder data — shows chart structure even with no sales
const neutralCategories = [
  { name: "Légumes", value: 0 },
  { name: "Céréales", value: 0 },
  { name: "Fruits", value: 0 },
  { name: "Élevage", value: 0 },
];

export const SalesAreaChart = ({ orders = [] }: SalesChartProps) => {
  const data = buildSalesData(orders);
  const isEmpty = orders.length === 0;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <TrendingUp className="w-5 h-5 text-primary" />
          Évolution des ventes (FCFA)
          {isEmpty && (
            <span className="ml-auto text-[10px] font-normal text-muted-foreground flex items-center gap-1">
              <Info className="w-3 h-3" /> Aperçu
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={data}>
            <defs>
              <linearGradient id="colorVentes" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={isEmpty ? 0.1 : 0.3}/>
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={11} />
            <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickFormatter={(v) => `${v/1000}K`} />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                fontSize: '12px',
              }}
              formatter={(value: number) => [`${value.toLocaleString("en-US")} FCFA`, 'Ventes']}
            />
            <Area
              type="monotone"
              dataKey="ventes"
              stroke={isEmpty ? "hsl(var(--muted-foreground))" : "hsl(var(--primary))"}
              fillOpacity={1}
              fill="url(#colorVentes)"
              strokeWidth={2}
              strokeDasharray={isEmpty ? "4 4" : undefined}
            />
          </AreaChart>
        </ResponsiveContainer>
        {isEmpty && (
          <p className="text-[10px] text-muted-foreground text-center mt-2">
            Vos ventes s'afficheront ici dès vos premières commandes
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export const OrdersBarChart = ({ orders = [] }: SalesChartProps) => {
  const data = buildSalesData(orders);
  const isEmpty = orders.length === 0;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <BarChart3 className="w-5 h-5 text-primary" />
          Commandes par mois
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={11} />
            <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                fontSize: '12px',
              }}
            />
            <Bar
              dataKey="commandes"
              fill={isEmpty ? "hsl(var(--muted))" : "hsl(var(--primary))"}
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

export const CategoryPieInfo = ({ orders = [] }: SalesChartProps) => {
  const data = buildCategoryData(orders);
  const displayData = data.length > 0 ? data : neutralCategories;
  const isEmpty = data.length === 0;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          Répartition par catégorie
          {isEmpty && (
            <span className="ml-auto text-[10px] font-normal text-muted-foreground flex items-center gap-1">
              <Info className="w-3 h-3" /> Aperçu
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {displayData.map((cat, index) => (
            <div key={cat.name} className="flex items-center gap-3">
              <div
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{
                  backgroundColor: isEmpty
                    ? `hsl(var(--muted-foreground) / ${0.4 - index * 0.08})`
                    : `hsl(${120 + index * 30}, 70%, 50%)`,
                }}
              />
              <span className="flex-1 text-sm text-muted-foreground">{cat.name}</span>
              <div className="w-24 h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${cat.value}%`,
                    backgroundColor: isEmpty ? "hsl(var(--muted-foreground) / 0.3)" : "hsl(var(--primary))",
                  }}
                />
              </div>
              <span className="text-xs font-medium text-foreground w-10 text-right">{cat.value}%</span>
            </div>
          ))}
          {isEmpty && (
            <p className="text-[10px] text-muted-foreground text-center pt-2 border-t border-border">
              Données disponibles dès vos premières ventes
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
