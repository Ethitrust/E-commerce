import { randomBytes } from "node:crypto";

import { Types } from "mongoose";
import mongoose from "mongoose";

import { AppError } from "../errors.js";
import type { ProductDocument } from "../models/Product.js";
import { CartItem } from "../models/CartItem.js";
import { Order } from "../models/Order.js";
import { Product } from "../models/Product.js";
import { catalogPublishedListingFilter } from "./catalogPublishedFilter.js";
import type { CheckoutBodyInput } from "../validators/checkoutSchemas.js";

const SHIPPING_FLAT_USD = 12;

function allocateOrderNumber(): string {
  return `NX-${randomBytes(6).toString("hex").toUpperCase()}`;
}

function isMongoDuplicate(err: unknown): boolean {
  return (
    typeof err === "object" && err !== null && "code" in err && (err as { code: number }).code === 11000
  );
}

export type OrderLineItemJson = {
  productId: string;
  sellerId: string;
  title: string;
  slug: string;
  unitPrice: number;
  quantity: number;
  image: string;
};

export type OrderSummaryJson = {
  orderNumber: string;
  status: string;
  currency: string;
  subtotal: number;
  shipping: number;
  total: number;
  paymentMethod: string;
  shippingAddress: CheckoutBodyInput["shippingAddress"];
  lineItems: OrderLineItemJson[];
  createdAt: string;
  updatedAt: string;
};

type LeanLineItem = {
  productId: Types.ObjectId;
  sellerId: Types.ObjectId;
  title: string;
  slug: string;
  unitPrice: number;
  quantity: number;
  image: string;
};

type LeanOrder = {
  orderNumber: string;
  status: string;
  currency: string;
  subtotal: number;
  shipping: number;
  total: number;
  paymentMethod: string;
  shippingAddress: CheckoutBodyInput["shippingAddress"];
  lineItems: LeanLineItem[];
  createdAt: Date;
  updatedAt: Date;
};

function leanOrderToSummary(doc: LeanOrder): OrderSummaryJson {
  return {
    orderNumber: doc.orderNumber,
    status: doc.status,
    currency: doc.currency,
    subtotal: doc.subtotal,
    shipping: doc.shipping,
    total: doc.total,
    paymentMethod: doc.paymentMethod,
    shippingAddress: doc.shippingAddress,
    lineItems: doc.lineItems.map((li) => ({
      productId: li.productId.toString(),
      sellerId: li.sellerId.toString(),
      title: li.title,
      slug: li.slug,
      unitPrice: li.unitPrice,
      quantity: li.quantity,
      image: li.image,
    })),
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

async function checkoutOnce(
  buyerUserId: string,
  body: CheckoutBodyInput,
  orderNumber: string,
): Promise<OrderSummaryJson> {
  const buyerOid = new Types.ObjectId(buyerUserId);
  const session = await mongoose.startSession();

  try {
    await session.withTransaction(async () => {
      const cartRows = await CartItem.find({ userId: buyerOid }).session(session).lean().exec();

      if (cartRows.length === 0) {
        throw new AppError(400, "EMPTY_CART", "Cart is empty");
      }

      const productObjectIds = [
        ...new Set(cartRows.map((r) => (r.productId as Types.ObjectId).toHexString())),
      ].map((id) => new Types.ObjectId(id));

      const productDocsRaw = await Product.find({
        _id: { $in: productObjectIds },
        ...catalogPublishedListingFilter,
      })
        .session(session)
        .lean()
        .exec();

      const productByHex = new Map<string, ProductDocument & { _id: Types.ObjectId }>();
      for (const p of productDocsRaw) {
        const doc = p as ProductDocument & { _id: Types.ObjectId };
        productByHex.set(doc._id.toHexString(), doc);
      }

      type LinePrep = {
        productRaw: ProductDocument & { _id: Types.ObjectId };
        quantity: number;
      };

      const linesPrep: LinePrep[] = [];

      for (const row of cartRows) {
        const pidHex = (row.productId as Types.ObjectId).toHexString();
        const p = productByHex.get(pidHex);
        if (!p) {
          throw new AppError(
            400,
            "INVALID_CART",
            "One or more products are unavailable for checkout",
          );
        }
        linesPrep.push({ productRaw: p, quantity: row.quantity as number });
      }

      for (const { productRaw, quantity } of linesPrep) {
        const updated = await Product.findOneAndUpdate(
          {
            _id: productRaw._id,
            ...catalogPublishedListingFilter,
            stock: { $gte: quantity },
          },
          { $inc: { stock: -quantity, sold: quantity } },
          { session, new: true },
        ).exec();

        if (!updated) {
          throw new AppError(
            400,
            "INSUFFICIENT_STOCK",
            `Insufficient stock for product ${productRaw._id.toString()}`,
          );
        }
      }

      const uniqueCurrency = [...new Set(linesPrep.map(({ productRaw }) => String(productRaw.currency)))];
      if (uniqueCurrency.length !== 1) {
        throw new AppError(
          400,
          "CHECKOUT_UNSUPPORTED",
          "Checkout requires a cart in a single currency",
        );
      }
      const currency = uniqueCurrency[0]!;
      let subtotal = 0;

      const lineItems = linesPrep.map(({ productRaw, quantity }) => {
        const unitPrice = Number(productRaw.price);
        subtotal += unitPrice * quantity;
        const imageUrl = typeof productRaw.image === "string" ? productRaw.image : "";
        return {
          productId: productRaw._id,
          sellerId: productRaw.sellerId as Types.ObjectId,
          title: productRaw.title,
          slug: productRaw.slug,
          unitPrice,
          quantity,
          image: imageUrl,
        };
      });

      const sellerIdSet = new Set(lineItems.map((li) => li.sellerId.toHexString()));

      await Order.create(
        [
          {
            orderNumber,
            buyerUserId: buyerOid,
            status: "Processing",
            currency,
            subtotal,
            shipping: SHIPPING_FLAT_USD,
            total: subtotal + SHIPPING_FLAT_USD,
            shippingAddress: body.shippingAddress,
            paymentMethod: body.paymentMethod,
            lineItems,
            sellerIds: [...sellerIdSet.values()].map((id) => new Types.ObjectId(id)),
          },
        ],
        { session },
      );

      await CartItem.deleteMany({ userId: buyerOid }).session(session).exec();
    });

    const doc = await Order.findOne({ orderNumber, buyerUserId: buyerOid }).lean().exec();
    if (!doc) {
      throw new AppError(500, "ORDER_READ_FAILED", "Order was placed but could not be loaded");
    }

    return leanOrderToSummary(doc as LeanOrder);
  } finally {
    await session.endSession();
  }
}

export async function checkoutFromPersistedCart(
  buyerUserId: string,
  body: CheckoutBodyInput,
): Promise<OrderSummaryJson> {
  for (let attempt = 0; attempt < 8; attempt++) {
    const orderNumber = allocateOrderNumber();
    try {
      return await checkoutOnce(buyerUserId, body, orderNumber);
    } catch (err) {
      if (isMongoDuplicate(err)) {
        continue;
      }
      throw err;
    }
  }

  throw new AppError(500, "CHECKOUT_TRY_AGAIN", "Could not allocate a unique order number");
}

export async function listOrdersForBuyer(buyerUserId: string): Promise<OrderSummaryJson[]> {
  const buyerOid = new Types.ObjectId(buyerUserId);
  const rows = await Order.find({ buyerUserId: buyerOid }).sort({ createdAt: -1 }).lean().exec();

  return (rows as LeanOrder[]).map(leanOrderToSummary);
}

export async function getOrderDetailForBuyer(
  buyerUserId: string,
  orderNumber: string,
): Promise<OrderSummaryJson | null> {
  const buyerOid = new Types.ObjectId(buyerUserId);
  const sanitized = orderNumber.trim();
  if (!sanitized || sanitized.length > 80) {
    return null;
  }

  const doc = await Order.findOne({
    buyerUserId: buyerOid,
    orderNumber: sanitized,
  })
    .lean()
    .exec();

  return doc ? leanOrderToSummary(doc as LeanOrder) : null;
}
