import { useState, useRef, useEffect, useCallback } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, Search, Loader2, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
  open: boolean;
  onClose: () => void;
  onResult: (transcript: string) => void;
}

export default function VoiceSearchModal({ open, onClose, onResult }: Props) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState("");
  const [volume, setVolume] = useState(0);
  const recognitionRef = useRef<any>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number>(0);
  const streamRef = useRef<MediaStream | null>(null);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setIsListening(false);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    cancelAnimationFrame(animFrameRef.current);
    setVolume(0);
  }, []);

  const startListening = useCallback(async () => {
    setError("");
    setTranscript("");

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError("La recherche vocale n'est pas supportée sur ce navigateur.");
      return;
    }

    try {
      // Get mic stream for volume visualization
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const audioCtx = new AudioContext();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      // Animate volume
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const updateVolume = () => {
        analyser.getByteFrequencyData(dataArray);
        const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
        setVolume(avg / 128); // normalize 0-2
        animFrameRef.current = requestAnimationFrame(updateVolume);
      };
      updateVolume();

      const recognition = new SpeechRecognition();
      recognition.lang = "fr-FR";
      recognition.continuous = false;
      recognition.interimResults = true;

      recognition.onresult = (e: any) => {
        const results = Array.from(e.results as SpeechRecognitionResultList);
        const text = results.map((r: any) => r[0].transcript).join("");
        setTranscript(text);

        if (e.results[0].isFinal) {
          stopListening();
        }
      };

      recognition.onerror = (e: any) => {
        if (e.error === "no-speech") {
          setError("Aucune voix détectée. Réessayez.");
        } else {
          setError("Erreur de reconnaissance vocale.");
        }
        stopListening();
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
      recognitionRef.current = recognition;
      setIsListening(true);
    } catch {
      setError("Impossible d'accéder au microphone. Vérifiez les permissions.");
    }
  }, [stopListening]);

  // Auto-start when opened
  useEffect(() => {
    if (open) {
      const timer = setTimeout(startListening, 300);
      return () => clearTimeout(timer);
    } else {
      stopListening();
      setTranscript("");
      setError("");
    }
  }, [open]);

  // Auto-submit after transcript is final and delay
  useEffect(() => {
    if (transcript && !isListening) {
      const timer = setTimeout(() => {
        onResult(transcript);
        onClose();
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [transcript, isListening]);

  const handleClose = () => {
    stopListening();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="sm:max-w-sm p-0 rounded-2xl overflow-hidden border-0 bg-gradient-to-b from-primary/5 to-background">
        <div className="relative flex flex-col items-center py-10 px-6">
          {/* Close button */}
          <button onClick={handleClose} className="absolute top-3 right-3 p-1.5 rounded-full hover:bg-muted transition-colors">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>

          {/* Title */}
          <p className="text-sm font-semibold text-foreground mb-1">Recherche vocale</p>
          <p className="text-xs text-muted-foreground mb-8">
            {isListening ? "Dites le nom du produit recherché..." : error ? error : transcript ? "Recherche en cours..." : "Préparation du micro..."}
          </p>

          {/* Animated mic circle */}
          <div className="relative mb-8">
            <AnimatePresence>
              {isListening && (
                <>
                  {[0, 1, 2].map((i) => (
                    <motion.div
                      key={i}
                      className="absolute inset-0 rounded-full border-2 border-primary/30"
                      initial={{ scale: 1, opacity: 0.6 }}
                      animate={{
                        scale: 1 + volume * 0.5 + i * 0.15,
                        opacity: 0.6 - i * 0.15,
                      }}
                      transition={{ duration: 0.15 }}
                      style={{ margin: -(i * 12) }}
                    />
                  ))}
                </>
              )}
            </AnimatePresence>
            <button
              onClick={isListening ? stopListening : startListening}
              className={`relative z-10 w-20 h-20 rounded-full flex items-center justify-center transition-all shadow-lg ${
                isListening
                  ? "bg-destructive text-destructive-foreground scale-110"
                  : "bg-primary text-primary-foreground hover:bg-primary/90"
              }`}
            >
              {isListening ? <MicOff className="w-8 h-8" /> : <Mic className="w-8 h-8" />}
            </button>
          </div>

          {/* Transcript display */}
          <AnimatePresence mode="wait">
            {transcript && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="w-full bg-card border border-border rounded-xl p-4 text-center"
              >
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Search className="w-4 h-4 text-primary" />
                  <span className="text-[10px] font-medium text-primary uppercase tracking-wider">Produit détecté</span>
                </div>
                <p className="text-base font-semibold text-foreground">{transcript}</p>
                {!isListening && (
                  <motion.div initial={{ width: 0 }} animate={{ width: "100%" }} transition={{ duration: 0.8 }}
                    className="h-0.5 bg-primary rounded-full mt-3" />
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Error retry */}
          {error && !isListening && (
            <Button variant="outline" size="sm" className="mt-4 gap-2 text-xs" onClick={startListening}>
              <Mic className="w-3.5 h-3.5" /> Réessayer
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
