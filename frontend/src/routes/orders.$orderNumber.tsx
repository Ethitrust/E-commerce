import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Package, ShieldCheck } from "lucide-react";

import { SiteShell } from "@/components/layout/SiteShell";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api/client";
import { getAccessToken } from "@/lib/api/auth-session";
import { fetchMyOrder } from "@/lib/api/orders";
import { isDemoProfileUser } from "@/lib/auth/profile";
import { formatPrice } from "@/lib/utils";
import { useAppStore } from "@/store/use-app-store";

export const Route = createFileRoute("/orders/$orderNumber")({
  component: OrderDetailPage,
});

export type EscrowStatus =
  | "invited"
  | "counter_pending_initiator"
  | "counter_pending_counterparty"
  | "rejected"
  | "expired"
  | "pending"
  | "active"
  | "submitted"
  | "in_review"
  | "completed"
  | "disputed"
  | "cancelled"
  | "refunded";

function escrowStatusClass(status: string): string {
  const s = status.toLowerCase();
  if (s === "active" || s === "submitted" || s === "in_review" || s === "completed") {
    return "bg-success/15 text-success";
  }
  if (s === "cancelled" || s === "rejected" || s === "expired") {
    return "bg-destructive/15 text-destructive";
  }
  if (s === "pending" || s === "invited" || s === "disputed") {
    return "bg-warning/15 text-warning-foreground";
  }
  return "bg-muted text-muted-foreground";
}

function formatDisplayDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat(undefined, { dateStyle: "long", timeStyle: "short" }).format(
      new Date(iso),
    );
  } catch {
    return iso;
  }
}

function OrderDetailPage() {
  const { orderNumber } = Route.useParams();
  const user = useAppStore((s) => s.user);
  const hydrateFromApi = Boolean(user && getAccessToken() && !isDemoProfileUser(user));

  const orderQuery = useQuery({
    queryKey: ["me", "order", user?.id, orderNumber],
    queryFn: () => fetchMyOrder(orderNumber),
    enabled: hydrateFromApi && Boolean(orderNumber),
    retry: (count, err) => !(err instanceof ApiError && err.status === 404) && count < 1,
  });

  if (!hydrateFromApi) {
    return (
      <SiteShell>
        <div className="container-page py-16">
          <h1 className="text-xl font-semibold">Order detail</h1>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">Sign in to view this order.</p>
          <Link to="/login" className="mt-8 inline-block">
            <Button>Sign in</Button>
          </Link>
        </div>
      </SiteShell>
    );
  }

  if (orderQuery.isPending) {
    return (
      <SiteShell>
        <div className="container-page py-12">
          <p className="text-sm text-muted-foreground">Loading order…</p>
        </div>
      </SiteShell>
    );
  }

  if (orderQuery.isError) {
    const notFound = orderQuery.error instanceof ApiError && orderQuery.error.status === 404;
    return (
      <SiteShell>
        <div className="container-page py-12">
          <p className="text-sm text-destructive">
            {notFound ? "We couldn’t find that order." : "Could not load this order."}
          </p>
          <Link to="/orders" className="mt-4 inline-block">
            <Button variant="outline">Back to orders</Button>
          </Link>
        </div>
      </SiteShell>
    );
  }

  const o = orderQuery.data!.order;

  return (
    <SiteShell>
      <div className="container-page py-12">
        <Link
          to="/orders"
          className="inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to orders
        </Link>

        <div className="mt-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Order {o.orderNumber}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Placed {formatDisplayDate(o.createdAt)} · {o.status}
            </p>
          </div>
          <p className="text-xl font-bold tabular-nums">{formatPrice(o.total, o.currency)}</p>
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-2">
          <div className="rounded-2xl border border-border bg-surface p-5">
            <h2 className="text-sm font-bold">Shipping address</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              {o.shippingAddress.name}
              <br />
              {o.shippingAddress.line1}
              <br />
              {o.shippingAddress.city}, {o.shippingAddress.postalCode}
              <br />
              {o.shippingAddress.country}
              <br />
              <span className="text-primary">{o.shippingAddress.email}</span>
            </p>
            <p className="mt-4 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Payment · {o.paymentMethod.replace(/_/g, " ")}
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-surface p-5">
            <h2 className="text-sm font-bold">Order summary</h2>
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <dt>Subtotal</dt>
                <dd className="tabular-nums">{formatPrice(o.subtotal, o.currency)}</dd>
              </div>
              <div className="flex justify-between">
                <dt>Shipping</dt>
                <dd className="tabular-nums">{formatPrice(o.shipping, o.currency)}</dd>
              </div>
              <div className="flex justify-between font-bold">
                <dt>Total</dt>
                <dd className="tabular-nums">{formatPrice(o.total, o.currency)}</dd>
              </div>
            </dl>
          </div>
        </div>

        {o.sellerEscrows.length > 0 && (
          <section className="mt-8 rounded-2xl border border-border bg-surface p-5">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-bold">Escrow protection</h2>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Your payment to each seller is held in a separate escrow until you confirm receipt.
              Check your email at{" "}
              <span className="font-semibold text-foreground">{o.shippingAddress.email}</span> for
              the funding invitation.
            </p>
            <ul className="mt-4 space-y-3">
              {o.sellerEscrows.map((esc) => (
                <li
                  key={esc.escrowId}
                  className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-border bg-background p-3"
                >
                  <div className="min-w-0">
                    <p className="font-mono text-[11px] text-muted-foreground">{esc.escrowId}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Fees: <span className="capitalize">{esc.whoPaysFees}</span>
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${escrowStatusClass(esc.escrowStatus)}`}
                    >
                      {esc.escrowStatus}
                    </span>
                    <span className="text-sm font-bold tabular-nums">
                      {formatPrice(esc.amount, esc.currency)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

        <h2 className="mt-10 text-lg font-bold">Items</h2>
        <div className="mt-4 space-y-3">
          {o.lineItems.map((line) => (
            <Link
              key={`${o.orderNumber}-${line.productId}`}
              to="/products/$slug"
              params={{ slug: line.slug }}
              className="flex items-center gap-4 rounded-2xl border border-border bg-surface p-4 hover:border-primary/40"
            >
              <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-muted">
                <img src={line.image} alt="" className="h-full w-full object-cover" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{line.title}</p>
                <p className="text-xs text-muted-foreground">
                  {formatPrice(line.unitPrice, o.currency)} × {line.quantity}
                </p>
              </div>
              <Package className="h-4 w-4 text-muted-foreground" />
            </Link>
          ))}
        </div>
      </div>
    </SiteShell>
  );
}
