import { Types } from "mongoose";

import { AppError } from "../errors.js";
import { catalogPublishedListingFilter } from "./catalogPublishedFilter.js";
import { Product } from "../models/Product.js";
import { RecentView } from "../models/RecentView.js";

const RECENT_CAP = 50;

export async function getRecentIdsForUser(userIdStr: string): Promise<string[]> {
  const userId = new Types.ObjectId(userIdStr);
  const docs = await RecentView.find({ userId })
    .sort({ viewedAt: -1 })
    .limit(RECENT_CAP)
    .lean()
    .exec();

  return docs.map((d) => (d.productId as Types.ObjectId).toString());
}

export async function recordRecentForUser(userIdStr: string, productId: Types.ObjectId): Promise<void> {
  const userId = new Types.ObjectId(userIdStr);

  const prod = await Product.findOne({ _id: productId, ...catalogPublishedListingFilter })
    .select("_id")
    .lean()
    .exec();
  if (!prod) {
    throw new AppError(400, "INVALID_PRODUCT", "Product not found or not available");
  }

  const now = new Date();
  await RecentView.updateOne(
    { userId, productId },
    { $set: { userId, productId, viewedAt: now } },
    { upsert: true },
  ).exec();

  const count = await RecentView.countDocuments({ userId }).exec();
  if (count > RECENT_CAP) {
    const excess = count - RECENT_CAP;
    const oldest = await RecentView.find({ userId }).sort({ viewedAt: 1 }).limit(excess).select("_id").lean().exec();

    await RecentView.deleteMany({
      _id: { $in: oldest.map((d) => d._id as Types.ObjectId) },
    }).exec();
  }
}
