/**
 * Static catalog fixtures aligned with `frontend/src/lib/mock-data.ts` (Phase 2 seed).
 */
const photos = [
  "1505740420928-5e560c06d30e",
  "1542291026-7eec264c27ff",
  "1523275335684-37898b6baf30",
  "1606983340126-99ab4feaa64a",
  "1517336714731-489689fd1ca8",
  "1572569511254-d8f925fe2cbb",
  "1546868871-7041f2a55e12",
  "1593359677879-a4bb92f829d1",
  "1511707171634-5f897ff02aa9",
  "1542728928-1413d1894ed1",
  "1592078615290-033ee584e267",
  "1526045478516-99145907023c",
  "1519861531473-9200262188bf",
  "1541643600914-78b084683601",
  "1544947950-fa07a98d237f",
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
  "27\" 5K Color-Calibrated Monitor",
  "Maison No.5 Eau de Parfum",
  "OLED Cinematic 65\" TV",
  "Belt-Drive Audiophile Turntable",
  "Hardcover Design Anthology",
];

const cats: [string, string][] = [
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

const badges: Array<"new" | "hot" | "deal" | "bid" | undefined> = [
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

const prices = [349, 129, 1280, 1899, 1599, 980, 449, 159, 999, 289, 749, 145, 2399, 890, 65];

export const SELLER_HANDLE_ROTATION = ["apexgear", "nordicstudio", "timekeepers", "visualpro"] as const;

export const MOCK_CATEGORIES = [
  { slug: "electronics", name: "Electronics", icon: "Smartphone" },
  { slug: "fashion", name: "Fashion", icon: "Shirt" },
  { slug: "home", name: "Home & Garden", icon: "Home" },
  { slug: "audio", name: "Audio & Music", icon: "Headphones" },
  { slug: "watches", name: "Watches", icon: "Watch" },
  { slug: "cameras", name: "Cameras", icon: "Camera" },
  { slug: "collectibles", name: "Collectibles", icon: "Gem" },
  { slug: "sports", name: "Sports", icon: "Dumbbell" },
] as const;

export type ExtraSellerFixture = {
  handle: string;
  ownerEmail: string;
  ownerName: string;
  shopName: string;
  avatar: string;
  banner: string;
  bio: string;
  location: string;
  verified: boolean;
  joinedYear: string;
  stats: { rating: number; reviews: number; sales: number };
};

/** Shops beyond apexgear (apex is seeded with mira@apexgear.com in Phase 1). */
export const EXTRA_SELLER_FIXTURES: ExtraSellerFixture[] = [
  {
    handle: "nordicstudio",
    ownerEmail: "seed+nordicstudio@nexus.local",
    ownerName: "Nordic Studio Owner",
    shopName: "Nordic Studio",
    avatar:
      "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=200&q=80",
    banner:
      "https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?auto=format&fit=crop&w=1600&q=80",
    bio: "Minimal home goods and design objects.",
    location: "Stockholm, SE",
    verified: true,
    joinedYear: "2020",
    stats: { rating: 4.8, reviews: 1290, sales: 7820 },
  },
  {
    handle: "timekeepers",
    ownerEmail: "seed+timekeepers@nexus.local",
    ownerName: "TimeKeepers Owner",
    shopName: "TimeKeepers",
    avatar:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80",
    banner:
      "https://images.unsplash.com/photo-1509048191080-d2984bad6ae5?auto=format&fit=crop&w=1600&q=80",
    bio: "Vintage and modern horology specialists.",
    location: "Geneva, CH",
    verified: true,
    joinedYear: "2018",
    stats: { rating: 5.0, reviews: 980, sales: 4120 },
  },
  {
    handle: "visualpro",
    ownerEmail: "seed+visualpro@nexus.local",
    ownerName: "Visual Pro Owner",
    shopName: "Visual Pro",
    avatar:
      "https://images.unsplash.com/photo-1607746882042-944635dfe10e?auto=format&fit=crop&w=200&q=80",
    banner:
      "https://images.unsplash.com/photo-1452587925148-ce544e77e70d?auto=format&fit=crop&w=1600&q=80",
    bio: "Camera bodies, lenses and lighting for working photographers.",
    location: "Tokyo, JP",
    verified: false,
    joinedYear: "2021",
    stats: { rating: 4.7, reviews: 612, sales: 2104 },
  },
];

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

const description =
  "Premium-quality piece, fully tested and certified by our verification team. Comes with original packaging and one-year marketplace warranty. Ships from a trusted seller.";

export type ProductSeedDocument = {
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
  categorySlug: string;
  sellerHandle: string;
  shipping: string;
  badge?: "new" | "hot" | "deal" | "bid";
  bidCount?: number;
  bidEndsAt?: string;
  description: string;
  specs: { label: string; value: string }[];
  tags: string[];
  moderationStatus: "published";
};

export function buildProductSeeds(): ProductSeedDocument[] {
  return titles.map((title, i) => {
    const seed = photos[i % photos.length]!;
    const image = `https://images.unsplash.com/photo-${seed}?auto=format&fit=crop&w=900&q=80`;
    const price = prices[i] ?? 199;
    const originalPrice = i % 3 === 0 ? Math.round(price * 1.18) : undefined;
    const badge = badges[i];
    const categorySlug = cats[i]![0];
    const sellerHandle = SELLER_HANDLE_ROTATION[i % SELLER_HANDLE_ROTATION.length]!;

    return {
      title,
      slug: slugify(title),
      price,
      ...(originalPrice ? { originalPrice } : {}),
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
      categorySlug,
      sellerHandle,
      shipping: i % 2 === 0 ? "Free shipping" : "$12 shipping",
      ...(badge ? { badge } : {}),
      ...(badge === "bid" ? { bidCount: 12 + (i % 30), bidEndsAt: "04h 22m" } : {}),
      description,
      specs: [
        { label: "Condition", value: i % 4 === 0 ? "Used - Like New" : "Brand New" },
        { label: "Brand", value: ["Apex", "Nordic", "TimeKeep", "Visual"][i % 4]! },
        { label: "Model", value: `MK-${100 + i}` },
        { label: "Warranty", value: "12 months" },
        { label: "Returns", value: "30-day free returns" },
      ],
      tags: ["trending", "verified", i % 2 ? "free-shipping" : "auction"],
      moderationStatus: "published",
    };
  });
}
