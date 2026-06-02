import { Link } from "react-router-dom";
import { Facebook, Twitter, Instagram, Linkedin, Mail, Phone, MapPin, Smartphone } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import nukuLogoWhite from "@/assets/nukuconnect-logo-white.png";
import footerBg from "@/assets/footer-bg.webp";
import badgeGooglePlay from "@/assets/badge-google-play.png";
import badgeAppStore from "@/assets/badge-app-store.png";
import TrustBadges from "@/components/cart/TrustBadges";

const Footer = () => {
  const { t } = useLanguage();

  const footerLinks = {
    platform: [
      { label: "Marketplace", href: "/marketplace" },
      { label: t("net.suppliers"), href: "/producteurs" },
      { label: t("net.buyers"), href: "/buyer-dashboard" },
      { label: "NUKUCONNECT IA", href: "/nuku-ai" },
      { label: t("footer.legal"), href: "/legal" },
    ],
    resources: [
      { label: t("nav.formations"), href: "/formations" },
      { label: t("nav.traceability"), href: "/tracabilite" },
      { label: t("nav.plans"), href: "/plans" },
      { label: "FAQ Nuku AI", href: "/faq-nuku-ai" },
      { label: t("nav.help"), href: "/aide" },
      { label: "Politique d'achat & remboursement", href: "/politique-achat" },
    ],
    company: [
      { label: t("nav.about"), href: "/a-propos" },
      { label: t("nav.contact"), href: "/contact" },
      { label: "Affiliation", href: "/affiliation" },
      { label: t("footer.terms"), href: "/terms" },
      { label: t("footer.privacy"), href: "/privacy" },
    ],
  };

  const socialLinks = [
    { icon: Facebook, href: "https://web.facebook.com/Nukuconnect", label: "Facebook" },
    { icon: Twitter, href: "#", label: "Twitter" },
    { icon: Instagram, href: "#", label: "Instagram" },
    { icon: Linkedin, href: "https://www.linkedin.com/company/nukuconnect/?viewAsMember=true", label: "LinkedIn" },
  ];

  return (
    <>
      {/* Trust badges — visibles sur tout le site juste avant le pied de page */}
      <TrustBadges />
      <footer className="text-white relative overflow-hidden">
        {/* Background image with blur overlay */}
        <div className="absolute inset-0 z-0">
          <img src={footerBg} alt="" className="w-full h-full object-cover" loading="lazy" decoding="async" />
          <div className="absolute inset-0 backdrop-blur-[3px]" style={{ background: "linear-gradient(135deg, rgba(28, 152, 237, 0.82) 0%, rgba(0, 107, 0, 0.85) 100%)" }} />
        </div>
        {/* App Download Section */}
      <div className="border-b border-white/15 relative z-10">
        <div className="container mx-auto px-4 py-6 sm:py-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 sm:gap-6">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-white/20 flex items-center justify-center flex-shrink-0">
                <Smartphone className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
              </div>
              <div className="text-left">
                <h3 className="font-heading text-base sm:text-lg font-bold text-white leading-tight">
                  {t("footer.downloadApp")}
                </h3>
                <p className="text-white/70 text-[11px] sm:text-sm leading-tight">
                  {t("footer.downloadDesc")}
                </p>
              </div>
            </div>
            <div className="flex flex-row items-center gap-3 sm:gap-4">
              <a href="#" className="flex-shrink-0 block rounded-lg overflow-hidden">
                <img src={badgeGooglePlay} alt="Google Play" className="h-10 sm:h-12 w-auto object-contain mix-blend-screen" />
              </a>
              <a href="#" className="flex-shrink-0 block">
                <img src={badgeAppStore} alt="App Store" className="h-10 sm:h-12 w-auto object-contain" />
              </a>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 sm:py-12 lg:py-16 relative z-10">
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-6 sm:gap-8 lg:gap-12">
          {/* Brand */}
          <div className="col-span-2 sm:col-span-2 lg:col-span-1">
            <Link to="/" className="inline-block mb-4">
              <img src={nukuLogoWhite} alt="NUKUCONNECT" className="h-28 sm:h-32 lg:h-36 object-contain" />
            </Link>
            <p className="text-white/70 text-xs sm:text-sm mb-4 sm:mb-6">
              {t("footer.desc")}
            </p>
            <div className="flex gap-2 sm:gap-3">
              {socialLinks.map((social, index) => (
                <a
                  key={index}
                  href={social.href}
                  aria-label={social.label}
                  className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-white/15 flex items-center justify-center hover:bg-white/30 text-white transition-colors"
                >
                  <social.icon className="w-4 h-4 sm:w-5 sm:h-5" />
                </a>
              ))}
            </div>
          </div>

          {/* Links */}
          <div>
            <h4 className="font-heading font-semibold text-sm sm:text-base mb-3 sm:mb-4 text-white">{t("footer.platform")}</h4>
            <ul className="space-y-2 sm:space-y-3">
              {footerLinks.platform.map((link) => (
                <li key={link.href}>
                  <Link to={link.href} className="text-xs sm:text-sm text-white/70 hover:text-white transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-heading font-semibold text-sm sm:text-base mb-3 sm:mb-4 text-white">{t("footer.resources")}</h4>
            <ul className="space-y-2 sm:space-y-3">
              {footerLinks.resources.map((link) => (
                <li key={link.href}>
                  <Link to={link.href} className="text-xs sm:text-sm text-white/70 hover:text-white transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-heading font-semibold text-sm sm:text-base mb-3 sm:mb-4 text-white">{t("footer.company")}</h4>
            <ul className="space-y-2 sm:space-y-3">
              {footerLinks.company.map((link) => (
                <li key={link.href}>
                  <Link to={link.href} className="text-xs sm:text-sm text-white/70 hover:text-white transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="col-span-2 sm:col-span-1">
            <h4 className="font-heading font-semibold text-sm sm:text-base mb-3 sm:mb-4 text-white">{t("footer.contact")}</h4>
            <ul className="space-y-2 sm:space-y-3">
              <li className="flex items-center gap-2 text-xs sm:text-sm text-white/70">
                <Mail className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">contact@nukuconnect.com</span>
              </li>
              <li className="flex items-center gap-2 text-xs sm:text-sm text-white/70">
                <Phone className="w-4 h-4 flex-shrink-0" />
                +228 91 97 10 76
              </li>
              <li className="flex items-center gap-2 text-xs sm:text-sm text-white/70">
                <Phone className="w-4 h-4 flex-shrink-0" />
                +228 91 20 14 68
              </li>
              <li className="flex items-start gap-2 text-xs sm:text-sm text-white/70">
                <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                Lomé, Togo
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-8 sm:mt-12 pt-6 sm:pt-8 border-t border-white/15 flex justify-center items-center">
          <p className="text-xs sm:text-sm text-white/50 text-center">
            © 2025 NUKUCONNECT. {t("footer.rights")}
          </p>
        </div>
      </div>
      </footer>
    </>
  );
};

export default Footer;
