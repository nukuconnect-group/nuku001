import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Home, Store, GraduationCap, MessageCircle, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import AccountSidebar from "./AccountSidebar";

const navItems = [
  { icon: Home, label: "Accueil", href: "/" },
  { icon: Store, label: "Marché", href: "/marketplace" },
  { icon: GraduationCap, label: "Formations", href: "/formations" },
  { icon: MessageCircle, label: "Messages", href: "/messages" },
];

const MobileBottomNav = () => {
  const location = useLocation();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [isAccountOpen, setIsAccountOpen] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setProfile(null);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", userId)
      .single();
    setProfile(data);
  };

  return (
    <>
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
          
          {/* Account Button */}
          <button
            onClick={() => setIsAccountOpen(true)}
            className="flex flex-col items-center justify-center gap-0.5 px-3 py-2 rounded-lg transition-colors text-muted-foreground hover:text-foreground"
          >
            {user && profile?.avatar_url ? (
              <img 
                src={profile.avatar_url} 
                alt="Profile" 
                className="w-6 h-6 rounded-full object-cover border-2 border-primary"
              />
            ) : user ? (
              <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                <span className="text-[10px] font-bold text-primary-foreground">
                  {profile?.full_name?.charAt(0) || user.email?.charAt(0)?.toUpperCase()}
                </span>
              </div>
            ) : (
              <User className="w-5 h-5" />
            )}
            <span className="text-[10px] font-medium">
              {user ? "Profil" : "Compte"}
            </span>
          </button>
        </div>
      </nav>
      
      <AccountSidebar isOpen={isAccountOpen} onClose={() => setIsAccountOpen(false)} />
    </>
  );
};

export default MobileBottomNav;
