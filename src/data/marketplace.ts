export interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  unit: string;
  quantity: number;
  location: string;
  producer: {
    name: string;
    avatar: string;
    rating: number;
    verified: boolean;
  };
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
    price: 150000,
    unit: "tonne",
    quantity: 50,
    location: "Kara, Togo",
    producer: {
      name: "Kofi Mensah",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100",
      rating: 4.8,
      verified: true,
    },
    image: "https://images.unsplash.com/photo-1551754655-cd27e38d2076?w=400",
    description: "Maïs jaune de qualité supérieure, séché et prêt pour la transformation.",
    isOrganic: true,
    createdAt: "2025-01-28",
  },
  {
    id: "2",
    name: "Tomates Fraîches",
    category: "legumes",
    price: 2500,
    unit: "kg",
    quantity: 500,
    location: "Lomé, Togo",
    producer: {
      name: "Ama Koffi",
      avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100",
      rating: 4.9,
      verified: true,
    },
    image: "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=400",
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
      name: "Yao Agbeko",
      avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100",
      rating: 4.7,
      verified: true,
    },
    image: "https://images.unsplash.com/photo-1590165482129-1b8b27698780?w=400",
    description: "Ignames de première qualité, récoltés cette saison.",
    isOrganic: true,
    createdAt: "2025-01-26",
  },
  {
    id: "4",
    name: "Mangues Kent",
    category: "fruits",
    price: 1800,
    unit: "kg",
    quantity: 1000,
    location: "Sokodé, Togo",
    producer: {
      name: "Akossiwa Dosseh",
      avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100",
      rating: 4.6,
      verified: false,
    },
    image: "https://images.unsplash.com/photo-1553279768-865429fa0078?w=400",
    description: "Mangues Kent sucrées et juteuses, parfaites pour l'exportation.",
    isOrganic: false,
    createdAt: "2025-01-25",
  },
  {
    id: "5",
    name: "Riz Paddy Local",
    category: "cereales",
    price: 180000,
    unit: "tonne",
    quantity: 30,
    location: "Dapaong, Togo",
    producer: {
      name: "Komlan Assou",
      avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100",
      rating: 4.5,
      verified: true,
    },
    image: "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400",
    description: "Riz paddy cultivé dans les bas-fonds, excellente qualité.",
    isOrganic: true,
    createdAt: "2025-01-24",
  },
  {
    id: "6",
    name: "Poulets Fermiers",
    category: "volailles",
    price: 4500,
    unit: "unité",
    quantity: 100,
    location: "Tsévié, Togo",
    producer: {
      name: "Essi Amouzou",
      avatar: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=100",
      rating: 4.9,
      verified: true,
    },
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
      name: "Foli Agbodjan",
      avatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=100",
      rating: 4.4,
      verified: false,
    },
    image: "https://images.unsplash.com/photo-1598512752271-33f913a5af13?w=400",
    description: "Manioc frais, parfait pour le gari ou le fufu.",
    isOrganic: false,
    createdAt: "2025-01-22",
  },
  {
    id: "8",
    name: "Ananas Pain de Sucre",
    category: "fruits",
    price: 800,
    unit: "unité",
    quantity: 500,
    location: "Notsé, Togo",
    producer: {
      name: "Ablavi Koudjo",
      avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100",
      rating: 4.8,
      verified: true,
    },
    image: "https://images.unsplash.com/photo-1550258987-190a2d41a8ba?w=400",
    description: "Ananas très sucré, cultivé sans pesticides.",
    isOrganic: true,
    createdAt: "2025-01-21",
  },
];
