import { Types } from "mongoose";

import { AppError } from "../errors.js";
import type { ProductDocument } from "../models/Product.js";
import { Product } from "../models/Product.js";
import { Seller } from "../models/Seller.js";

import type { AdminProductPatchInput } from "../validators/adminSchemas.js";
import type { AdminProductsListQuery } from "../validators/adminSchemas.js";

export type AdminModerationProductJson = {
  id: string;
  title: string;
  slug: string;
  price: number;
  currency: string;
  categorySlug: string;
  moderationStatus: string;
  archived: boolean;
  sellerId: string;
  sellerName: string;
  sellerHandle: string;
  image: string;
  updatedAt: string;
};

export type AdminProductsListResult = {
  products: AdminModerationProductJson[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
};

async function sellersByIds(ids: Types.ObjectId[]): Promise<Map<string, { name: string; handle: string }>> {
  const docs = await Seller.find({ _id: { $in: ids } })
    .select("name handle")
    .lean()
    .exec();
  return new Map(
    docs.map((d) => [
      (d._id as Types.ObjectId).toHexString(),
      { name: d.name, handle: d.handle },
    ]),
  );
}

function toModerationJson(
  doc: ProductDocument & { _id: Types.ObjectId; updatedAt?: Date },
  seller: { name: string; handle: string } | null,
): AdminModerationProductJson {
  return {
    id: doc._id.toString(),
    title: doc.title,
    slug: doc.slug,
    price: Number(doc.price),
    currency: String(doc.currency),
    categorySlug: doc.categorySlug,
    moderationStatus: String(doc.moderationStatus),
    archived: Boolean(doc.archived),
    sellerId: (doc.sellerId as Types.ObjectId).toString(),
    sellerName: seller?.name ?? "",
    sellerHandle: seller?.handle ?? "",
    image: String(doc.image ?? ""),
    updatedAt:
      doc.updatedAt instanceof Date ? doc.updatedAt.toISOString() : new Date().toISOString(),
  };
}

export async function listProductsForModeration(q: AdminProductsListQuery): Promise<AdminProductsListResult> {
  const archivedFilter = { archived: { $ne: true } as const };
  const moderationFilter =
    q.moderation === "all" ? {} : { moderationStatus: q.moderation as string };

  const filter = { ...archivedFilter, ...moderationFilter };

  const total = await Product.countDocuments(filter).exec();
  const totalPages = Math.max(1, Math.ceil(total / q.limit));

  const rows = await Product.find(filter)
    .sort({ updatedAt: -1 })
    .skip((q.page - 1) * q.limit)
    .limit(q.limit)
    .lean()
    .exec();

  const sidList = rows.map((r) => r.sellerId as Types.ObjectId);
  const sellerMap = await sellersByIds(sidList);

  const products = rows.map((r) => {
    const sidHex = (r.sellerId as Types.ObjectId).toHexString();
    return toModerationJson(r as ProductDocument & { _id: Types.ObjectId }, sellerMap.get(sidHex) ?? null);
  });

  return {
    products,
    pagination: { page: q.page, limit: q.limit, total, totalPages },
  };
}

export async function patchProductModeration(
  productId: Types.ObjectId,
  body: AdminProductPatchInput,
): Promise<AdminModerationProductJson> {
  const doc = await Product.findById(productId).exec();
  if (!doc) {
    throw new AppError(404, "NOT_FOUND", "Product not found");
  }

  if (body.moderationStatus === "published" && doc.archived) {
    throw new AppError(
      409,
      "ARCHIVED_PRODUCT",
      "Cannot publish an archived product; ask the seller to restore it first.",
    );
  }

  doc.moderationStatus = body.moderationStatus as typeof doc.moderationStatus;
  await doc.save();

  const fresh = await Product.findById(productId).lean().exec();
  if (!fresh) {
    throw new AppError(404, "NOT_FOUND", "Product not found after update");
  }

  const sellerDoc = await Seller.findById(doc.sellerId).select("name handle").lean().exec();
  const sellerInfo = sellerDoc
    ? {
        name: sellerDoc.name,
        handle: sellerDoc.handle,
      }
    : null;

  return toModerationJson(
    fresh as ProductDocument & { _id: Types.ObjectId },
    sellerInfo,
  );
}
