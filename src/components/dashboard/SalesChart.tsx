import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { TrendingUp, BarChart3 } from "lucide-react";

const salesData = [
  { name: 'Jan', ventes: 400000, commandes: 24 },
  { name: 'Fév', ventes: 300000, commandes: 18 },
  { name: 'Mar', ventes: 520000, commandes: 32 },
  { name: 'Avr', ventes: 780000, commandes: 45 },
  { name: 'Mai', ventes: 890000, commandes: 52 },
  { name: 'Jun', ventes: 650000, commandes: 38 },
  { name: 'Jul', ventes: 920000, commandes: 58 },
];

const categoryData = [
  { name: 'Céréales', value: 45 },
  { name: 'Légumes', value: 28 },
  { name: 'Fruits', value: 18 },
  { name: 'Élevage', value: 9 },
];

export const SalesAreaChart = () => (
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        <TrendingUp className="w-5 h-5 text-primary" />
        Évolution des ventes (FCFA)
      </CardTitle>
    </CardHeader>
    <CardContent>
      <ResponsiveContainer width="100%" height={250}>
        <AreaChart data={salesData}>
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
          <Area 
            type="monotone" 
            dataKey="ventes" 
            stroke="hsl(var(--primary))" 
            fillOpacity={1} 
            fill="url(#colorVentes)" 
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    </CardContent>
  </Card>
);

export const OrdersBarChart = () => (
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        <BarChart3 className="w-5 h-5 text-primary" />
        Commandes par mois
      </CardTitle>
    </CardHeader>
    <CardContent>
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={salesData}>
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
          <Bar 
            dataKey="commandes" 
            fill="hsl(var(--primary))" 
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </CardContent>
  </Card>
);

export const CategoryPieInfo = () => (
  <Card>
    <CardHeader>
      <CardTitle className="text-base">Répartition par catégorie</CardTitle>
    </CardHeader>
    <CardContent>
      <div className="space-y-3">
        {categoryData.map((cat, index) => (
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
    </CardContent>
  </Card>
);
