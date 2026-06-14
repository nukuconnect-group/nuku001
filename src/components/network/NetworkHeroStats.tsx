import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { useEffect } from "react";
import { Users, Package, ShoppingBag, ShieldCheck } from "lucide-react";

interface Stat {
  label: string;
  value: number;
  icon: typeof Users;
  accent: string;
}

function AnimatedNumber({ value }: { value: number }) {
  const mv = useMotionValue(0);
  const rounded = useTransform(mv, (v) => Math.round(v).toLocaleString("fr-FR"));

  useEffect(() => {
    const controls = animate(mv, value, { duration: 1.6, ease: "easeOut" });
    return () => controls.stop();
  }, [value, mv]);

  return <motion.span>{rounded}</motion.span>;
}

interface Props {
  suppliers: number;
  producers: number;
  buyers: number;
  verified: number;
}

export default function NetworkHeroStats({ suppliers, producers, buyers, verified }: Props) {
  const stats: Stat[] = [
    { label: "Fournisseurs", value: suppliers, icon: Package, accent: "text-emerald-500" },
    { label: "Producteurs", value: producers, icon: Users, accent: "text-primary" },
    { label: "Acheteurs", value: buyers, icon: ShoppingBag, accent: "text-accent" },
    { label: "Vérifiés", value: verified, icon: ShieldCheck, accent: "text-emerald-600" },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 max-w-3xl mx-auto">
      {stats.map((s, i) => (
        <motion.div
          key={s.label}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 + i * 0.08, ease: "easeOut" }}
          className="rounded-xl bg-card/85 backdrop-blur-md border border-white/30 px-3 py-2.5 sm:px-4 sm:py-3 text-center shadow-sm"
        >
          <s.icon className={`w-4 h-4 sm:w-5 sm:h-5 mx-auto mb-1 ${s.accent}`} />
          <p className="font-heading font-extrabold text-foreground text-base sm:text-xl leading-tight">
            <AnimatedNumber value={s.value} />
          </p>
          <p className="text-[9px] sm:text-[10px] text-muted-foreground uppercase tracking-wide font-semibold">{s.label}</p>
        </motion.div>
      ))}
    </div>
  );
}
