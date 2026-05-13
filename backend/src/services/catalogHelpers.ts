import { Types } from "mongoose";

import { tryObjectIdString } from "../lib/mongooseIds.js";
import { Category } from "../models/Category.js";
import type { SellerDocument } from "../models/Seller.js";
import { Seller } from "../models/Seller.js";

export async function categoryNameMap(): Promise<Map<string, string>> {
  const cats = await Category.find({}).select("slug name").lean();
  return new Map(cats.map((c) => [c.slug, c.name]));
}

export async function loadSellerSummaries(
  sellerRefs: unknown[],
): Promise<Map<string, Pick<SellerDocument, "_id" | "name" | "handle" | "avatar">>> {
  const unique = [
    ...new Set(sellerRefs.map((raw) => tryObjectIdString(raw)).filter((k): k is string => Boolean(k))),
  ];
  if (unique.length === 0) {
    return new Map();
  }
  const ids = unique.map((s) => new Types.ObjectId(s));
  const sellers = await Seller.find({ _id: { $in: ids } })
    .select("_id name handle avatar")
    .lean()
    .exec();
  return new Map(
    sellers.map((s) => [
      s._id.toString(),
      {
        ...s,
        _id: s._id,
        name: s.name,
        handle: s.handle,
        avatar: s.avatar ?? "",
      },
    ]),
  );
}
