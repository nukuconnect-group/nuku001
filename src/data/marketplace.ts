export interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  originalPrice?: number;
  discount?: number;
  promoType?: "promo" | "flash" | "soldes" | "nouveau";
  unit: string;
  quantity: number;
  location: string;
  producer: {
    id?: string;
    name: string;
    avatar: string;
    rating: number;
    verified: boolean;
    bio?: string;
    phone?: string;
    joinedDate?: string;
    totalProducts?: number;
    totalSales?: number;
  };
  images: string[];
  image: string;
  description: string;
  isOrganic: boolean;
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  count: number;
}

export const categories: Category[] = [
  { id: "all", name: "Tous", icon: "Grid3X3", count: 250 },
  { id: "agriculture", name: "Agriculture", icon: "Tractor", count: 85 },
  { id: "cereales", name: "Céréales", icon: "Wheat", count: 45 },
  { id: "legumes", name: "Légumes", icon: "Carrot", count: 38 },
  { id: "fruits", name: "Fruits", icon: "Apple", count: 28 },
  { id: "tubercules", name: "Tubercules", icon: "CircleDot", count: 22 },
  { id: "elevage", name: "Élevage", icon: "Beef", count: 35 },
  { id: "volailles", name: "Aviculture", icon: "Bird", count: 18 },
  { id: "pisciculture", name: "Pisciculture", icon: "Fish", count: 15 },
  { id: "aquaculture", name: "Aquaculture", icon: "Droplets", count: 12 },
  { id: "agribusiness", name: "Agribusiness", icon: "Factory", count: 20 },
];

export const products: Product[] = [
  {
    id: "1",
    name: "Maïs Jaune Premium",
    category: "cereales",
    price: 135000,
    originalPrice: 150000,
    discount: 10,
    promoType: "promo",
    unit: "tonne",
    quantity: 50,
    location: "Kara, Togo",
    producer: {
      id: "p1",
      name: "Kofi Mensah",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100",
      rating: 4.8,
      verified: true,
      bio: "Producteur de céréales depuis 15 ans. Spécialisé en maïs et soja bio.",
      phone: "+228 90 12 34 56",
      joinedDate: "2022-03-15",
      totalProducts: 12,
      totalSales: 156,
    },
    images: [
      "https://images.unsplash.com/photo-1551754655-cd27e38d2076?w=800&q=80",
      "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=800&q=80",
      "https://images.unsplash.com/photo-1597916829826-02e5bb4a54a0?w=800&q=80",
    ],
    image: "https://images.unsplash.com/photo-1551754655-cd27e38d2076?w=800&q=80",
    description: "Maïs jaune de qualité supérieure, séché et prêt pour la transformation.",
    isOrganic: true,
    createdAt: "2025-01-28",
  },
  {
    id: "2",
    name: "Tomates Fraîches",
    category: "legumes",
    price: 2000,
    originalPrice: 2500,
    discount: 20,
    promoType: "flash",
    unit: "kg",
    quantity: 500,
    location: "Lomé, Togo",
    producer: {
      id: "p2",
      name: "Ama Koffi",
      avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100",
      rating: 4.9,
      verified: true,
      bio: "Maraîchère passionnée, je cultive des légumes frais en agriculture raisonnée.",
      phone: "+228 91 23 45 67",
      joinedDate: "2021-08-20",
      totalProducts: 8,
      totalSales: 234,
    },
    images: [
      "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=800&q=80",
      "https://images.unsplash.com/photo-1558818498-28c1e002b655?w=800&q=80",
      "https://images.unsplash.com/photo-1546470427-e26264be0b0c?w=800&q=80",
    ],
    image: "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=800&q=80",
    description: "Tomates fraîches cultivées localement, idéales pour la sauce.",
    isOrganic: false,
    createdAt: "2025-01-27",
  },
  {
    id: "3",
    name: "Ignames Blancs",
    category: "tubercules",
    price: 3000,
    unit: "kg",
    quantity: 200,
    location: "Atakpamé, Togo",
    producer: {
      id: "p3",
      name: "Yao Agbeko",
      avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100",
      rating: 4.7,
      verified: true,
      bio: "Cultivateur d'ignames depuis 20 ans dans la région des plateaux.",
      phone: "+228 92 34 56 78",
      joinedDate: "2020-05-10",
      totalProducts: 5,
      totalSales: 89,
    },
    images: [
      "https://images.unsplash.com/photo-1590165482129-1b8b27698780?w=800&q=80",
    ],
    image: "https://images.unsplash.com/photo-1590165482129-1b8b27698780?w=800&q=80",
    description: "Ignames de première qualité, récoltés cette saison.",
    isOrganic: true,
    createdAt: "2025-01-26",
  },
  {
    id: "4",
    name: "Mangues Kent",
    category: "fruits",
    price: 1500,
    originalPrice: 1800,
    discount: 17,
    promoType: "soldes",
    unit: "kg",
    quantity: 1000,
    location: "Sokodé, Togo",
    producer: {
      id: "p4",
      name: "Akossiwa Dosseh",
      avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100",
      rating: 4.6,
      verified: false,
      bio: "Productrice de mangues et fruits tropicaux.",
      phone: "+228 93 45 67 89",
      joinedDate: "2023-01-25",
      totalProducts: 3,
      totalSales: 45,
    },
    images: [
      "https://images.unsplash.com/photo-1553279768-865429fa0078?w=800&q=80",
      "https://images.unsplash.com/photo-1601493700631-2b16ec4b4716?w=800&q=80",
    ],
    image: "https://images.unsplash.com/photo-1553279768-865429fa0078?w=800&q=80",
    description: "Mangues Kent sucrées et juteuses, parfaites pour l'exportation.",
    isOrganic: false,
    createdAt: "2025-01-25",
  },
  {
    id: "5",
    name: "Riz Paddy Local",
    category: "cereales",
    price: 180000,
    promoType: "nouveau",
    unit: "tonne",
    quantity: 30,
    location: "Dapaong, Togo",
    producer: {
      id: "p5",
      name: "Komlan Assou",
      avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100",
      rating: 4.5,
      verified: true,
      bio: "Riziculteur expérimenté dans les bas-fonds.",
      phone: "+228 94 56 78 90",
      joinedDate: "2021-11-30",
      totalProducts: 4,
      totalSales: 67,
    },
    images: [
      "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400",
    ],
    image: "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400",
    description: "Riz paddy cultivé dans les bas-fonds, excellente qualité.",
    isOrganic: true,
    createdAt: "2025-01-24",
  },
  {
    id: "6",
    name: "Poulets Fermiers",
    category: "volailles",
    price: 4000,
    originalPrice: 4500,
    discount: 11,
    promoType: "promo",
    unit: "unité",
    quantity: 100,
    location: "Tsévié, Togo",
    producer: {
      id: "p6",
      name: "Essi Amouzou",
      avatar: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=100",
      rating: 4.9,
      verified: true,
      bio: "Éleveuse de volailles en plein air.",
      phone: "+228 95 67 89 01",
      joinedDate: "2020-09-12",
      totalProducts: 6,
      totalSales: 312,
    },
    images: [
      "https://images.unsplash.com/photo-1548550023-2bdb3c5beed7?w=400",
      "https://images.unsplash.com/photo-1569121555753-2a01f1c16b16?w=400",
    ],
    image: "https://images.unsplash.com/photo-1548550023-2bdb3c5beed7?w=400",
    description: "Poulets élevés en plein air, alimentation naturelle garantie.",
    isOrganic: true,
    createdAt: "2025-01-23",
  },
  {
    id: "7",
    name: "Manioc Frais",
    category: "tubercules",
    price: 1200,
    unit: "kg",
    quantity: 800,
    location: "Kpalimé, Togo",
    producer: {
      id: "p7",
      name: "Foli Agbodjan",
      avatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=100",
      rating: 4.4,
      verified: false,
      bio: "Producteur de tubercules.",
      phone: "+228 96 78 90 12",
      joinedDate: "2022-07-08",
      totalProducts: 2,
      totalSales: 28,
    },
    images: [
      "https://images.unsplash.com/photo-1598512752271-33f913a5af13?w=400",
    ],
    image: "https://images.unsplash.com/photo-1598512752271-33f913a5af13?w=400",
    description: "Manioc frais, parfait pour le gari ou le fufu.",
    isOrganic: false,
    createdAt: "2025-01-22",
  },
  {
    id: "8",
    name: "Ananas Pain de Sucre",
    category: "fruits",
    price: 600,
    originalPrice: 800,
    discount: 25,
    promoType: "flash",
    unit: "unité",
    quantity: 500,
    location: "Notsé, Togo",
    producer: {
      id: "p8",
      name: "Ablavi Koudjo",
      avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100",
      rating: 4.8,
      verified: true,
      bio: "Spécialiste de l'ananas bio depuis 10 ans.",
      phone: "+228 97 89 01 23",
      joinedDate: "2021-02-14",
      totalProducts: 3,
      totalSales: 198,
    },
    images: [
      "https://images.unsplash.com/photo-1550258987-190a2d41a8ba?w=400",
      "https://images.unsplash.com/photo-1589606663923-283bbd309229?w=400",
      "https://images.unsplash.com/photo-1587883012610-e3df17d41270?w=400",
    ],
    image: "https://images.unsplash.com/photo-1550258987-190a2d41a8ba?w=400",
    description: "Ananas très sucré, cultivé sans pesticides.",
    isOrganic: true,
    createdAt: "2025-01-21",
  },
  {
    id: "9",
    name: "Tilapia Frais",
    category: "pisciculture",
    price: 3500,
    unit: "kg",
    quantity: 150,
    location: "Aného, Togo",
    producer: {
      id: "p9",
      name: "Koku Agbemey",
      avatar: "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=100",
      rating: 4.6,
      verified: true,
      bio: "Pisciculteur spécialisé en tilapia et carpes.",
      phone: "+228 98 90 12 34",
      joinedDate: "2022-04-20",
      totalProducts: 4,
      totalSales: 78,
    },
    images: [
      "https://images.unsplash.com/photo-1544943910-4c1dc44aab44?w=400",
    ],
    image: "https://images.unsplash.com/photo-1544943910-4c1dc44aab44?w=400",
    description: "Tilapia frais élevé en eau douce, qualité premium.",
    isOrganic: false,
    createdAt: "2025-01-20",
  },
  {
    id: "10",
    name: "Huile de Palme Rouge",
    category: "agribusiness",
    price: 2800,
    originalPrice: 3200,
    discount: 12,
    promoType: "promo",
    unit: "litre",
    quantity: 300,
    location: "Kévé, Togo",
    producer: {
      id: "p10",
      name: "Afi Mensah",
      avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=100",
      rating: 4.7,
      verified: true,
      bio: "Transformation artisanale d'huile de palme rouge 100% naturelle.",
      phone: "+228 99 01 23 45",
      joinedDate: "2020-12-01",
      totalProducts: 5,
      totalSales: 256,
    },
    images: [
      "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=400",
    ],
    image: "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=400",
    description: "Huile de palme rouge artisanale, non raffinée, riche en vitamines.",
    isOrganic: true,
    createdAt: "2025-01-19",
  },
];
