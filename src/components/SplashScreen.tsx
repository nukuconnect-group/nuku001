import { useEffect, useState } from "react";
import nukuLogo from "@/assets/nukuconnect-logo-splash.png";

interface SplashScreenProps {
  onComplete: () => void;
}

const SplashScreen = ({ onComplete }: SplashScreenProps) => {
  const [phase, setPhase] = useState<"enter" | "visible" | "exit">("enter");

  useEffect(() => {
    const enterTimer = setTimeout(() => setPhase("visible"), 100);
    const exitTimer = setTimeout(() => setPhase("exit"), 2200);
    const completeTimer = setTimeout(onComplete, 2700);

    return () => {
      clearTimeout(enterTimer);
      clearTimeout(exitTimer);
      clearTimeout(completeTimer);
    };
  }, [onComplete]);

  return (
    <div
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center transition-opacity duration-500 bg-white ${
        phase === "exit" ? "opacity-0" : "opacity-100"
      }`}
    >
      <img
        src={nukuLogo}
        alt="NUKUCONNECT"
        className={`w-44 h-44 md:w-60 md:h-60 object-contain transition-all duration-700 ${
          phase === "enter" ? "scale-50 opacity-0" : "scale-100 opacity-100"
        }`}
      />
      <p
        className={`text-muted-foreground text-sm mt-4 transition-all duration-500 delay-300 ${
          phase === "enter" ? "opacity-0 translate-y-4" : "opacity-100 translate-y-0"
        }`}
      >
        Marketplace Agricole Intelligent
      </p>
      <div className="flex gap-1.5 mt-8">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="w-2 h-2 rounded-full bg-primary/60 animate-pulse"
            style={{ animationDelay: `${i * 200}ms` }}
          />
        ))}
      </div>
    </div>
  );
};

export default SplashScreen;
