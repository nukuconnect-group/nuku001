import { Link } from "react-router-dom";
import { Facebook, Twitter, Instagram, Linkedin, Mail, Phone, MapPin, Smartphone } from "lucide-react";
import nukuLogoWhite from "@/assets/nukuconnect-logo-white.png";
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
      { label: "FAQ", href: "/faq" },
    ],
    company: [
      { label: "À propos", href: "/about" },
      { label: "Contact", href: "/contact" },
      { label: "Partenaires", href: "/partners" },
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
    <footer className="text-white" style={{ background: "linear-gradient(135deg, #1c98ed 0%, #006b00 100%)" }}>
      {/* App Download Section */}
      <div className="border-b border-white/15">
        <div className="container mx-auto px-4 py-6 sm:py-8">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-4 sm:gap-6">
            <div className="flex items-center gap-3 sm:gap-4 text-center lg:text-left">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-primary flex items-center justify-center">
                <Smartphone className="w-6 h-6 sm:w-7 sm:h-7 text-primary-foreground" />
              </div>
              <div>
                <h3 className="font-heading text-lg sm:text-xl font-bold">Téléchargez l'application</h3>
                <p className="text-primary-foreground/70 text-xs sm:text-sm">
                  Accédez à NUKUCONNECT partout, tout le temps.
                </p>
              </div>
            </div>
            <div className="flex flex-row gap-3 sm:gap-4 w-full sm:w-auto justify-center">
              <a href="#" className="flex-shrink-0">
                <img src={badgeGooglePlay} alt="Disponible sur Google Play" className="h-10 sm:h-12 w-auto object-contain" />
              </a>
              <a href="#" className="flex-shrink-0">
                <img src={badgeAppStore} alt="Télécharger dans l'App Store" className="h-10 sm:h-12 w-auto object-contain" />
              </a>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 sm:py-12 lg:py-16">
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-6 sm:gap-8 lg:gap-12">
          {/* Brand - Logo only, no text name */}
          <div className="col-span-2 sm:col-span-2 lg:col-span-1">
            <Link to="/" className="inline-block mb-4">
              <img src={nukuLogoWhite} alt="NUKUCONNECT" className="h-14 sm:h-12 object-contain" />
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
            <h4 className="font-heading font-semibold text-sm sm:text-base mb-3 sm:mb-4">Plateforme</h4>
            <ul className="space-y-2 sm:space-y-3">
              {footerLinks.platform.map((link) => (
                <li key={link.href}>
                  <Link to={link.href} className="text-xs sm:text-sm text-primary-foreground/70 hover:text-primary transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-heading font-semibold text-sm sm:text-base mb-3 sm:mb-4">Ressources</h4>
            <ul className="space-y-2 sm:space-y-3">
              {footerLinks.resources.map((link) => (
                <li key={link.href}>
                  <Link to={link.href} className="text-xs sm:text-sm text-primary-foreground/70 hover:text-primary transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-heading font-semibold text-sm sm:text-base mb-3 sm:mb-4">Entreprise</h4>
            <ul className="space-y-2 sm:space-y-3">
              {footerLinks.company.map((link) => (
                <li key={link.href}>
                  <Link to={link.href} className="text-xs sm:text-sm text-primary-foreground/70 hover:text-primary transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="col-span-2 sm:col-span-1">
            <h4 className="font-heading font-semibold text-sm sm:text-base mb-3 sm:mb-4">Contact</h4>
            <ul className="space-y-2 sm:space-y-3">
              <li className="flex items-center gap-2 text-xs sm:text-sm text-primary-foreground/70">
                <Mail className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">contact@nukuconnect.com</span>
              </li>
              <li className="flex items-center gap-2 text-xs sm:text-sm text-primary-foreground/70">
                <Phone className="w-4 h-4 flex-shrink-0" />
                +228 90 00 00 00
              </li>
              <li className="flex items-start gap-2 text-xs sm:text-sm text-primary-foreground/70">
                <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                Lomé, Togo
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-8 sm:mt-12 pt-6 sm:pt-8 border-t border-primary-foreground/10 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-xs sm:text-sm text-primary-foreground/50 text-center md:text-left">
            © 2025 NUKUCONNECT. Tous droits réservés.
          </p>
          <div className="flex flex-wrap justify-center gap-4 sm:gap-6">
            {footerLinks.legal.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                className="text-xs sm:text-sm text-primary-foreground/50 hover:text-primary transition-colors"
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
