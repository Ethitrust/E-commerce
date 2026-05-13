import { Types } from "mongoose";

import { catalogPublishedListingFilter } from "./catalogPublishedFilter.js";
import type { ProductPublicJson } from "../lib/catalogDtos.js";
import { toProductPublicJson } from "../lib/catalogDtos.js";
import { AppError } from "../errors.js";
import type { ProductDocument } from "../models/Product.js";
import { CartItem } from "../models/CartItem.js";
import { Product } from "../models/Product.js";
import type { MeCartPutInput } from "../validators/meSchemas.js";
import { categoryNameMap, loadSellerSummaries } from "./catalogHelpers.js";

export type MeCartLineJson = {
  productId: string;
  quantity: number;
  product: ProductPublicJson;
};

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

export async function getCartForUser(userIdStr: string): Promise<MeCartLineJson[]> {
  const userId = new Types.ObjectId(userIdStr);
  const rows = await CartItem.find({ userId }).lean().exec();
  if (rows.length === 0) {
    return [];
  }

  const productIds = [...new Set(rows.map((r) => (r.productId as Types.ObjectId).toString()))].map(
    (id) => new Types.ObjectId(id),
  );
  const productsRaw = await Product.find({
    _id: { $in: productIds },
    ...catalogPublishedListingFilter,
  })
    .lean()
    .exec();

  const products = productsRaw as Array<ProductDocument & { _id: Types.ObjectId }>;
  const hyBySlug = new Map<string, ProductPublicJson>();
  const hydrated = await hydratePublishedProducts(products);
  for (let i = 0; i < products.length; i++) {
    hyBySlug.set(products[i]!._id.toString(), hydrated[i]!);
  }

  const out: MeCartLineJson[] = [];
  for (const row of rows) {
    const pid = (row.productId as Types.ObjectId).toString();
    const prod = hyBySlug.get(pid);
    if (!prod) {
      continue;
    }
    out.push({
      productId: pid,
      quantity: row.quantity as number,
      product: prod,
    });
  }
  return out;
}

export async function replaceCartForUser(userIdStr: string, body: MeCartPutInput): Promise<MeCartLineJson[]> {
  const userId = new Types.ObjectId(userIdStr);

  /** Aggregate quantities for duplicate lines (defensive). */
  const qtyByProduct = new Map<string, number>();
  for (const line of body.items) {
    const prev = qtyByProduct.get(line.productId) ?? 0;
    qtyByProduct.set(line.productId, prev + line.quantity);
  }

  const uniqueIds = [...qtyByProduct.keys()].map((s) => new Types.ObjectId(s));

  const productsRaw = await Product.find({
    _id: { $in: uniqueIds },
    ...catalogPublishedListingFilter,
  })
    .lean()
    .exec();

  const products = productsRaw as Array<ProductDocument & { _id: Types.ObjectId }>;
  const productByHex = new Map(products.map((p) => [p._id.toString(), p]));

  for (const [hex, qty] of qtyByProduct) {
    const p = productByHex.get(hex);
    if (!p) {
      throw new AppError(400, "INVALID_CART", "One or more products are unavailable");
    }
    const stock = Number(p.stock);
    if (!Number.isFinite(stock) || qty > stock) {
      throw new AppError(400, "INSUFFICIENT_STOCK", `Insufficient stock for product ${hex}`);
    }
  }

  await CartItem.deleteMany({ userId }).exec();

  if (qtyByProduct.size > 0) {
    const bulk = Array.from(qtyByProduct.entries()).map(([productIdHex, quantity]) => ({
      userId,
      productId: new Types.ObjectId(productIdHex),
      quantity,
    }));
    await CartItem.insertMany(bulk);
  }

  const lines = Array.from(qtyByProduct.entries()).map(([productIdHex, quantity]) => {
    const raw = productByHex.get(productIdHex)!;
    return { raw, quantity };
  });

  const hydratedList = await hydratePublishedProducts(lines.map((l) => l.raw));

  return lines.map((l, idx) => ({
    productId: l.raw._id.toString(),
    quantity: l.quantity,
    product: hydratedList[idx]!,
  }));
}
