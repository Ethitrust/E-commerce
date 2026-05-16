import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, Mail } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api/client";
import { fetchSellerOrders, resendSellerEscrowInvitation } from "@/lib/api/seller";
import { formatPrice } from "@/lib/utils";
import { useAppStore } from "@/store/use-app-store";

export const Route = createFileRoute("/seller/orders")({
  component: SellerOrdersPage,
});

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

function SellerOrdersPage() {
  const user = useAppStore((s) => s.user);
  const qc = useQueryClient();

  const ordersQuery = useQuery({
    queryKey: ["seller", "orders", user?.id],
    queryFn: fetchSellerOrders,
    staleTime: 15_000,
  });

  const resendMutation = useMutation({
    mutationFn: (orderNumber: string) => resendSellerEscrowInvitation(orderNumber),
    onSuccess: () => {
      toast.success("Escrow invitation resent");
      void qc.invalidateQueries({ queryKey: ["seller", "orders"] });
    },
    onError: (err: unknown) =>
      toast.error(err instanceof ApiError ? err.message : "Could not resend invitation"),
  });

  if (ordersQuery.isPending) {
    return (
      <div className="py-4">
        <p className="text-sm text-muted-foreground">Loading orders…</p>
      </div>
    );
  }

  if (ordersQuery.isError) {
    return (
      <div className="py-4">
        <p className="text-sm text-destructive">Could not load orders. Try again in a moment.</p>
      </div>
    );
  }

  const orders = ordersQuery.data ?? [];

  return (
    <div className="min-w-0">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Orders</h1>
        <p className="text-sm text-muted-foreground">
          Orders that include one of your listings. Amounts reflect your line items only.
        </p>
      </div>

      <div className="mt-6 overflow-x-auto rounded-2xl border border-border bg-surface">
        <table className="w-full text-left text-sm">
          <thead className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground bg-muted/30">
            <tr className="border-b border-border">
              <th className="px-4 py-3">Order</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Product</th>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Escrow</th>
              <th className="px-4 py-3 text-right">Your total</th>
              <th className="px-4 py-3 w-10" aria-hidden />
            </tr>
          </thead>
          <tbody>
            {orders.length === 0 ? (
              <tr>
                <td className="px-4 py-12 text-muted-foreground text-center" colSpan={8}>
                  No orders include your listings yet.
                </td>
              </tr>
            ) : (
              orders.map((o) => {
                const primary = o.sellerLines[0];
                const productLabel =
                  primary?.title ??
                  (o.sellerLines.length > 1 ? `${o.sellerLines.length} items` : "(no line)");
                const customer = o.buyerName || o.buyerEmail || "—";
                const statusClass =
                  o.status.toLowerCase() === "paid" || o.status.toLowerCase() === "completed"
                    ? "bg-success/15 text-success"
                    : "bg-muted text-muted-foreground";

                const dateLabel =
                  o.createdAt && !Number.isNaN(Date.parse(o.createdAt))
                    ? new Intl.DateTimeFormat(undefined, {
                        dateStyle: "medium",
                        timeStyle: "short",
                      }).format(new Date(o.createdAt))
                    : "—";

                const hasExtras = o.sellerLines.length > 1;

                return (
                  <tr key={o.orderNumber} className="border-b border-border/60 align-top">
                    <td className="px-4 py-3 font-mono text-xs">{o.orderNumber}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-muted-foreground text-xs">
                      {dateLabel}
                    </td>
                    <td className="px-4 py-3 font-medium max-w-[200px]">
                      <span className="line-clamp-2">{productLabel}</span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{customer}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${statusClass}`}
                      >
                        {o.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {o.escrow ? (
                        <div className="flex items-center gap-2">
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${escrowStatusClass(o.escrow.escrowStatus)}`}
                            title={o.escrow.escrowId}
                          >
                            {o.escrow.escrowStatus}
                          </span>
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={resendMutation.isPending}
                            onClick={() => resendMutation.mutate(o.orderNumber)}
                            title="Resend escrow invitation email to the buyer"
                          >
                            <Mail className="mr-1 h-3 w-3" />
                            Resend
                          </Button>
                        </div>
                      ) : (
                        <span className="text-[11px] text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums">
                      {formatPrice(o.sellerLinesRevenue, o.currency)}
                    </td>
                    <td className="px-4 py-3">
                      {hasExtras ? (
                        <details className="group relative">
                          <summary className="cursor-pointer list-none grid place-items-center rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-accent-foreground">
                            <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
                            <span className="sr-only">Show line items</span>
                          </summary>
                          <ul className="absolute right-0 z-10 mt-1 max-w-[min(100vw-2rem,20rem)] rounded-lg border border-border bg-surface p-3 shadow-elevated text-xs">
                            {o.sellerLines.map((line) => (
                              <li
                                key={`${line.productId}-${line.slug}`}
                                className="flex justify-between gap-4 py-1.5 border-b border-border/50 last:border-0"
                              >
                                <span className="min-w-0 font-medium line-clamp-2">
                                  {line.title}
                                </span>
                                <span className="shrink-0 tabular-nums text-muted-foreground">
                                  ×{line.quantity} · {formatPrice(line.lineTotal, o.currency)}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </details>
                      ) : null}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
