/**
 * Country list with emoji flags & ISO codes, used by the signup form
 * (buyer / autres comptes) and any other picker that needs "country + flag".
 *
 * Order: francophone West/Central Africa first (main audience), then the
 * rest of the world alphabetically — the picker's search bar makes it easy
 * to jump anywhere.
 */
export interface Country {
  name: string;
  flag: string;
  code: string; // ISO 3166-1 alpha-2
  dial: string; // international dialing code (e.g. "228")
}

export const COUNTRIES: Country[] = [
  { name: "Togo", flag: "🇹🇬", code: "TG", dial: "228" },
  { name: "Bénin", flag: "🇧🇯", code: "BJ", dial: "229" },
  { name: "Ghana", flag: "🇬🇭", code: "GH", dial: "233" },
  { name: "Côte d'Ivoire", flag: "🇨🇮", code: "CI", dial: "225" },
  { name: "Burkina Faso", flag: "🇧🇫", code: "BF", dial: "226" },
  { name: "Niger", flag: "🇳🇪", code: "NE", dial: "227" },
  { name: "Mali", flag: "🇲🇱", code: "ML", dial: "223" },
  { name: "Sénégal", flag: "🇸🇳", code: "SN", dial: "221" },
  { name: "Guinée", flag: "🇬🇳", code: "GN", dial: "224" },
  { name: "Cameroun", flag: "🇨🇲", code: "CM", dial: "237" },
  { name: "Nigeria", flag: "🇳🇬", code: "NG", dial: "234" },
  { name: "RDC", flag: "🇨🇩", code: "CD", dial: "243" },
  { name: "Congo", flag: "🇨🇬", code: "CG", dial: "242" },
  { name: "Gabon", flag: "🇬🇦", code: "GA", dial: "241" },
  { name: "Tchad", flag: "🇹🇩", code: "TD", dial: "235" },
  { name: "Mauritanie", flag: "🇲🇷", code: "MR", dial: "222" },
  { name: "Gambie", flag: "🇬🇲", code: "GM", dial: "220" },
  { name: "Sierra Leone", flag: "🇸🇱", code: "SL", dial: "232" },
  { name: "Liberia", flag: "🇱🇷", code: "LR", dial: "231" },
  { name: "Cap-Vert", flag: "🇨🇻", code: "CV", dial: "238" },
  { name: "Guinée-Bissau", flag: "🇬🇼", code: "GW", dial: "245" },
  { name: "Guinée équatoriale", flag: "🇬🇶", code: "GQ", dial: "240" },
  { name: "São Tomé-et-Príncipe", flag: "🇸🇹", code: "ST", dial: "239" },
  { name: "Centrafrique", flag: "🇨🇫", code: "CF", dial: "236" },
  // Reste du monde (ordre alphabétique)
  { name: "Afrique du Sud", flag: "🇿🇦", code: "ZA", dial: "27" },
  { name: "Algérie", flag: "🇩🇿", code: "DZ", dial: "213" },
  { name: "Allemagne", flag: "🇩🇪", code: "DE", dial: "49" },
  { name: "Angola", flag: "🇦🇴", code: "AO", dial: "244" },
  { name: "Arabie saoudite", flag: "🇸🇦", code: "SA", dial: "966" },
  { name: "Argentine", flag: "🇦🇷", code: "AR", dial: "54" },
  { name: "Australie", flag: "🇦🇺", code: "AU", dial: "61" },
  { name: "Belgique", flag: "🇧🇪", code: "BE", dial: "32" },
  { name: "Brésil", flag: "🇧🇷", code: "BR", dial: "55" },
  { name: "Burundi", flag: "🇧🇮", code: "BI", dial: "257" },
  { name: "Canada", flag: "🇨🇦", code: "CA", dial: "1" },
  { name: "Chine", flag: "🇨🇳", code: "CN", dial: "86" },
  { name: "Comores", flag: "🇰🇲", code: "KM", dial: "269" },
  { name: "Djibouti", flag: "🇩🇯", code: "DJ", dial: "253" },
  { name: "Égypte", flag: "🇪🇬", code: "EG", dial: "20" },
  { name: "Émirats arabes unis", flag: "🇦🇪", code: "AE", dial: "971" },
  { name: "Érythrée", flag: "🇪🇷", code: "ER", dial: "291" },
  { name: "Espagne", flag: "🇪🇸", code: "ES", dial: "34" },
  { name: "États-Unis", flag: "🇺🇸", code: "US", dial: "1" },
  { name: "Éthiopie", flag: "🇪🇹", code: "ET", dial: "251" },
  { name: "France", flag: "🇫🇷", code: "FR", dial: "33" },
  { name: "Inde", flag: "🇮🇳", code: "IN", dial: "91" },
  { name: "Italie", flag: "🇮🇹", code: "IT", dial: "39" },
  { name: "Japon", flag: "🇯🇵", code: "JP", dial: "81" },
  { name: "Kenya", flag: "🇰🇪", code: "KE", dial: "254" },
  { name: "Libye", flag: "🇱🇾", code: "LY", dial: "218" },
  { name: "Madagascar", flag: "🇲🇬", code: "MG", dial: "261" },
  { name: "Malawi", flag: "🇲🇼", code: "MW", dial: "265" },
  { name: "Maroc", flag: "🇲🇦", code: "MA", dial: "212" },
  { name: "Maurice", flag: "🇲🇺", code: "MU", dial: "230" },
  { name: "Mozambique", flag: "🇲🇿", code: "MZ", dial: "258" },
  { name: "Namibie", flag: "🇳🇦", code: "NA", dial: "264" },
  { name: "Ouganda", flag: "🇺🇬", code: "UG", dial: "256" },
  { name: "Pays-Bas", flag: "🇳🇱", code: "NL", dial: "31" },
  { name: "Portugal", flag: "🇵🇹", code: "PT", dial: "351" },
  { name: "Royaume-Uni", flag: "🇬🇧", code: "GB", dial: "44" },
  { name: "Rwanda", flag: "🇷🇼", code: "RW", dial: "250" },
  { name: "Seychelles", flag: "🇸🇨", code: "SC", dial: "248" },
  { name: "Somalie", flag: "🇸🇴", code: "SO", dial: "252" },
  { name: "Soudan", flag: "🇸🇩", code: "SD", dial: "249" },
  { name: "Soudan du Sud", flag: "🇸🇸", code: "SS", dial: "211" },
  { name: "Suisse", flag: "🇨🇭", code: "CH", dial: "41" },
  { name: "Tanzanie", flag: "🇹🇿", code: "TZ", dial: "255" },
  { name: "Tunisie", flag: "🇹🇳", code: "TN", dial: "216" },
  { name: "Turquie", flag: "🇹🇷", code: "TR", dial: "90" },
  { name: "Zambie", flag: "🇿🇲", code: "ZM", dial: "260" },
  { name: "Zimbabwe", flag: "🇿🇼", code: "ZW", dial: "263" },
];

export const getCountryByName = (name: string): Country | undefined =>
  COUNTRIES.find((c) => c.name === name);
