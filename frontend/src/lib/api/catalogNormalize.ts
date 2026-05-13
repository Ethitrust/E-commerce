import type { Category, Product, Seller } from "@/lib/mock-data";

function num(v: unknown, fallback = 0): number {
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}

function str(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : fallback;
}

const BADGES = new Set<NonNullable<Product["badge"]>>(["new", "hot", "deal", "bid"]);

function coerceImage(raw: unknown): string {
  if (typeof raw === "string") {
    return raw;
  }
  if (Array.isArray(raw)) {
    const first = raw.find((x) => typeof x === "string" && x.length > 0);
    return typeof first === "string" ? first : "";
  }
  return "";
}

/** Coerces API payloads so listing/detail pages cannot throw on bad DB rows or legacy shapes. */
export function normalizeCategory(c: Record<string, unknown>): Category {
  return {
    slug: str(c.slug, "unknown"),
    name: str(c.name, "Category"),
    icon: str(c.icon, "Smartphone"),
    count: num(c.count),
  };
}

export function normalizeProduct(p: Record<string, unknown>): Product {
  const badgeRaw = p.badge;
  const badge =
    typeof badgeRaw === "string" && BADGES.has(badgeRaw as NonNullable<Product["badge"]>)
      ? (badgeRaw as NonNullable<Product["badge"]>)
      : undefined;

  const specsRaw = p.specs;
  const specs: { label: string; value: string }[] = Array.isArray(specsRaw)
    ? specsRaw
        .filter((s): s is Record<string, unknown> => typeof s === "object" && s !== null)
        .map((s) => ({ label: str(s.label), value: str(s.value) }))
    : [];

  const tagsRaw = p.tags;
  const tags = Array.isArray(tagsRaw)
    ? tagsRaw.filter((t): t is string => typeof t === "string")
    : [];

  const sellerRaw = p.seller;
  let sellerBlock: Product["seller"] | undefined;
  if (sellerRaw !== null && typeof sellerRaw === "object") {
    const s = sellerRaw as Record<string, unknown>;
    sellerBlock = {
      id: str(s.id),
      name: str(s.name, "Seller"),
      handle: str(s.handle, "seller"),
      avatar: str(s.avatar),
    };
  }

  let originalPrice: number | undefined;
  const op = p.originalPrice;
  if (typeof op === "number" && Number.isFinite(op) && op > 0) {
    originalPrice = op;
  }

  let bidCount: number | undefined;
  if (typeof p.bidCount === "number" && Number.isFinite(p.bidCount)) {
    bidCount = p.bidCount;
  }

  return {
    id: str(p.id),
    title: str(p.title, "Product"),
    slug: str(p.slug, "item"),
    price: num(p.price),
    ...(originalPrice != null ? { originalPrice } : {}),
    currency: str(p.currency, "USD"),
    rating: num(p.rating),
    reviews: num(p.reviews),
    sold: num(p.sold),
    stock: num(p.stock),
    image: coerceImage(p.image),
    gallery: Array.isArray(p.gallery)
      ? (p.gallery as unknown[]).filter((g): g is string => typeof g === "string")
      : [],
    category: str(p.category),
    categorySlug: str(p.categorySlug),
    sellerId: str(p.sellerId),
    shipping: str(p.shipping),
    ...(badge ? { badge } : {}),
    ...(bidCount != null ? { bidCount } : {}),
    ...(typeof p.bidEndsAt === "string" && p.bidEndsAt.length > 0
      ? { bidEndsAt: p.bidEndsAt }
      : {}),
    description: str(p.description),
    specs,
    tags,
    ...(sellerBlock ? { seller: sellerBlock } : {}),
  };
}

export function normalizeSeller(s: Record<string, unknown>): Seller {
  return {
    id: str(s.id),
    name: str(s.name, "Seller"),
    handle: str(s.handle, "seller"),
    avatar: str(s.avatar),
    rating: num(s.rating),
    reviews: num(s.reviews),
    sales: num(s.sales),
    joined: str(s.joined),
    location: str(s.location),
    banner: str(s.banner),
    bio: str(s.bio),
    verified: Boolean(s.verified),
  };
}
