import { useEffect, useRef, useState } from "react";
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
  url: string;
  title?: string;
  description?: string;
}

const ShareDialog = ({ open, onOpenChange, url, title = "Partager", description = "" }: Props) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [dataUrl, setDataUrl] = useState<string>("");

  useEffect(() => {
    if (!open || !canvasRef.current) return;
    QRCode.toCanvas(canvasRef.current, url, { width: 220, margin: 1 }).catch(() => {});
    QRCode.toDataURL(url, { width: 512, margin: 2 }).then(setDataUrl).catch(() => {});
  }, [open, url]);

  const copy = async () => {
    try { await navigator.clipboard.writeText(url); toast.success("Lien copié"); }
    catch { toast.error("Impossible de copier"); }
  };

  const nativeShare = async () => {
    if (navigator.share) {
      try { await navigator.share({ title, text: description, url }); }
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

  const t = shareTargets(url, title);

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
            <canvas ref={canvasRef} className="rounded-lg border bg-white p-2" />
            <Button variant="outline" size="sm" onClick={downloadQR} className="gap-1.5">
              <Download className="w-3.5 h-3.5" /> Télécharger le QR
            </Button>
          </div>
          <div className="flex gap-2">
            <Input readOnly value={url} className="text-xs" />
            <Button variant="outline" size="icon" onClick={copy}><Copy className="w-4 h-4" /></Button>
          </div>
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
