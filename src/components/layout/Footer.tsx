import { Link } from "react-router-dom";
import { Facebook, Twitter, Instagram, Linkedin, Mail, Phone, MapPin, Smartphone } from "lucide-react";
import nukuLogoWhite from "@/assets/nukuconnect-logo-white.png";
import footerBg from "@/assets/footer-bg.jpg";
import badgeGooglePlay from "@/assets/badge-google-play.png";
import badgeAppStore from "@/assets/badge-app-store.png";

const Footer = () => {
  const footerLinks = {
    platform: [
      { label: "Marketplace", href: "/marketplace" },
      { label: "Fournisseurs", href: "/producteurs" },
      { label: "Acheteurs", href: "/buyer-dashboard" },
      { label: "NUKU AI", href: "/nuku-ai" },
    ],
    resources: [
      { label: "Formations", href: "/formations" },
      { label: "Traçabilité", href: "/tracabilite" },
      { label: "Tarifs", href: "/plans" },
      { label: "Centre d'aide", href: "/aide" },
    ],
    company: [
      { label: "À propos", href: "/a-propos" },
      { label: "Contact", href: "/contact" },
    ],
    legal: [
      { label: "Conditions d'utilisation", href: "/terms" },
      { label: "Politique de confidentialité", href: "/privacy" },
      { label: "Mentions légales", href: "/legal" },
    ],
  };

  const socialLinks = [
    { icon: Facebook, href: "#", label: "Facebook" },
    { icon: Twitter, href: "#", label: "Twitter" },
    { icon: Instagram, href: "#", label: "Instagram" },
    { icon: Linkedin, href: "#", label: "LinkedIn" },
  ];

  return (
    <footer className="text-white relative overflow-hidden">
      {/* Background image with blur overlay */}
      <div className="absolute inset-0 z-0">
        <img src={footerBg} alt="" className="w-full h-full object-cover" />
        <div className="absolute inset-0 backdrop-blur-sm" style={{ background: "linear-gradient(135deg, rgba(28, 152, 237, 0.85) 0%, rgba(0, 107, 0, 0.88) 100%)" }} />
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
                  Téléchargez l'application
                </h3>
                <p className="text-white/70 text-[11px] sm:text-sm leading-tight">
                  Accédez à NUKUCONNECT partout, tout le temps.
                </p>
              </div>
            </div>
            <div className="flex flex-row items-center gap-3 sm:gap-4">
              <a href="#" className="flex-shrink-0 block rounded-lg overflow-hidden">
                <img src={badgeGooglePlay} alt="Disponible sur Google Play" className="h-10 sm:h-12 w-auto object-contain mix-blend-screen" />
              </a>
              <a href="#" className="flex-shrink-0 block">
                <img src={badgeAppStore} alt="Télécharger dans l'App Store" className="h-10 sm:h-12 w-auto object-contain" />
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
              <img src={nukuLogoWhite} alt="NUKUCONNECT" className="h-20 sm:h-24 object-contain" />
            </Link>
            <p className="text-white/70 text-xs sm:text-sm mb-4 sm:mb-6">
              La marketplace agricole intelligente qui connecte producteurs et acheteurs.
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
            <h4 className="font-heading font-semibold text-sm sm:text-base mb-3 sm:mb-4 text-white">Plateforme</h4>
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
            <h4 className="font-heading font-semibold text-sm sm:text-base mb-3 sm:mb-4 text-white">Ressources</h4>
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
            <h4 className="font-heading font-semibold text-sm sm:text-base mb-3 sm:mb-4 text-white">Entreprise</h4>
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
            <h4 className="font-heading font-semibold text-sm sm:text-base mb-3 sm:mb-4 text-white">Contact</h4>
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
        <div className="mt-8 sm:mt-12 pt-6 sm:pt-8 border-t border-white/15 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-xs sm:text-sm text-white/50 text-center md:text-left">
            © 2025 NUKUCONNECT. Tous droits réservés.
          </p>
          <div className="flex flex-wrap justify-center gap-4 sm:gap-6">
            {footerLinks.legal.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                className="text-xs sm:text-sm text-white/50 hover:text-white transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
