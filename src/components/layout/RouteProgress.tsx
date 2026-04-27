import { useEffect, useState } from "react";
import { useLocation, useNavigation } from "react-router-dom";

/**
 * Barre de progression top affichée lors des changements de route
 * et pendant le chargement Suspense des pages lazy.
 */
export const RouteProgress = () => {
  const location = useLocation();
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(true);
    setProgress(15);

    const t1 = setTimeout(() => setProgress(45), 80);
    const t2 = setTimeout(() => setProgress(75), 250);
    const t3 = setTimeout(() => setProgress(95), 500);
    const t4 = setTimeout(() => {
      setProgress(100);
      setTimeout(() => {
        setVisible(false);
        setProgress(0);
      }, 200);
    }, 750);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, [location.pathname]);

  if (!visible) return null;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[9999] h-[3px] bg-transparent pointer-events-none"
      role="progressbar"
      aria-label="Chargement de la page"
    >
      <div
        className="h-full bg-gradient-to-r from-primary via-primary/80 to-primary shadow-[0_0_10px_hsl(var(--primary))] transition-all duration-200 ease-out"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
};

export default RouteProgress;
