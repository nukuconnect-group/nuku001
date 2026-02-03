import { Link } from "react-router-dom";
import { Facebook, Twitter, Instagram, Linkedin, Mail, Phone, MapPin, Smartphone } from "lucide-react";
import nukuLogo from "@/assets/nukuconnect-logo.png";

const Footer = () => {
  const footerLinks = {
    platform: [
      { label: "Marketplace", href: "/marketplace" },
      { label: "Producteurs", href: "/producteurs" },
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
    <footer className="bg-foreground text-primary-foreground">
      {/* App Download Section */}
      <div className="border-b border-primary-foreground/10">
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
            <div className="flex flex-row gap-2 sm:gap-3 w-full sm:w-auto justify-center">
              {/* Google Play Store */}
              <a
                href="#"
                className="inline-flex items-center gap-2 sm:gap-3 bg-primary-foreground/10 hover:bg-primary-foreground/20 transition-colors rounded-xl px-3 sm:px-4 py-2 sm:py-2.5 flex-1 sm:flex-none justify-center"
              >
                <svg viewBox="0 0 24 24" className="w-5 h-5 sm:w-7 sm:h-7 fill-current flex-shrink-0">
                  <path d="M3.609 1.814L13.792 12 3.61 22.186a1.5 1.5 0 0 1-.109-.5V2.314c0-.177.036-.346.108-.5zm.853-.68L14.9 11.293l-2.893 2.893L4.462 1.134zM15.5 11.707l3.058 3.058-11.266 6.486 8.208-9.544zm3.058-6.472L7.292 11.72l2.893 2.893 9.415-5.415-1.042-3.963zM5.406.818l7.55 4.344-2.893 2.893L5.406.818z"/>
                </svg>
                <div className="text-left">
                  <div className="text-[8px] sm:text-[10px] uppercase tracking-wider opacity-70">Télécharger sur</div>
                  <div className="font-semibold text-xs sm:text-sm">Google Play</div>
                </div>
              </a>
              {/* Apple App Store */}
              <a
                href="#"
                className="inline-flex items-center gap-2 sm:gap-3 bg-primary-foreground/10 hover:bg-primary-foreground/20 transition-colors rounded-xl px-3 sm:px-4 py-2 sm:py-2.5 flex-1 sm:flex-none justify-center"
              >
                <svg viewBox="0 0 24 24" className="w-5 h-5 sm:w-7 sm:h-7 fill-current flex-shrink-0">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                </svg>
                <div className="text-left">
                  <div className="text-[8px] sm:text-[10px] uppercase tracking-wider opacity-70">Télécharger sur</div>
                  <div className="font-semibold text-xs sm:text-sm">App Store</div>
                </div>
              </a>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 sm:py-12 lg:py-16">
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-6 sm:gap-8 lg:gap-12">
          {/* Brand */}
          <div className="col-span-2 sm:col-span-2 lg:col-span-1">
            <Link to="/" className="flex items-center gap-2 mb-4">
              <img src={nukuLogo} alt="NUKUCONNECT" className="w-10 h-10 object-contain" />
              <span className="font-heading font-bold text-lg sm:text-xl">
                NUKU<span className="text-primary">CONNECT</span>
              </span>
            </Link>
            <p className="text-primary-foreground/70 text-xs sm:text-sm mb-4 sm:mb-6">
              La marketplace agricole intelligente qui connecte producteurs et acheteurs.
            </p>
            <div className="flex gap-2 sm:gap-3">
              {socialLinks.map((social, index) => (
                <a
                  key={index}
                  href={social.href}
                  aria-label={social.label}
                  className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-primary-foreground/10 flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-colors"
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
