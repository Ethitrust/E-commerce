import { Types } from "mongoose";

import { AppError } from "../errors.js";
import { Seller } from "../models/Seller.js";
import { User } from "../models/User.js";

import type { AdminSellerPatchInput, AdminSellersListQuery } from "../validators/adminSchemas.js";

export type AdminSellerJson = {
  id: string;
  name: string;
  handle: string;
  status: string;
  verified: boolean;
  ownerUserId: string;
  ownerName: string;
  ownerEmail: string;
  joinedYear?: string;
  createdAt: string;
  updatedAt: string;
};

export type AdminSellersListResult = {
  sellers: AdminSellerJson[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
};

export async function listSellersForAdmin(q: AdminSellersListQuery): Promise<AdminSellersListResult> {
  const filter =
    q.status === "all" ? {} : { status: q.status as "pending" | "approved" | "suspended" };

  const total = await Seller.countDocuments(filter).exec();
  const totalPages = Math.max(1, Math.ceil(total / q.limit));

  const rows = await Seller.find(filter)
    .sort({ updatedAt: -1 })
    .skip((q.page - 1) * q.limit)
    .limit(q.limit)
    .lean()
    .exec();

  const ownerIds = rows.map((r) => r.ownerUserId as Types.ObjectId);
  const users = await User.find({ _id: { $in: ownerIds } })
    .select("name email")
    .lean()
    .exec();
  const ownerByHex = new Map(users.map((u) => [(u._id as Types.ObjectId).toHexString(), u]));

  const sellers: AdminSellerJson[] = rows.map((doc) => {
    const oid = (doc.ownerUserId as Types.ObjectId).toHexString();
    const ou = ownerByHex.get(oid);
    const base = doc as typeof doc & { createdAt?: Date; updatedAt?: Date };
    return {
      id: (doc._id as Types.ObjectId).toString(),
      name: doc.name,
      handle: doc.handle,
      status: doc.status as string,
      verified: Boolean(doc.verified),
      ownerUserId: oid,
      ownerName: ou?.name ?? "",
      ownerEmail: ou?.email ?? "",
      ...(typeof doc.joinedYear === "string" && doc.joinedYear.length ? { joinedYear: doc.joinedYear } : {}),
      createdAt: (base.createdAt as Date)?.toISOString?.() ?? new Date().toISOString(),
      updatedAt: (base.updatedAt as Date)?.toISOString?.() ?? new Date().toISOString(),
    };
  });

  return {
    sellers,
    pagination: { page: q.page, limit: q.limit, total, totalPages },
  };
}

export async function patchSellerByAdmin(
  sellerId: Types.ObjectId,
  body: AdminSellerPatchInput,
): Promise<AdminSellerJson> {
  const doc = await Seller.findById(sellerId).exec();
  if (!doc) {
    throw new AppError(404, "NOT_FOUND", "Seller not found");
  }

  if (body.status !== undefined) {
    doc.status = body.status as typeof doc.status;
  }
  if (body.verified !== undefined) {
    doc.verified = body.verified;
  }

  await doc.save();

  const owner = await User.findById(doc.ownerUserId).select("name email").lean().exec();
  const plain = doc.toObject();

  return {
    id: doc._id.toString(),
    name: doc.name,
    handle: doc.handle,
    status: doc.status as string,
    verified: Boolean(doc.verified),
    ownerUserId: (doc.ownerUserId as Types.ObjectId).toString(),
    ownerName: owner?.name ?? "",
    ownerEmail: owner?.email ?? "",
    ...(typeof doc.joinedYear === "string" && doc.joinedYear.length ? { joinedYear: doc.joinedYear } : {}),
    createdAt:
      plain.createdAt instanceof Date ? plain.createdAt.toISOString() : new Date().toISOString(),
    updatedAt:
      plain.updatedAt instanceof Date ? plain.updatedAt.toISOString() : new Date().toISOString(),
  };
}
