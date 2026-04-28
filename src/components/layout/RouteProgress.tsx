import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";

/**
 * Barre de progression discrète : n'apparaît qu'après 250 ms.
 * Pour les navigations rapides (cache, prefetch), rien ne s'affiche
 * → la transition paraît instantanée.
 */
export const RouteProgress = () => {
  const location = useLocation();
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const showTimer = setTimeout(() => {
      if (cancelled) return;
      setVisible(true);
      setProgress(40);
    }, 250);

    const t1 = setTimeout(() => !cancelled && setProgress(70), 500);
    const t2 = setTimeout(() => !cancelled && setProgress(92), 900);
    const t3 = setTimeout(() => {
      if (cancelled) return;
      setProgress(100);
      setTimeout(() => {
        if (!cancelled) {
          setVisible(false);
          setProgress(0);
        }
      }, 180);
    }, 1200);

    return () => {
      cancelled = true;
      clearTimeout(showTimer);
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [location.pathname]);

  if (!visible) return null;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[9999] h-[2px] bg-transparent pointer-events-none"
      role="progressbar"
      aria-label="Chargement de la page"
    >
      <div
        className="h-full bg-primary/80 transition-all duration-200 ease-out"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
};

export default RouteProgress;
