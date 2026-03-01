import { useEffect, useState } from "react";
import nukuLogo from "@/assets/nukuconnect-logo-new.png";

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
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center transition-opacity duration-500 ${
        phase === "exit" ? "opacity-0" : "opacity-100"
      }`}
      style={{ backgroundColor: "#1a6b35" }}
    >
      <img
        src={nukuLogo}
        alt="NUKUCONNECT"
        className={`w-40 h-40 md:w-56 md:h-56 object-contain transition-all duration-700 ${
          phase === "enter" ? "scale-50 opacity-0" : "scale-100 opacity-100"
        }`}
      />
      <p
        className={`text-white/70 text-sm mt-4 transition-all duration-500 delay-300 ${
          phase === "enter" ? "opacity-0 translate-y-4" : "opacity-100 translate-y-0"
        }`}
      >
        Marketplace Agricole Intelligent
      </p>
      <div className="flex gap-1.5 mt-8">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="w-2 h-2 rounded-full bg-white/60 animate-pulse"
            style={{ animationDelay: `${i * 200}ms` }}
          />
        ))}
      </div>
    </div>
  );
};

export default SplashScreen;
