import { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface DashboardSidebarItem {
  label: string;
  icon: LucideIcon;
  href?: string;
  tabValue?: string;
  badge?: string | number;
  onClick?: () => void;
}

interface DashboardLayoutProps {
  children: ReactNode;
  sidebarTitle: string;
  sidebarSubtitle?: string;
  items: DashboardSidebarItem[];
  activeTab?: string;
  onTabChange?: (tab: string) => void;
}

/**
 * Layout responsive avec sidebar latérale gauche sur desktop (>=lg)
 * et contenu pleine largeur sur mobile (la nav mobile reste en bas).
 */
const DashboardLayout = ({
  children,
  sidebarTitle,
  sidebarSubtitle,
  items,
  activeTab,
  onTabChange,
}: DashboardLayoutProps) => {
  const location = useLocation();

  return (
    <div className="lg:flex lg:gap-0 lg:max-w-[1400px] lg:mx-auto">
      {/* Sidebar desktop uniquement */}
      <aside className="hidden lg:flex lg:flex-col lg:w-60 xl:w-64 lg:flex-shrink-0 lg:border-r lg:border-border lg:bg-card lg:min-h-[calc(100vh-64px)] lg:sticky lg:top-16">
        <div className="px-4 py-5 border-b border-border">
          <h2 className="font-heading text-sm font-bold text-foreground tracking-tight">
            {sidebarTitle}
          </h2>
          {sidebarSubtitle && (
            <p className="text-[11px] text-muted-foreground mt-0.5">{sidebarSubtitle}</p>
          )}
        </div>
        <nav className="flex-1 py-2 overflow-y-auto">
          {items.map((item, idx) => {
            const isActive =
              (item.tabValue && activeTab === item.tabValue) ||
              (item.href && location.pathname === item.href.split("?")[0]);

            const className = cn(
              "flex items-center gap-3 px-4 py-2.5 text-[13px] font-medium tracking-tight transition-colors w-full text-left border-l-2",
              isActive
                ? "bg-primary/10 text-primary border-primary"
                : "text-foreground hover:bg-muted/50 border-transparent"
            );

            const inner = (
              <>
                <item.icon
                  className={cn(
                    "w-4 h-4 flex-shrink-0",
                    isActive ? "text-primary" : "text-muted-foreground"
                  )}
                />
                <span className="flex-1 truncate">{item.label}</span>
                {item.badge !== undefined && item.badge !== "" && (
                  <span className="bg-destructive text-destructive-foreground text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                    {item.badge}
                  </span>
                )}
              </>
            );

            if (item.tabValue && onTabChange) {
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => onTabChange(item.tabValue!)}
                  className={className}
                >
                  {inner}
                </button>
              );
            }
            if (item.onClick) {
              return (
                <button key={idx} type="button" onClick={item.onClick} className={className}>
                  {inner}
                </button>
              );
            }
            return (
              <Link key={idx} to={item.href || "#"} className={className}>
                {inner}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Contenu principal */}
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
};

export default DashboardLayout;
