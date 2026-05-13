import { Types } from "mongoose";

import { AppError } from "../errors.js";
import { Category } from "../models/Category.js";
import type { ProductDocument } from "../models/Product.js";
import { Product } from "../models/Product.js";
import type { SellerProductCreateInput, SellerProductPatchInput } from "../validators/sellerProductSchemas.js";

function isDuplicateKey(error: unknown): boolean {
  return (
    typeof error === "object" && error !== null && "code" in error && (error as { code: number }).code === 11000
  );
}

export type SellerProductJson = {
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
  categorySlug: string;
  sellerId: string;
  shipping: string;
  badge?: "new" | "hot" | "deal" | "bid";
  bidCount?: number;
  bidEndsAt?: string;
  description: string;
  specs: { label: string; value: string }[];
  tags: string[];
  moderationStatus: string;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
};

function docToSellerProduct(doc: ProductDocument & { _id: Types.ObjectId }): SellerProductJson {
  let originalPrice: number | undefined;
  const op = doc.originalPrice as number | undefined;
  if (typeof op === "number" && Number.isFinite(op) && op >= 0) {
    originalPrice = op;
  }
  let bidCount: number | undefined;
  const bc = doc.bidCount as number | undefined;
  if (typeof bc === "number" && Number.isFinite(bc)) {
    bidCount = bc;
  }

  const badgeRaw = doc.badge;
  const badge =
    typeof badgeRaw === "string" && ["new", "hot", "deal", "bid"].includes(badgeRaw)
      ? (badgeRaw as "new" | "hot" | "deal" | "bid")
      : undefined;

  return {
    id: doc._id.toString(),
    title: doc.title,
    slug: doc.slug,
    price: Number(doc.price),
    ...(originalPrice != null ? { originalPrice } : {}),
    currency: String(doc.currency),
    rating: Number(doc.rating),
    reviews: Number(doc.reviews),
    sold: Number(doc.sold),
    stock: Number(doc.stock),
    image: String(doc.image),
    gallery: Array.isArray(doc.gallery) ? doc.gallery.filter((g): g is string => typeof g === "string") : [],
    categorySlug: doc.categorySlug,
    sellerId: (doc.sellerId as Types.ObjectId).toString(),
    shipping: String(doc.shipping ?? ""),
    ...(badge ? { badge } : {}),
    ...(bidCount != null ? { bidCount } : {}),
    ...(typeof doc.bidEndsAt === "string" && doc.bidEndsAt.length ? { bidEndsAt: doc.bidEndsAt } : {}),
    description: String(doc.description ?? ""),
    specs: Array.isArray(doc.specs)
      ? doc.specs.map((s) => ({ label: String(s.label), value: String(s.value) }))
      : [],
    tags: Array.isArray(doc.tags)
      ? doc.tags.filter((t): t is string => typeof t === "string")
      : [],
    moderationStatus: String(doc.moderationStatus),
    archived: Boolean(doc.archived),
    createdAt: (doc.createdAt as Date)?.toISOString?.() ?? new Date().toISOString(),
    updatedAt: (doc.updatedAt as Date)?.toISOString?.() ?? new Date().toISOString(),
  };
}

async function ensureCategorySlug(slug: string): Promise<void> {
  const exists = await Category.countDocuments({ slug }).exec();
  if (exists === 0) {
    throw new AppError(400, "INVALID_CATEGORY", "Unknown category slug");
  }
}

export async function listSellerProducts(sellerProfileId: string): Promise<SellerProductJson[]> {
  const sellerId = new Types.ObjectId(sellerProfileId);
  const rows = await Product.find({ sellerId, archived: { $ne: true } })
    .sort({ updatedAt: -1 })
    .lean()
    .exec();

  return (rows as Array<ProductDocument & { _id: Types.ObjectId }>).map(docToSellerProduct);
}

export async function createSellerProduct(
  sellerProfileId: string,
  input: SellerProductCreateInput,
): Promise<SellerProductJson> {
  const sellerId = new Types.ObjectId(sellerProfileId);
  await ensureCategorySlug(input.categorySlug);

  try {
    const [created] = await Product.create([
      {
        title: input.title,
        slug: input.slug,
        price: input.price,
        ...(input.originalPrice != null ? { originalPrice: input.originalPrice } : {}),
        currency: input.currency ?? "USD",
        rating: 0,
        reviews: 0,
        sold: 0,
        stock: input.stock ?? 0,
        image: input.image,
        gallery: input.gallery ?? [],
        categorySlug: input.categorySlug,
        sellerId,
        // Always a real string — Mongoose may skip paths set to undefined before defaults run.
        shipping: String(input.shipping ?? ""),
        ...(input.badge != null ? { badge: input.badge } : {}),
        ...(input.bidCount != null ? { bidCount: input.bidCount } : {}),
        ...(input.bidEndsAt != null ? { bidEndsAt: input.bidEndsAt } : {}),
        description: input.description ?? "",
        specs: input.specs ?? [],
        tags: input.tags ?? [],
        moderationStatus: "pending",
        archived: false,
      },
    ]);
    if (!created) {
      throw new AppError(500, "PRODUCT_CREATE_FAILED", "Could not create product");
    }
    const lean = created.toObject() as ProductDocument & { _id: Types.ObjectId };
    return docToSellerProduct(lean);
  } catch (e) {
    if (isDuplicateKey(e)) {
      throw new AppError(409, "DUPLICATE_SLUG", "A product with this slug already exists");
    }
    throw e;
  }
}

export async function patchSellerProduct(
  sellerProfileId: string,
  productId: Types.ObjectId,
  input: SellerProductPatchInput,
): Promise<SellerProductJson> {
  const sellerId = new Types.ObjectId(sellerProfileId);

  if (input.categorySlug != null) {
    await ensureCategorySlug(input.categorySlug);
  }

  const patch: Record<string, unknown> = {};

  if (input.title !== undefined) patch.title = input.title;
  if (input.slug !== undefined) patch.slug = input.slug;
  if (input.price !== undefined) patch.price = input.price;
  if (input.currency !== undefined) patch.currency = input.currency;
  if (input.categorySlug !== undefined) patch.categorySlug = input.categorySlug;
  if (input.image !== undefined) patch.image = input.image;
  if (input.gallery !== undefined) patch.gallery = input.gallery;
  if (input.stock !== undefined) patch.stock = input.stock;
  if (input.shipping !== undefined) patch.shipping = input.shipping;
  if (input.description !== undefined) patch.description = input.description;
  if (input.specs !== undefined) patch.specs = input.specs;
  if (input.tags !== undefined) patch.tags = input.tags;

  if (input.originalPrice !== undefined) {
    patch.originalPrice = input.originalPrice;
  }
  if (input.badge !== undefined) {
    patch.badge = input.badge === null ? undefined : input.badge;
  }
  if (input.bidCount !== undefined) {
    patch.bidCount = input.bidCount === null ? undefined : input.bidCount;
  }
  if (input.bidEndsAt !== undefined) {
    patch.bidEndsAt = input.bidEndsAt === null ? undefined : input.bidEndsAt;
  }

  try {
    const updated = await Product.findOneAndUpdate(
      { _id: productId, sellerId, archived: { $ne: true } },
      { $set: patch },
      { new: true },
    )
      .lean()
      .exec();

    if (!updated) {
      throw new AppError(404, "NOT_FOUND", "Product not found");
    }
    return docToSellerProduct(updated as ProductDocument & { _id: Types.ObjectId });
  } catch (e) {
    if (isDuplicateKey(e)) {
      throw new AppError(409, "DUPLICATE_SLUG", "A product with this slug already exists");
    }
    throw e;
  }
}

export async function archiveSellerProduct(
  sellerProfileId: string,
  productId: Types.ObjectId,
): Promise<void> {
  const sellerId = new Types.ObjectId(sellerProfileId);
  const result = await Product.findOneAndUpdate(
    { _id: productId, sellerId, archived: { $ne: true } },
    { $set: { archived: true, moderationStatus: "draft" } },
    { new: true },
  ).exec();

  if (!result) {
    throw new AppError(404, "NOT_FOUND", "Product not found");
  }
}
