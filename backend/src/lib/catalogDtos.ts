import { tryObjectIdString } from "./mongooseIds.js";
import type { CategoryDocument } from "../models/Category.js";
import type { ProductDocument } from "../models/Product.js";
import type { SellerDocument } from "../models/Seller.js";

/** Public seller shape aligned with frontend `Seller` (mock-data). */
export type SellerPublicJson = {
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
};

export type SellerSummaryJson = {
  id: string;
  name: string;
  handle: string;
  avatar: string;
};

/** Category list item — `count` matches frontend `Category.count`. */
export type CategoryPublicJson = {
  slug: string;
  name: string;
  icon: string;
  count: number;
};

/** Product — matches frontend `Product` plus optional inline seller for cards. */
export type ProductPublicJson = {
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
  seller?: SellerSummaryJson;
};

export function toSellerPublicJson(doc: SellerDocument): SellerPublicJson {
  const stats = doc.stats ?? { rating: 0, reviews: 0, sales: 0 };
  return {
    id: doc._id.toString(),
    name: doc.name,
    handle: doc.handle,
    avatar: doc.avatar ?? "",
    rating: stats.rating ?? 0,
    reviews: stats.reviews ?? 0,
    sales: stats.sales ?? 0,
    joined: doc.joinedYear ?? "",
    location: doc.location ?? "",
    banner: doc.banner ?? "",
    bio: doc.bio ?? "",
    verified: Boolean(doc.verified),
  };
}

export function toSellerSummaryJson(doc: Pick<SellerDocument, "_id" | "name" | "handle" | "avatar">): SellerSummaryJson {
  return {
    id: doc._id.toString(),
    name: doc.name,
    handle: doc.handle,
    avatar: doc.avatar ?? "",
  };
}

export function toCategoryPublicJson(doc: CategoryDocument): CategoryPublicJson {
  return {
    slug: doc.slug,
    name: doc.name,
    icon: doc.icon,
    count: doc.productCount,
  };
}

function categoryDisplayName(categorySlug: string, categoryNameBySlug?: Map<string, string>): string {
  if (categoryNameBySlug?.has(categorySlug)) {
    return categoryNameBySlug.get(categorySlug)!;
  }
  return categorySlug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function toProductPublicJson(
  doc: ProductDocument,
  options?: {
    categoryNameBySlug?: Map<string, string>;
    seller?: Pick<SellerDocument, "_id" | "name" | "handle" | "avatar"> | null;
  },
): ProductPublicJson {
  const category = categoryDisplayName(doc.categorySlug, options?.categoryNameBySlug);
  const base: ProductPublicJson = {
    id: doc._id.toString(),
    title: doc.title,
    slug: doc.slug,
    price: doc.price,
    ...(doc.originalPrice != null && doc.originalPrice > 0 ? { originalPrice: doc.originalPrice } : {}),
    currency: doc.currency,
    rating: doc.rating,
    reviews: doc.reviews,
    sold: doc.sold,
    stock: doc.stock,
    image: doc.image,
    gallery: doc.gallery ?? [],
    category,
    categorySlug: doc.categorySlug,
    sellerId: tryObjectIdString(doc.sellerId) ?? "",
    shipping: doc.shipping,
    ...(doc.badge ? { badge: doc.badge as ProductPublicJson["badge"] } : {}),
    ...(doc.bidCount != null ? { bidCount: doc.bidCount } : {}),
    ...(doc.bidEndsAt ? { bidEndsAt: doc.bidEndsAt } : {}),
    description: doc.description,
    specs: (doc.specs ?? []).map((s) => ({ label: s.label, value: s.value })),
    tags: doc.tags ?? [],
  };
  if (options?.seller) {
    base.seller = toSellerSummaryJson(options.seller);
  }
  return base;
}
