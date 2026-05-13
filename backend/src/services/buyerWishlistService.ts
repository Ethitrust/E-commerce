import { Types } from "mongoose";

import { catalogPublishedListingFilter } from "./catalogPublishedFilter.js";
import type { ProductPublicJson } from "../lib/catalogDtos.js";
import { toProductPublicJson } from "../lib/catalogDtos.js";
import { AppError } from "../errors.js";
import type { ProductDocument } from "../models/Product.js";
import { Product } from "../models/Product.js";
import { WishlistItem } from "../models/WishlistItem.js";
import { categoryNameMap, loadSellerSummaries } from "./catalogHelpers.js";

/** GET /me/wishlist — drops stale or unpublished product ids silently. */
async function hydratePublishedProducts(
  productDocs: Array<ProductDocument & { _id: Types.ObjectId }>,
): Promise<ProductPublicJson[]> {
  if (productDocs.length === 0) {
    return [];
  }
  const nameMap = await categoryNameMap();
  const sellerMap = await loadSellerSummaries(productDocs.map((p) => p.sellerId));

  return productDocs.map((p) =>
    toProductPublicJson(
      {
        ...p,
        _id: p._id,
        sellerId: p.sellerId,
      },
      {
        categoryNameBySlug: nameMap,
        seller: sellerMap.get(String(p.sellerId)) ?? null,
      },
    ),
  );
}

export async function getWishlistForUser(userIdStr: string): Promise<ProductPublicJson[]> {
  const userId = new Types.ObjectId(userIdStr);
  const rows = await WishlistItem.find({ userId }).sort({ updatedAt: -1 }).lean().exec();
  if (rows.length === 0) {
    return [];
  }

  const idOrder = rows.map((r) => (r.productId as Types.ObjectId).toString());
  const uniqueIds = [...new Set(idOrder)].map((hex) => new Types.ObjectId(hex));

  const productsRaw = await Product.find({
    _id: { $in: uniqueIds },
    ...catalogPublishedListingFilter,
  })
    .lean()
    .exec();

  const prodByHex = new Map(
    (productsRaw as Array<ProductDocument & { _id: Types.ObjectId }>).map((p) => [p._id.toString(), p]),
  );

  const ordered = idOrder.map((hex) => prodByHex.get(hex)).filter((p): p is ProductDocument & { _id: Types.ObjectId } =>
    Boolean(p),
  );

  return hydratePublishedProducts(ordered);
}

export async function setWishlistItem(
  userIdStr: string,
  productId: Types.ObjectId,
  add: boolean,
): Promise<void> {
  const userId = new Types.ObjectId(userIdStr);

  if (add) {
    const prod = await Product.findOne({ _id: productId, ...catalogPublishedListingFilter })
      .select("_id")
      .lean()
      .exec();
    if (!prod) {
      throw new AppError(400, "INVALID_PRODUCT", "Product not found or not available");
    }
    await WishlistItem.updateOne(
      { userId, productId },
      { $set: { userId, productId } },
      { upsert: true },
    ).exec();
  } else {
    await WishlistItem.deleteOne({ userId, productId }).exec();
  }
}
