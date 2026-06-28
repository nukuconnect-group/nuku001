import { useEffect, useMemo, useRef, useState } from "react";
import QRCode from "qrcode";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Copy, Download, Share2, MessageCircle, Facebook, Twitter, Linkedin, Send, Mail } from "lucide-react";
import { toast } from "sonner";
import { shareTargets } from "@/lib/shareLinks";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Clean canonical URL (shown to the user, copied, encoded in the QR). */
  url: string;
  /**
   * Optional preview URL handed to social-network crawlers (WhatsApp, FB,
   * LinkedIn, Telegram). When provided, the social buttons share THIS
   * URL — it should be the public `/share/...` crawler URL that returns
   * proper Open Graph HTML for rich previews. Falls back to `url`.
   */
  previewUrl?: string;
  title?: string;
  description?: string;
}

const SHARE_TEXT_LIMIT = 140;

const summarizeShareText = (text: string) => {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= SHARE_TEXT_LIMIT) return clean;
  const cut = clean.slice(0, SHARE_TEXT_LIMIT - 1);
  return `${cut.slice(0, Math.max(cut.lastIndexOf(" "), 80)).trim()}…`;
};

const ShareDialog = ({ open, onOpenChange, url, previewUrl, title = "Partager", description = "" }: Props) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [dataUrl, setDataUrl] = useState<string>("");

  // Clean canonical URL shown to the user, copied, encoded in the QR,
  // and used by native share. NEVER expose the backend (supabase) URL here.
  const shareableUrl = url;
  const displayUrl = url;
  // Crawler URL kept for social-network buttons so WhatsApp / Facebook /
  // LinkedIn / Telegram can still unfurl a rich preview behind the scenes.
  const socialUrl = previewUrl || url;

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => {
      if (!canvasRef.current) return;
      QRCode.toCanvas(canvasRef.current, shareableUrl, {
        width: 220,
        margin: 2,
        color: { dark: "#0f172a", light: "#ffffff" },
        errorCorrectionLevel: "M",
      }).catch((e) => console.error("QR generation error:", e));
      QRCode.toDataURL(shareableUrl, {
        width: 512,
        margin: 2,
        color: { dark: "#0f172a", light: "#ffffff" },
      }).then(setDataUrl).catch(() => {});
    }, 50);
    return () => clearTimeout(t);
  }, [open, shareableUrl]);

  const copy = async () => {
    try { await navigator.clipboard.writeText(shareableUrl); toast.success("Lien copié"); }
    catch { toast.error("Impossible de copier"); }
  };

  const nativeShare = async () => {
    if (navigator.share) {
      // Native share uses the clean canonical URL — recipient sees nukuconnect.com.
      try { await navigator.share({ title, text: summarizeShareText(description), url: shareableUrl }); }
      catch {}
    } else { copy(); }
  };

  const downloadQR = () => {
    if (!dataUrl) return;
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = "qr-nukuconnect.png";
    a.click();
  };

  const shareText = [title, summarizeShareText(description)].filter(Boolean).join(" — ");
  // Social buttons unfurl the preview URL → rich card with image + title.
  const t = useMemo(() => shareTargets(socialUrl, shareText), [socialUrl, shareText]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Share2 className="w-4 h-4 text-primary" /> {title}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex flex-col items-center gap-2">
            <canvas ref={canvasRef} width={220} height={220} className="rounded-lg border bg-white p-2" style={{ display: "block" }} />
            <Button variant="outline" size="sm" onClick={downloadQR} className="gap-1.5">
              <Download className="w-3.5 h-3.5" /> Télécharger le QR
            </Button>
          </div>
          <div className="flex gap-2">
            <Input readOnly value={displayUrl} className="text-xs" />
            <Button variant="outline" size="icon" onClick={copy}><Copy className="w-4 h-4" /></Button>
          </div>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            L’adresse copiée reste sur <strong>nukuconnect.com</strong> et génère automatiquement l’aperçu image, titre et description.
          </p>
          <div className="grid grid-cols-3 gap-2">
            <a href={t.whatsapp} target="_blank" rel="noopener noreferrer"><Button variant="outline" size="sm" className="w-full gap-1"><MessageCircle className="w-3.5 h-3.5" />WhatsApp</Button></a>
            <a href={t.facebook} target="_blank" rel="noopener noreferrer"><Button variant="outline" size="sm" className="w-full gap-1"><Facebook className="w-3.5 h-3.5" />Facebook</Button></a>
            <a href={t.twitter} target="_blank" rel="noopener noreferrer"><Button variant="outline" size="sm" className="w-full gap-1"><Twitter className="w-3.5 h-3.5" />X</Button></a>
            <a href={t.linkedin} target="_blank" rel="noopener noreferrer"><Button variant="outline" size="sm" className="w-full gap-1"><Linkedin className="w-3.5 h-3.5" />LinkedIn</Button></a>
            <a href={t.telegram} target="_blank" rel="noopener noreferrer"><Button variant="outline" size="sm" className="w-full gap-1"><Send className="w-3.5 h-3.5" />Telegram</Button></a>
            <a href={t.email}><Button variant="outline" size="sm" className="w-full gap-1"><Mail className="w-3.5 h-3.5" />Email</Button></a>
          </div>
          <Button variant="hero" className="w-full gap-2" onClick={nativeShare}>
            <Share2 className="w-4 h-4" /> Partager via mon appareil
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ShareDialog;
