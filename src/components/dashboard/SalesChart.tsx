import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { TrendingUp, BarChart3 } from "lucide-react";

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
    const [year, month] = key.split('-').map(Number);
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

export const SalesAreaChart = ({ orders = [] }: SalesChartProps) => {
  const data = buildSalesData(orders);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-primary" />
          Évolution des ventes (FCFA)
        </CardTitle>
      </CardHeader>
      <CardContent>
        {orders.length === 0 ? (
          <div className="h-[250px] flex items-center justify-center text-muted-foreground text-sm">
            Aucune vente enregistrée pour le moment
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={data}>
              <defs>
                <linearGradient id="colorVentes" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={(v) => `${v/1000}K`} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))', 
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }}
                formatter={(value: number) => [`${value.toLocaleString()} FCFA`, 'Ventes']}
              />
              <Area type="monotone" dataKey="ventes" stroke="hsl(var(--primary))" fillOpacity={1} fill="url(#colorVentes)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
};

export const OrdersBarChart = ({ orders = [] }: SalesChartProps) => {
  const data = buildSalesData(orders);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-primary" />
          Commandes par mois
        </CardTitle>
      </CardHeader>
      <CardContent>
        {orders.length === 0 ? (
          <div className="h-[250px] flex items-center justify-center text-muted-foreground text-sm">
            Aucune commande pour le moment
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))', 
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }}
              />
              <Bar dataKey="commandes" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
};

export const CategoryPieInfo = ({ orders = [] }: SalesChartProps) => {
  const data = buildCategoryData(orders);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Répartition par catégorie</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground text-sm">
            Aucune donnée disponible
          </div>
        ) : (
          <div className="space-y-3">
            {data.map((cat, index) => (
              <div key={cat.name} className="flex items-center gap-3">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: `hsl(${120 + index * 30}, 70%, 50%)` }}
                />
                <span className="flex-1 text-sm text-muted-foreground">{cat.name}</span>
                <span className="text-sm font-medium text-foreground">{cat.value}%</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
