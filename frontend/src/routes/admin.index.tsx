import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQueries, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, DollarSign, ShoppingBag, Users } from "lucide-react";
import { toast } from "sonner";

import { StatCard } from "@/components/dashboard/StatCard";
import { Button } from "@/components/ui/button";
import {
  fetchAdminDashboardStats,
  fetchAdminProducts,
  fetchAdminSellers,
  patchAdminProduct,
  patchAdminSeller,
} from "@/lib/api/admin";
import { ApiError } from "@/lib/api/client";
import { getAccessToken } from "@/lib/api/auth-session";
import { isDemoProfileUser } from "@/lib/auth/profile";
import { useAppStore } from "@/store/use-app-store";
import { BarChart, Bar, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";

export const Route = createFileRoute("/admin/")({
  component: AdminOverviewPage,
});

function formatMoney(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(amount);
  } catch {
    return `${amount} ${currency}`;
  }
}

function AdminOverviewPage() {
  const user = useAppStore((s) => s.user);
  const qc = useQueryClient();
  const hydrateFromApi = Boolean(
    user && getAccessToken() && !isDemoProfileUser(user) && user.role === "admin",
  );

  const [statsQuery, sellersQuery, productsQuery] = useQueries({
    queries: [
      {
        queryKey: ["admin", "dashboard"],
        queryFn: fetchAdminDashboardStats,
        enabled: hydrateFromApi,
        staleTime: 15_000,
      },
      {
        queryKey: ["admin", "sellers", "pending-overview"],
        queryFn: () => fetchAdminSellers({ status: "pending", limit: 8 }),
        enabled: hydrateFromApi,
        staleTime: 15_000,
      },
      {
        queryKey: ["admin", "products", "pending-overview"],
        queryFn: () => fetchAdminProducts({ moderation: "pending", limit: 12 }),
        enabled: hydrateFromApi,
        staleTime: 15_000,
      },
    ],
  });

  const invalidateAdmin = async () => {
    await qc.invalidateQueries({ queryKey: ["admin"] });
  };

  const approveSellerMutation = useMutation({
    mutationFn: ({ id }: { id: string }) => patchAdminSeller(id, { status: "approved" }),
    onSuccess: () => {
      void invalidateAdmin();
      toast.success("Seller approved");
    },
    onError: (e: unknown) =>
      toast.error(e instanceof ApiError ? e.message : "Could not update seller."),
  });

  const publishProductMutation = useMutation({
    mutationFn: ({ id }: { id: string }) =>
      patchAdminProduct(id, { moderationStatus: "published" }),
    onSuccess: () => {
      void invalidateAdmin();
      toast.success("Product published");
    },
    onError: (e: unknown) =>
      toast.error(e instanceof ApiError ? e.message : "Could not publish product."),
  });

  const flagProductMutation = useMutation({
    mutationFn: ({ id }: { id: string }) => patchAdminProduct(id, { moderationStatus: "rejected" }),
    onSuccess: () => {
      void invalidateAdmin();
      toast.success("Listing rejected");
    },
    onError: (e: unknown) =>
      toast.error(e instanceof ApiError ? e.message : "Could not update listing."),
  });

  if (!hydrateFromApi) {
    return null;
  }

  if (statsQuery.isPending || sellersQuery.isPending || productsQuery.isPending) {
    return (
      <div className="py-4">
        <p className="text-sm text-muted-foreground">Loading admin data…</p>
      </div>
    );
  }

  const loadError = statsQuery.error ?? sellersQuery.error ?? productsQuery.error;
  if (loadError) {
    return (
      <div className="py-4">
        <p className="text-sm text-destructive">Could not load admin data.</p>
      </div>
    );
  }

  const stats = statsQuery.data!;
  const pendingSellers = sellersQuery.data?.sellers ?? [];
  const pendingProducts = productsQuery.data?.products ?? [];

  const chartData = stats.transactionsWeek.map((w) => ({
    day: w.label,
    transactions: w.transactions,
  }));

  const moderationBacklog = stats.sellersPending + stats.productsPending;

  return (
    <div className="min-w-0">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Platform overview</h1>
          <p className="text-sm text-muted-foreground">
            Monitor activity, sellers, and moderation across the marketplace.
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="GMV (all orders)"
          value={formatMoney(stats.gmvTotal, "USD")}
          icon={DollarSign}
        />
        <StatCard label="Orders" value={String(stats.ordersTotal)} icon={ShoppingBag} />
        <StatCard label="Registered users" value={String(stats.usersTotal)} icon={Users} />
        <StatCard
          label="Moderation backlog"
          value={String(moderationBacklog)}
          icon={AlertTriangle}
        />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[2fr_1fr]">
        <div className="rounded-2xl border border-border bg-surface p-5">
          <h3 className="text-base font-bold">Orders this week</h3>
          <p className="text-[11px] text-muted-foreground">Last seven UTC calendar days</p>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
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
                <Bar dataKey="transactions" fill="var(--color-primary)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-5">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-base font-bold">Pending seller approvals</h3>
            <Button variant="ghost" size="sm" asChild className="shrink-0">
              <Link to="/admin/sellers">Open</Link>
            </Button>
          </div>
          <div className="mt-4 space-y-3">
            {pendingSellers.length === 0 ? (
              <p className="text-sm text-muted-foreground">No shops awaiting approval.</p>
            ) : (
              pendingSellers.slice(0, 6).map((s) => (
                <div key={s.id} className="flex items-center gap-3">
                  <div className="grid h-9 w-9 place-items-center rounded-full bg-muted text-xs font-bold uppercase text-muted-foreground">
                    {(s.handle[0] ?? "?").toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold">{s.name}</p>
                    <p className="text-[11px] text-muted-foreground">
                      @{s.handle} · {s.ownerEmail}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={approveSellerMutation.isPending}
                    onClick={() => approveSellerMutation.mutate({ id: s.id })}
                  >
                    Approve
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-surface p-5">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-base font-bold">Latest listings to moderate</h3>
          <Button variant="ghost" size="sm" asChild className="shrink-0">
            <Link to="/admin/products">Open queue</Link>
          </Button>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              <tr className="border-b border-border">
                <th className="py-2">Product</th>
                <th>Seller</th>
                <th>Category</th>
                <th>Price</th>
                <th className="text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {pendingProducts.length === 0 ? (
                <tr>
                  <td className="py-8 text-muted-foreground" colSpan={5}>
                    Nothing in the moderation queue right now.
                  </td>
                </tr>
              ) : (
                pendingProducts.slice(0, 8).map((p) => (
                  <tr key={p.id} className="border-b border-border/60">
                    <td className="py-3 font-medium">{p.title}</td>
                    <td className="text-muted-foreground">
                      {p.sellerName || `@${p.sellerHandle}`}
                    </td>
                    <td className="text-muted-foreground">{p.categorySlug}</td>
                    <td className="font-semibold tabular-nums">
                      {formatMoney(p.price, p.currency)}
                    </td>
                    <td className="text-right whitespace-nowrap">
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={publishProductMutation.isPending || flagProductMutation.isPending}
                        onClick={() => publishProductMutation.mutate({ id: p.id })}
                      >
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive"
                        disabled={publishProductMutation.isPending || flagProductMutation.isPending}
                        onClick={() => flagProductMutation.mutate({ id: p.id })}
                      >
                        Flag
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
