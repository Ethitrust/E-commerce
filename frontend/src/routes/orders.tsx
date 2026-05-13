import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Package } from "lucide-react";

import { SiteShell } from "@/components/layout/SiteShell";
import { Button } from "@/components/ui/button";
import { getAccessToken } from "@/lib/api/auth-session";
import { fetchMyOrders } from "@/lib/api/orders";
import { isDemoProfileUser } from "@/lib/auth/profile";
import { useAppStore } from "@/store/use-app-store";

export const Route = createFileRoute("/orders")({
  component: OrdersPage,
});

const statusStyles: Record<string, string> = {
  Delivered: "bg-success/15 text-success",
  Shipped: "bg-primary/15 text-primary",
  Processing: "bg-warning/15 text-warning-foreground",
};

function formatDisplayDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(
      new Date(iso),
    );
  } catch {
    return iso;
  }
}

function OrdersPage() {
  const user = useAppStore((s) => s.user);
  const hydrateFromApi = Boolean(user && getAccessToken() && !isDemoProfileUser(user));

  const ordersQuery = useQuery({
    queryKey: ["me", "orders", user?.id],
    queryFn: fetchMyOrders,
    enabled: hydrateFromApi,
    staleTime: 15_000,
  });

  if (!hydrateFromApi) {
    return (
      <SiteShell>
        <div className="container-page py-16">
          <h1 className="text-3xl font-bold tracking-tight">My orders</h1>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">
            Sign in with your Nexus account to see orders placed through checkout. Demo profiles
            browse the UI offline only.
          </p>
          <Link to="/login" className="mt-8 inline-block">
            <Button>Sign in</Button>
          </Link>
        </div>
      </SiteShell>
    );
  }

  if (ordersQuery.isPending) {
    return (
      <SiteShell>
        <div className="container-page py-12">
          <p className="text-sm text-muted-foreground">Loading your orders…</p>
        </div>
      </SiteShell>
    );
  }

  if (ordersQuery.isError) {
    return (
      <SiteShell>
        <div className="container-page py-12">
          <p className="text-sm text-destructive">Could not load orders.</p>
        </div>
      </SiteShell>
    );
  }

  const orders = ordersQuery.data?.orders ?? [];

  return (
    <SiteShell>
      <div className="container-page py-12">
        <h1 className="text-3xl font-bold tracking-tight">My orders</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Track shipments, returns, and past purchases from your Nexus account.
        </p>

        {orders.length === 0 ? (
          <div className="mt-12 rounded-2xl border border-dashed border-border bg-surface p-16 text-center">
            <Package className="mx-auto h-10 w-10 text-muted-foreground" />
            <p className="mt-4 text-base font-semibold">No orders yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              When you check out, your purchases show up here.
            </p>
            <Link to="/products" className="mt-6 inline-block">
              <Button>Browse products</Button>
            </Link>
          </div>
        ) : (
          <div className="mt-8 space-y-4">
            {orders.map((o) => (
              <div key={o.orderNumber} className="rounded-2xl border border-border bg-surface p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        to="/orders/$orderNumber"
                        params={{ orderNumber: o.orderNumber }}
                        className="text-sm font-bold text-primary hover:underline"
                      >
                        Order {o.orderNumber}
                      </Link>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${statusStyles[o.status] ?? "bg-muted text-muted-foreground"}`}
                      >
                        {o.status}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Placed {formatDisplayDate(o.createdAt)}
                    </p>
                  </div>
                  <p className="text-base font-bold tabular-nums">${o.total.toLocaleString()}</p>
                </div>
                <div className="mt-4 flex flex-wrap gap-3">
                  {o.lineItems.map((line) => (
                    <Link
                      key={`${o.orderNumber}-${line.productId}`}
                      to="/products/$slug"
                      params={{ slug: line.slug }}
                      className="flex min-w-60 flex-1 items-center gap-3 rounded-xl border border-border bg-background p-3 hover:border-primary/40"
                    >
                      <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-muted">
                        <img src={line.image} alt="" className="h-full w-full object-cover" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-1 text-xs font-semibold">{line.title}</p>
                        <p className="text-[11px] text-muted-foreground">
                          ${line.unitPrice.toLocaleString()} × {line.quantity}
                        </p>
                      </div>
                      <Package className="h-4 w-4 shrink-0 text-muted-foreground" />
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </SiteShell>
  );
}
