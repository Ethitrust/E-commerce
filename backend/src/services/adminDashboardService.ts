import { Order } from "../models/Order.js";
import { Product } from "../models/Product.js";
import { Seller } from "../models/Seller.js";
import { User } from "../models/User.js";

const MS_DAY = 86_400_000;

function utcMidnight(ms: number): Date {
  const d = new Date(ms);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

export type AdminTransactionsWeekDay = {
  label: string;
  transactions: number;
  gmv: number;
};

export type AdminDashboardStatsJson = {
  usersTotal: number;
  ordersTotal: number;
  gmvTotal: number;
  sellersPending: number;
  productsPending: number;
  /** Seven UTC calendar days ending today (older → newer). */
  transactionsWeek: AdminTransactionsWeekDay[];
};

export async function getAdminDashboardStats(): Promise<AdminDashboardStatsJson> {
  const [usersTotal, ordersTotal, gmvAgg, sellersPending, productsPending] = await Promise.all([
    User.countDocuments().exec(),
    Order.countDocuments().exec(),
    Order.aggregate<{ s: number }>([{ $group: { _id: null as null, s: { $sum: "$total" } } }]).exec(),
    Seller.countDocuments({ status: "pending" }).exec(),
    Product.countDocuments({ moderationStatus: "pending", archived: { $ne: true } }).exec(),
  ]);

  const gmvTotal =
    Array.isArray(gmvAgg) && gmvAgg[0]?.s !== undefined ? Number(gmvAgg[0].s) : 0;

  const now = Date.now();
  const endDayInclusive = utcMidnight(now).getTime();
  const startDayInclusive = endDayInclusive - 6 * MS_DAY;

  const buckets = await Order.aggregate<{ _id: string; c: number; gmv: number }>([
    {
      $match: {
        createdAt: {
          $gte: new Date(startDayInclusive),
          $lte: new Date(now),
        },
      },
    },
    {
      $group: {
        _id: {
          $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: "UTC" },
        },
        c: { $sum: 1 },
        gmv: { $sum: "$total" },
      },
    },
  ]).exec();

  const map = new Map(buckets.map((b) => [b._id, { transactions: b.c, gmv: Number(b.gmv) }]));

  const weekFmt = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    timeZone: "UTC",
  });

  const transactionsWeek: AdminTransactionsWeekDay[] = [];
  for (let i = 0; i < 7; i++) {
    const dayMs = startDayInclusive + i * MS_DAY;
    const keyDate = new Date(dayMs + MS_DAY / 2);
    const iso = isoUtcDate(keyDate);
    const hit = map.get(iso);
    transactionsWeek.push({
      label: weekFmt.format(keyDate),
      transactions: hit?.transactions ?? 0,
      gmv: hit ? Math.round(hit.gmv) : 0,
    });
  }

  return {
    usersTotal,
    ordersTotal,
    gmvTotal,
    sellersPending,
    productsPending,
    transactionsWeek,
  };
}

function isoUtcDate(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
