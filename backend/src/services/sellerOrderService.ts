import { Types } from "mongoose";

import { Order } from "../models/Order.js";

export type SellerOrderLineJson = {
  productId: string;
  title: string;
  slug: string;
  unitPrice: number;
  quantity: number;
  image: string;
  lineTotal: number;
};

export type SellerOrderJson = {
  orderNumber: string;
  status: string;
  createdAt: string;
  currency: string;
  orderTotal: number;
  buyerName: string;
  buyerEmail: string;
  sellerLines: SellerOrderLineJson[];
  sellerLinesRevenue: number;
};

export async function listOrdersForSeller(sellerProfileId: string): Promise<SellerOrderJson[]> {
  const sellerOid = new Types.ObjectId(sellerProfileId);
  const rows = await Order.find({ sellerIds: sellerOid }).sort({ createdAt: -1 }).lean().exec();

  return rows.map((doc) => {
    const sellerHex = sellerOid.toHexString();
    const lines = (
      doc.lineItems as Array<{
        productId: Types.ObjectId;
        sellerId: Types.ObjectId;
        title: string;
        slug: string;
        unitPrice: number;
        quantity: number;
        image: string;
      }>
    ).filter((li) => (li.sellerId as Types.ObjectId).toHexString() === sellerHex);

    const sellerLines: SellerOrderLineJson[] = lines.map((li) => {
      const qty = Number(li.quantity);
      const unit = Number(li.unitPrice);
      return {
        productId: li.productId.toString(),
        title: li.title,
        slug: li.slug,
        unitPrice: unit,
        quantity: qty,
        image: li.image,
        lineTotal: unit * qty,
      };
    });

    const sellerLinesRevenue = sellerLines.reduce((s, l) => s + l.lineTotal, 0);

    const ship = doc.shippingAddress as { name?: string; email?: string };

    return {
      orderNumber: doc.orderNumber,
      status: doc.status,
      createdAt: (doc.createdAt as Date).toISOString(),
      currency: String(doc.currency ?? "USD"),
      orderTotal: Number(doc.total),
      buyerName: String(ship.name ?? ""),
      buyerEmail: String(ship.email ?? ""),
      sellerLines,
      sellerLinesRevenue,
    };
  });
}
