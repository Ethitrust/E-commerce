import { Types } from "mongoose";

import { catalogPublishedListingFilter } from "./catalogPublishedFilter.js";
import { tryObjectIdString } from "../lib/mongooseIds.js";
import type { ProductPublicJson } from "../lib/catalogDtos.js";
import { toProductPublicJson } from "../lib/catalogDtos.js";
import { escapeRegex } from "../lib/regex.js";
import { Product } from "../models/Product.js";
import { Seller } from "../models/Seller.js";
import { categoryNameMap, loadSellerSummaries } from "./catalogHelpers.js";
import type { productsListQuerySchema } from "../validators/catalogQuerySchemas.js";
import type { z } from "zod";

export async function listProducts(
  q: z.infer<typeof productsListQuerySchema>,
): Promise<{
  items: ProductPublicJson[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}> {
  const filter: Record<string, unknown> = { ...catalogPublishedListingFilter };
  if (q.category) {
    filter.categorySlug = q.category.toLowerCase();
  }
  if (q.sellerId) {
    filter.sellerId = new Types.ObjectId(q.sellerId);
  }
  if (q.q && q.q.trim()) {
    const safe = escapeRegex(q.q.trim());
    const regex = new RegExp(safe, "i");
    filter.$or = [{ title: regex }, { description: regex }];
  }

  const skip = (q.page - 1) * q.limit;
  let sortKey: Record<string, 1 | -1> = { createdAt: -1 };

  switch (q.sort) {
    case "price-asc": {
      sortKey = { price: 1 };
      break;
    }
    case "price-desc": {
      sortKey = { price: -1 };
      break;
    }
    case "rating": {
      sortKey = { rating: -1, createdAt: -1 };
      break;
    }
    case "relevance": {
      sortKey =
        q.q?.trim().length ?? 0
          ? {
              rating: -1 as const,
              createdAt: -1 as const,
            }
          : { createdAt: -1 };
      break;
    }
    default: {
      sortKey = { createdAt: -1 };
    }
  }

  const total = await Product.countDocuments(filter).exec();
  let products;

  /** Relevance + search: prioritize title substring match in-memory (small catalogs / seed). */
  if (q.sort === "relevance" && q.q?.trim()) {
    const needles = q.q.trim().toLowerCase();
    const capped = await Product.find(filter).sort({ rating: -1, createdAt: -1 }).limit(500).lean().exec();
    capped.sort((a, b) => {
      const at = (a.title as string).toLowerCase().includes(needles) ? 1 : 0;
      const bt = (b.title as string).toLowerCase().includes(needles) ? 1 : 0;
      if (bt !== at) {
        return bt - at;
      }
      return Number(b.rating) - Number(a.rating);
    });
    products = capped.slice(skip, skip + q.limit);
  } else {
    products = await Product.find(filter).sort(sortKey).skip(skip).limit(q.limit).lean().exec();
  }

  const nameMap = await categoryNameMap();
  const sellerMap = await loadSellerSummaries(products.map((p) => p.sellerId));

  const items = products.map((p) => {
    const sellerKey = tryObjectIdString(p.sellerId);
    return toProductPublicJson(
      {
        ...p,
        _id: p._id,
        sellerId: p.sellerId,
      },
      {
        categoryNameBySlug: nameMap,
        seller: sellerKey ? (sellerMap.get(sellerKey) ?? null) : null,
      },
    );
  });

  return {
    items,
    pagination: {
      page: q.page,
      limit: q.limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / q.limit)),
    },
  };
}

export async function getProductPublishedBySlug(slug: string): Promise<ProductPublicJson | null> {
  const product = await Product.findOne({
    slug: slug.toLowerCase(),
    ...catalogPublishedListingFilter,
  })
    .lean()
    .exec();
  if (!product) {
    return null;
  }

  const nameMap = await categoryNameMap();
  const seller = await Seller.findById(product.sellerId)
    .select("_id name handle avatar")
    .lean()
    .exec();

  return toProductPublicJson(
    {
      ...product,
      _id: product._id,
      sellerId: product.sellerId,
    },
    {
      categoryNameBySlug: nameMap,
      seller: seller
        ? {
            _id: seller._id,
            name: seller.name,
            handle: seller.handle,
            avatar: seller.avatar ?? "",
          }
        : null,
    },
  );
}
