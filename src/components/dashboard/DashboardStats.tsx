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
    <CardContent className="p-2.5 sm:p-4">
      <div className="flex items-center gap-2 sm:gap-3">
        <div className={`w-9 h-9 sm:w-12 sm:h-12 rounded-xl ${color} flex items-center justify-center flex-shrink-0`}>
          <Icon className="w-4 h-4 sm:w-6 sm:h-6" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm sm:text-2xl font-bold text-foreground truncate">{value}</p>
          <p className="text-[10px] sm:text-sm text-muted-foreground truncate">{label}</p>
        </div>
        {trend && (
          <div className={`text-[10px] sm:text-xs font-medium flex-shrink-0 ${trend.isPositive ? 'text-green-600' : 'text-red-500'}`}>
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
  <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4 mb-4 sm:mb-8">
    {stats.map((stat) => (
      <StatCard key={stat.label} {...stat} />
    ))}
  </div>
);
