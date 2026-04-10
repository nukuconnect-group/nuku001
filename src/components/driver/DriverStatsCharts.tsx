import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { TrendingUp, BarChart3 } from "lucide-react";
import { useMemo } from "react";

const monthNames = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];

interface DriverStatsChartsProps {
  completedDeliveries: any[];
}

const DriverStatsCharts = ({ completedDeliveries }: DriverStatsChartsProps) => {
  const earningsData = useMemo(() => {
    const now = new Date();
    const monthMap: Record<string, { gains: number; livraisons: number }> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      monthMap[key] = { gains: 0, livraisons: 0 };
    }
    completedDeliveries.forEach(d => {
      const date = new Date(d.delivered_at || d.created_at);
      const key = `${date.getFullYear()}-${date.getMonth()}`;
      if (monthMap[key]) {
        monthMap[key].gains += d.driver_fee || 0;
        monthMap[key].livraisons += 1;
      }
    });
    return Object.entries(monthMap).map(([key]) => {
      const [, month] = key.split('-').map(Number);
      return { name: monthNames[month], ...monthMap[key] };
    });
  }, [completedDeliveries]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <TrendingUp className="w-4 h-4 text-primary" />
            Gains mensuels (FCFA)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {completedDeliveries.length === 0 ? (
            <div className="h-[200px] flex items-center justify-center text-muted-foreground text-xs">
              Aucune livraison terminée
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={earningsData}>
                <defs>
                  <linearGradient id="colorGains" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={10} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} tickFormatter={(v) => `${v/1000}K`} />
                <Tooltip
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }}
                  formatter={(value: number) => [`${value.toLocaleString()} FCFA`, 'Gains']}
                />
                <Area type="monotone" dataKey="gains" stroke="hsl(var(--primary))" fillOpacity={1} fill="url(#colorGains)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <BarChart3 className="w-4 h-4 text-primary" />
            Livraisons par mois
          </CardTitle>
        </CardHeader>
        <CardContent>
          {completedDeliveries.length === 0 ? (
            <div className="h-[200px] flex items-center justify-center text-muted-foreground text-xs">
              Aucune livraison terminée
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={earningsData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={10} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} />
                <Tooltip
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }}
                />
                <Bar dataKey="livraisons" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DriverStatsCharts;
