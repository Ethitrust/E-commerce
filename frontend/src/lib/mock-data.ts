// Centralized mock marketplace data. All data is plain objects so it can
// later be swapped for a real API by replacing the data-fetching helpers.

export type Role = "buyer" | "seller" | "admin";

export interface Seller {
  id: string;
  name: string;
  handle: string;
  avatar: string;
  rating: number;
  reviews: number;
  sales: number;
  joined: string;
  location: string;
  banner: string;
  bio: string;
  verified: boolean;
}

export interface Product {
  id: string;
  title: string;
  slug: string;
  price: number;
  originalPrice?: number;
  currency: string;
  rating: number;
  reviews: number;
  sold: number;
  stock: number;
  image: string;
  gallery: string[];
  category: string;
  categorySlug: string;
  sellerId: string;
  shipping: string;
  badge?: "new" | "hot" | "deal" | "bid";
  bidCount?: number;
  bidEndsAt?: string;
  description: string;
  specs: { label: string; value: string }[];
  tags: string[];
  /** Provided by catalog API for cards (avoids lookup by sellerId). */
  seller?: {
    id: string;
    name: string;
    handle: string;
    avatar: string;
  };
}

export interface Category {
  slug: string;
  name: string;
  icon: string;
  count: number;
}

export const categories: Category[] = [
  { slug: "electronics", name: "Electronics", icon: "Smartphone", count: 12480 },
  { slug: "fashion", name: "Fashion", icon: "Shirt", count: 8932 },
  { slug: "home", name: "Home & Garden", icon: "Home", count: 6210 },
  { slug: "audio", name: "Audio & Music", icon: "Headphones", count: 3148 },
  { slug: "watches", name: "Watches", icon: "Watch", count: 2104 },
  { slug: "cameras", name: "Cameras", icon: "Camera", count: 1890 },
  { slug: "collectibles", name: "Collectibles", icon: "Gem", count: 5402 },
  { slug: "sports", name: "Sports", icon: "Dumbbell", count: 4321 },
];

const img = (q: string, seed: number) =>
  `https://images.unsplash.com/photo-${seed}?auto=format&fit=crop&w=900&q=80&ixlib=rb-4.0.3&q=${encodeURIComponent(q)}`;

// Curated stable Unsplash photo IDs for product imagery.
const photos = [
  "1505740420928-5e560c06d30e", // headphones
  "1542291026-7eec264c27ff", // sneakers
  "1523275335684-37898b6baf30", // watch
  "1606983340126-99ab4feaa64a", // camera
  "1517336714731-489689fd1ca8", // laptop
  "1572569511254-d8f925fe2cbb", // sofa
  "1546868871-7041f2a55e12", // smartwatch
  "1593359677879-a4bb92f829d1", // sneakers blue
  "1511707171634-5f897ff02aa9", // phone
  "1542728928-1413d1894ed1", // bag
  "1592078615290-033ee584e267", // monitor
  "1526045478516-99145907023c", // perfume
  "1519861531473-9200262188bf", // tv
  "1541643600914-78b084683601", // turntable
  "1544947950-fa07a98d237f", // book
];

export const sellers: Seller[] = [
  {
    id: "s1",
    name: "Apex Gear",
    handle: "apexgear",
    avatar:
      "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80",
    rating: 4.9,
    reviews: 2840,
    sales: 18420,
    joined: "2019",
    location: "Berlin, DE",
    banner:
      "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1600&q=80",
    bio: "Curated electronics and audio gear from independent brands.",
    verified: true,
  },
  {
    id: "s2",
    name: "Nordic Studio",
    handle: "nordicstudio",
    avatar:
      "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=200&q=80",
    rating: 4.8,
    reviews: 1290,
    sales: 7820,
    joined: "2020",
    location: "Stockholm, SE",
    banner:
      "https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?auto=format&fit=crop&w=1600&q=80",
    bio: "Minimal home goods and design objects.",
    verified: true,
  },
  {
    id: "s3",
    name: "TimeKeepers",
    handle: "timekeepers",
    avatar:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80",
    rating: 5.0,
    reviews: 980,
    sales: 4120,
    joined: "2018",
    location: "Geneva, CH",
    banner:
      "https://images.unsplash.com/photo-1509048191080-d2984bad6ae5?auto=format&fit=crop&w=1600&q=80",
    bio: "Vintage and modern horology specialists.",
    verified: true,
  },
  {
    id: "s4",
    name: "Visual Pro",
    handle: "visualpro",
    avatar:
      "https://images.unsplash.com/photo-1607746882042-944635dfe10e?auto=format&fit=crop&w=200&q=80",
    rating: 4.7,
    reviews: 612,
    sales: 2104,
    joined: "2021",
    location: "Tokyo, JP",
    banner:
      "https://images.unsplash.com/photo-1452587925148-ce544e77e70d?auto=format&fit=crop&w=1600&q=80",
    bio: "Camera bodies, lenses and lighting for working photographers.",
    verified: false,
  },
];

const titles = [
  "Studio Pro Headphones MK II",
  "Lightweight Performance Sneakers",
  "Heritage Chronograph Watch",
  "Mirrorless 4K Camera Body",
  "Ultra-Thin Productivity Laptop",
  "Modular Velvet Lounge Sofa",
  "Titanium Smart Fitness Watch",
  "Court Edition Trainers",
  "Edge Display Smartphone X",
  "Leather Weekender Bag",
  '27" 5K Color-Calibrated Monitor',
  "Maison No.5 Eau de Parfum",
  'OLED Cinematic 65" TV',
  "Belt-Drive Audiophile Turntable",
  "Hardcover Design Anthology",
];

const cats = [
  ["audio", "Audio & Music"],
  ["fashion", "Fashion"],
  ["watches", "Watches"],
  ["cameras", "Cameras"],
  ["electronics", "Electronics"],
  ["home", "Home & Garden"],
  ["watches", "Watches"],
  ["fashion", "Fashion"],
  ["electronics", "Electronics"],
  ["fashion", "Fashion"],
  ["electronics", "Electronics"],
  ["collectibles", "Collectibles"],
  ["electronics", "Electronics"],
  ["audio", "Audio & Music"],
  ["collectibles", "Collectibles"],
];

const badges: (Product["badge"] | undefined)[] = [
  "new",
  undefined,
  "hot",
  "bid",
  undefined,
  "deal",
  "new",
  undefined,
  "hot",
  undefined,
  "deal",
  undefined,
  "hot",
  "bid",
  "new",
];

export const products: Product[] = titles.map((title, i) => {
  const seed = photos[i % photos.length];
  const image = `https://images.unsplash.com/photo-${seed}?auto=format&fit=crop&w=900&q=80`;
  const price =
    [349, 129, 1280, 1899, 1599, 980, 449, 159, 999, 289, 749, 145, 2399, 890, 65][i] ?? 199;
  const original = i % 3 === 0 ? Math.round(price * 1.18) : undefined;
  return {
    id: `p${i + 1}`,
    title,
    slug: title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, ""),
    price,
    originalPrice: original,
    currency: "USD",
    rating: 4 + ((i * 7) % 10) / 10,
    reviews: 50 + ((i * 73) % 900),
    sold: 100 + ((i * 41) % 4000),
    stock: 5 + ((i * 13) % 60),
    image,
    gallery: [
      image,
      `https://images.unsplash.com/photo-${photos[(i + 1) % photos.length]}?auto=format&fit=crop&w=900&q=80`,
      `https://images.unsplash.com/photo-${photos[(i + 2) % photos.length]}?auto=format&fit=crop&w=900&q=80`,
      `https://images.unsplash.com/photo-${photos[(i + 3) % photos.length]}?auto=format&fit=crop&w=900&q=80`,
    ],
    category: cats[i][1],
    categorySlug: cats[i][0],
    sellerId: sellers[i % sellers.length].id,
    shipping: i % 2 === 0 ? "Free shipping" : "$12 shipping",
    badge: badges[i],
    bidCount: badges[i] === "bid" ? 12 + (i % 30) : undefined,
    bidEndsAt: badges[i] === "bid" ? "04h 22m" : undefined,
    description:
      "Premium-quality piece, fully tested and certified by our verification team. Comes with original packaging and one-year marketplace warranty. Ships from a trusted seller.",
    specs: [
      { label: "Condition", value: i % 4 === 0 ? "Used - Like New" : "Brand New" },
      { label: "Brand", value: ["Apex", "Nordic", "TimeKeep", "Visual"][i % 4] },
      { label: "Model", value: `MK-${100 + i}` },
      { label: "Warranty", value: "12 months" },
      { label: "Returns", value: "30-day free returns" },
    ],
    tags: ["trending", "verified", i % 2 ? "free-shipping" : "auction"],
  };
});

export const getProduct = (slug: string) => products.find((p) => p.slug === slug);
export const getSeller = (id: string) => sellers.find((s) => s.id === id);
export const getProductsBySeller = (id: string) => products.filter((p) => p.sellerId === id);

// Suppress unused helper warning
void img;
