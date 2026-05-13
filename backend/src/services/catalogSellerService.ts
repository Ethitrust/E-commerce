import { Types } from "mongoose";

import { catalogPublishedListingFilter } from "./catalogPublishedFilter.js";
import type { z } from "zod";

import type { ProductPublicJson, SellerPublicJson } from "../lib/catalogDtos.js";
import { toProductPublicJson, toSellerPublicJson } from "../lib/catalogDtos.js";
import { tryObjectIdString } from "../lib/mongooseIds.js";
import { Product } from "../models/Product.js";
import { Seller } from "../models/Seller.js";
import { categoryNameMap, loadSellerSummaries } from "./catalogHelpers.js";
import type { paginationQuerySchema, sellersListQuerySchema } from "../validators/catalogQuerySchemas.js";

export async function listApprovedSellers(
  q: z.infer<typeof sellersListQuerySchema>,
): Promise<SellerPublicJson[]> {
  const docs = await Seller.find({ status: "approved" })
    .sort({ "stats.rating": -1, name: 1 })
    .limit(q.limit)
    .lean()
    .exec();

  return docs.map((d) =>
    toSellerPublicJson({
      ...d,
      _id: d._id,
      name: d.name,
      handle: d.handle,
    }),
  );
}

export async function getSellerApprovedByHandle(
  handle: string,
  pq: z.infer<typeof paginationQuerySchema>,
): Promise<{
  seller: SellerPublicJson | null;
  products: ProductPublicJson[];
  pagination: { page: number; limit: number; total: number };
}> {
  const sellerDoc = await Seller.findOne({
    handle: handle.toLowerCase(),
    status: "approved",
  }).lean();

  if (!sellerDoc) {
    return {
      seller: null,
      products: [],
      pagination: { page: pq.page, limit: pq.limit, total: 0 },
    };
  }

  const sid = sellerDoc._id as Types.ObjectId;

  const filter = {
    ...catalogPublishedListingFilter,
    sellerId: sid,
  };

  const total = await Product.countDocuments(filter).exec();
  const products = await Product.find(filter)
    .sort({ createdAt: -1 })
    .skip((pq.page - 1) * pq.limit)
    .limit(pq.limit)
    .lean()
    .exec();

  const nameMap = await categoryNameMap();
  const sellerSummaries = await loadSellerSummaries(products.map((p) => p.sellerId));

  return {
    seller: toSellerPublicJson({ ...sellerDoc, _id: sellerDoc._id }),
    products: products.map((p) => {
      const sk = tryObjectIdString(p.sellerId);
      return toProductPublicJson(
        { ...p, _id: p._id, sellerId: p.sellerId },
        {
          categoryNameBySlug: nameMap,
          seller: sk ? (sellerSummaries.get(sk) ?? null) : null,
        },
      );
    }),
    pagination: {
      page: pq.page,
      limit: pq.limit,
      total,
    },
  };
}
