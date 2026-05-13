import { Types } from "mongoose";

import { Order } from "../models/Order.js";

const MS_DAY = 86_400_000;

export type SellerDashboardChartPoint = {
  label: string;
  revenue: number;
};

export type SellerDashboardStatsJson = {
  revenue14d: number;
  ordersTotal: number;
  orders14d: number;
  conversion: number;
  visitors: number;
  chart: SellerDashboardChartPoint[];
};

function utcMidnight(ms: number): Date {
  const d = new Date(ms);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

export async function getSellerDashboardStats(sellerProfileId: string): Promise<SellerDashboardStatsJson> {
  const sellerOid = new Types.ObjectId(sellerProfileId);

  const now = Date.now();
  const cutoff = now - 14 * MS_DAY;

  const ordersTotal = await Order.countDocuments({ sellerIds: sellerOid }).exec();

  const orders14d = await Order.countDocuments({
    sellerIds: sellerOid,
    createdAt: { $gte: new Date(cutoff) },
  }).exec();

  const recentOrders = await Order.find({
    sellerIds: sellerOid,
    createdAt: { $gte: new Date(cutoff) },
  })
    .select("createdAt lineItems")
    .lean()
    .exec();

  const sellerHex = sellerOid.toHexString();

  let revenue14d = 0;
  const revenueByUtcDay = new Map<number, number>();

  for (const doc of recentOrders) {
    const created = doc.createdAt as Date;
    const dayMs = utcMidnight(created.getTime()).getTime();

    const lines = (
      doc.lineItems as Array<{
        sellerId: Types.ObjectId;
        unitPrice: number;
        quantity: number;
      }>
    ).filter((li) => li.sellerId.toHexString() === sellerHex);

    for (const li of lines) {
      const add = Number(li.unitPrice) * Number(li.quantity);
      revenue14d += add;
      revenueByUtcDay.set(dayMs, (revenueByUtcDay.get(dayMs) ?? 0) + add);
    }
  }

  const chart: SellerDashboardChartPoint[] = [];
  const startDay = utcMidnight(now - 13 * MS_DAY).getTime();
  for (let i = 0; i < 14; i++) {
    const dayMs = startDay + i * MS_DAY;
    chart.push({
      label: `D${i + 1}`,
      revenue: Math.round(revenueByUtcDay.get(dayMs) ?? 0),
    });
  }

  return {
    revenue14d,
    ordersTotal,
    orders14d,
    conversion: 0,
    visitors: 0,
    chart,
  };
}
