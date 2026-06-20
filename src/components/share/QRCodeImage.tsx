import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { QrCode } from "lucide-react";

interface QRCodeImageProps {
  value: string;
  alt: string;
  size?: number;
  className?: string;
}

export default function QRCodeImage({ value, alt, size = 220, className = "" }: QRCodeImageProps) {
  const [src, setSrc] = useState("");
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setFailed(false);
    QRCode.toDataURL(value, {
      width: size,
      margin: 2,
      errorCorrectionLevel: "H",
      color: { dark: "#0f172a", light: "#ffffff" },
    })
      .then((dataUrl) => { if (!cancelled) setSrc(dataUrl); })
      .catch(() => { if (!cancelled) setFailed(true); });
    return () => { cancelled = true; };
  }, [size, value]);

  if (failed || !src) {
    return (
      <div className={`flex items-center justify-center bg-white text-slate-700 ${className}`} style={{ width: size, height: size }}>
        <QrCode className="h-1/3 w-1/3" aria-hidden="true" />
        <span className="sr-only">{alt}</span>
      </div>
    );
  }

  return <img src={src} alt={alt} width={size} height={size} className={className} />;
}