import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  color: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

export const StatCard = ({ label, value, icon: Icon, color, trend }: StatCardProps) => (
  <Card className="hover:shadow-elevated transition-all">
    <CardContent className="p-4">
      <div className="flex items-center gap-3">
        <div className={`w-12 h-12 rounded-xl ${color} flex items-center justify-center`}>
          <Icon className="w-6 h-6" />
        </div>
        <div className="flex-1">
          <p className="text-2xl font-bold text-foreground">{value}</p>
          <p className="text-sm text-muted-foreground">{label}</p>
        </div>
        {trend && (
          <div className={`text-xs font-medium ${trend.isPositive ? 'text-green-600' : 'text-red-500'}`}>
            {trend.isPositive ? '+' : ''}{trend.value}%
          </div>
        )}
      </div>
    </CardContent>
  </Card>
);

interface StatsGridProps {
  stats: StatCardProps[];
}

export const StatsGrid = ({ stats }: StatsGridProps) => (
  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
    {stats.map((stat) => (
      <StatCard key={stat.label} {...stat} />
    ))}
  </div>
);
