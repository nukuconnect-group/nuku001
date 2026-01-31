import { Link, useLocation } from "react-router-dom";
import { Home, Store, Users, Bot, GraduationCap, QrCode, MessageCircle } from "lucide-react";

const navItems = [
  { icon: Home, label: "Accueil", href: "/" },
  { icon: Store, label: "Marché", href: "/marketplace" },
  { icon: Users, label: "Producteurs", href: "/producteurs" },
  { icon: Bot, label: "NUKU AI", href: "/nuku-ai" },
  { icon: MessageCircle, label: "Chat", href: "/messages" },
];

const MobileBottomNav = () => {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-lg border-t border-border lg:hidden">
      <div className="flex items-center justify-around h-16">
        {navItems.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <Link
              key={item.href}
              to={item.href}
              className={`flex flex-col items-center justify-center gap-0.5 px-3 py-2 rounded-lg transition-colors ${
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <item.icon className={`w-5 h-5 ${isActive ? "fill-primary/20" : ""}`} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default MobileBottomNav;
