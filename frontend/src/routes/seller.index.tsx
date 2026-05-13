import { createFileRoute, Link } from "@tanstack/react-router";
import { useQueries } from "@tanstack/react-query";
import { DollarSign, ShoppingBag, TrendingUp, Users } from "lucide-react";

import { StatCard } from "@/components/dashboard/StatCard";
import { Button } from "@/components/ui/button";
import {
  fetchSellerDashboardStats,
  fetchSellerOrders,
  fetchSellerProducts,
} from "@/lib/api/seller";
import { getAccessToken } from "@/lib/api/auth-session";
import { isDemoProfileUser } from "@/lib/auth/profile";
import { useAppStore } from "@/store/use-app-store";
import {
  LineChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";

export const Route = createFileRoute("/seller/")({
  component: SellerOverviewPage,
});

function formatUsd(amount: number): string {
  return new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" }).format(amount);
}

function SellerOverviewPage() {
  const user = useAppStore((s) => s.user);

  const hydrateFromApi = Boolean(
    user && getAccessToken() && !isDemoProfileUser(user) && user.role === "seller",
  );

  const [statsQuery, productsQuery, ordersQuery] = useQueries({
    queries: [
      {
        queryKey: ["seller", "dashboard", user?.id],
        queryFn: fetchSellerDashboardStats,
        enabled: hydrateFromApi,
        staleTime: 15_000,
      },
      {
        queryKey: ["seller", "products", user?.id],
        queryFn: fetchSellerProducts,
        enabled: hydrateFromApi,
        staleTime: 15_000,
      },
      {
        queryKey: ["seller", "orders", user?.id],
        queryFn: fetchSellerOrders,
        enabled: hydrateFromApi,
        staleTime: 15_000,
      },
    ],
  });

  if (!hydrateFromApi) {
    return null;
  }

  if (statsQuery.isPending || productsQuery.isPending || ordersQuery.isPending) {
    return (
      <div className="py-4">
        <p className="text-sm text-muted-foreground">Loading your dashboard…</p>
      </div>
    );
  }

  const loadError = statsQuery.error ?? productsQuery.error ?? ordersQuery.error;
  if (loadError) {
    return (
      <div className="py-4">
        <p className="text-sm text-destructive">
          Could not load seller data. Try again in a moment.
        </p>
      </div>
    );
  }

  const stats = statsQuery.data!;
  const products = productsQuery.data ?? [];
  const orders = ordersQuery.data ?? [];

  const chartData = stats.chart.map((p) => ({ day: p.label, revenue: p.revenue }));
  const topProducts = [...products].sort((a, b) => b.sold - a.sold).slice(0, 5);
  const recentOrders = orders.slice(0, 6);

  return (
    <div className="min-w-0">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Welcome back, {user!.name}</h1>
          <p className="text-sm text-muted-foreground">
            Here&apos;s what&apos;s happening with your store today.
          </p>
        </div>
        <Link to="/seller/products">
          <Button>Add new product</Button>
        </Link>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Revenue (14 days)" value={formatUsd(stats.revenue14d)} icon={DollarSign} />
        <StatCard label="Orders (total)" value={String(stats.ordersTotal)} icon={ShoppingBag} />
        <StatCard label="Conversion" value={`${stats.conversion}%`} icon={TrendingUp} />
        <StatCard
          label="Visitors"
          value={stats.visitors ? String(stats.visitors) : "0"}
          icon={Users}
        />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[2fr_1fr]">
        <div className="rounded-2xl border border-border bg-surface p-5">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold">Revenue (last 14 days)</h3>
            <span className="text-xs text-muted-foreground">USD</span>
          </div>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="day" stroke="var(--color-muted-foreground)" fontSize={11} />
                <YAxis stroke="var(--color-muted-foreground)" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    background: "var(--color-surface)",
                    border: "1px solid var(--color-border)",
                    borderRadius: 12,
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="var(--color-primary)"
                  strokeWidth={2.5}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-5">
          <h3 className="text-base font-bold">Top products</h3>
          <div className="mt-4 space-y-3">
            {topProducts.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No products yet — add your first listing.
              </p>
            ) : (
              topProducts.map((p) => (
                <div key={p.id} className="flex items-center gap-3">
                  <div className="h-10 w-10 overflow-hidden rounded-lg bg-muted">
                    <img src={p.image} alt="" className="h-full w-full object-cover" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-1 text-xs font-semibold">{p.title}</p>
                    <p className="text-[11px] text-muted-foreground">{formatUsd(p.price)}</p>
                  </div>
                  <span className="text-xs font-bold tabular-nums text-success">+{p.sold}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-surface p-5">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold">Recent orders</h3>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/seller/orders">View all</Link>
          </Button>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              <tr className="border-b border-border">
                <th className="py-2">Order</th>
                <th>Product</th>
                <th>Customer</th>
                <th>Status</th>
                <th className="text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {recentOrders.length === 0 ? (
                <tr>
                  <td className="py-6 text-sm text-muted-foreground" colSpan={5}>
                    No orders include your listings yet.
                  </td>
                </tr>
              ) : (
                recentOrders.map((o) => {
                  const primary = o.sellerLines[0];
                  const productLabel =
                    primary?.title ??
                    (o.sellerLines.length > 1 ? `${o.sellerLines.length} items` : "(no line)");
                  const customer = o.buyerName || o.buyerEmail || "—";
                  const statusClass =
                    o.status.toLowerCase() === "paid" || o.status.toLowerCase() === "completed"
                      ? "bg-success/15 text-success"
                      : "bg-muted text-muted-foreground";
                  return (
                    <tr key={o.orderNumber} className="border-b border-border/60">
                      <td className="py-3 font-mono text-xs">{o.orderNumber}</td>
                      <td className="font-medium">{productLabel}</td>
                      <td className="text-muted-foreground">{customer}</td>
                      <td>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${statusClass}`}
                        >
                          {o.status}
                        </span>
                      </td>
                      <td className="text-right font-semibold tabular-nums">
                        {formatUsd(o.sellerLinesRevenue)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">
          Amounts reflect your line items only (seller subtotal), not full order totals from buyers.
        </p>
      </div>
    </div>
  );
}
