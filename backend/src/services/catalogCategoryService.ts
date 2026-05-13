import type { z } from "zod";

import { catalogPublishedListingFilter } from "./catalogPublishedFilter.js";
import type { CategoryPublicJson, ProductPublicJson } from "../lib/catalogDtos.js";
import { toCategoryPublicJson, toProductPublicJson } from "../lib/catalogDtos.js";
import { tryObjectIdString } from "../lib/mongooseIds.js";
import { Category } from "../models/Category.js";
import { Product } from "../models/Product.js";
import type { paginationQuerySchema } from "../validators/catalogQuerySchemas.js";
import { categoryNameMap, loadSellerSummaries } from "./catalogHelpers.js";

export async function listCategories(): Promise<CategoryPublicJson[]> {
  const docs = await Category.find({}).sort({ name: 1 }).lean().exec();
  return docs.map((d) =>
    toCategoryPublicJson({
      ...d,
      _id: d._id,
    }),
  );
}

export async function getCategoryDetail(
  slug: string,
  q: z.infer<typeof paginationQuerySchema>,
): Promise<{
  category: CategoryPublicJson | null;
  products: ProductPublicJson[];
  pagination: { page: number; limit: number; total: number };
}> {
  const categoryDoc = await Category.findOne({ slug: slug.toLowerCase() }).lean();
  if (!categoryDoc) {
    return {
      category: null,
      products: [],
      pagination: { page: q.page, limit: q.limit, total: 0 },
    };
  }

  const filter = {
    ...catalogPublishedListingFilter,
    categorySlug: categoryDoc.slug,
  };

  const total = await Product.countDocuments(filter).exec();
  const products = await Product.find(filter)
    .sort({ createdAt: -1 })
    .skip((q.page - 1) * q.limit)
    .limit(q.limit)
    .lean()
    .exec();

  const nameMap = await categoryNameMap();
  const sellerSummaries = await loadSellerSummaries(products.map((p) => p.sellerId));

  return {
    category: toCategoryPublicJson({ ...categoryDoc, _id: categoryDoc._id }),
    products: products.map((p) => {
      const sk = tryObjectIdString(p.sellerId);
      return toProductPublicJson(
        {
          ...p,
          _id: p._id,
          sellerId: p.sellerId,
        },
        {
          categoryNameBySlug: nameMap,
          seller: sk ? (sellerSummaries.get(sk) ?? null) : null,
        },
      );
    }),
    pagination: {
      page: q.page,
      limit: q.limit,
      total,
    },
  };
}
