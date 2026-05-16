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

export type SellerOrderEscrowJson = {
  escrowId: string;
  escrowStatus: string;
  inviteeEmail: string;
  amount: number;
  currency: string;
  whoPaysFees: "buyer" | "seller" | "split";
  lastEventAt: string | null;
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
  /** The escrow for this seller on this order, if any. */
  escrow: SellerOrderEscrowJson | null;
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

    const escrowsRaw =
      (doc.sellerEscrows as
        | Array<{
            sellerId: Types.ObjectId;
            escrowId: string;
            escrowStatus: string;
            inviteeEmail: string;
            amount: number;
            currency: string;
            whoPaysFees: "buyer" | "seller" | "split";
            lastEventAt?: Date | null;
          }>
        | undefined) ?? [];
    const escrowMatch = escrowsRaw.find(
      (e) => (e.sellerId as Types.ObjectId).toHexString() === sellerHex,
    );
    const escrow: SellerOrderEscrowJson | null = escrowMatch
      ? {
          escrowId: escrowMatch.escrowId,
          escrowStatus: escrowMatch.escrowStatus,
          inviteeEmail: escrowMatch.inviteeEmail,
          amount: escrowMatch.amount,
          currency: escrowMatch.currency,
          whoPaysFees: escrowMatch.whoPaysFees,
          lastEventAt:
            escrowMatch.lastEventAt instanceof Date
              ? escrowMatch.lastEventAt.toISOString()
              : null,
        }
      : null;

    return {
      orderNumber: doc.orderNumber,
      status: doc.status,
      createdAt: (doc.createdAt as Date).toISOString(),
      currency: String(doc.currency ?? "ETB"),
      orderTotal: Number(doc.total),
      buyerName: String(ship.name ?? ""),
      buyerEmail: String(ship.email ?? ""),
      sellerLines,
      sellerLinesRevenue,
      escrow,
    };
  });
}
