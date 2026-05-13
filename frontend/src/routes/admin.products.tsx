import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { fetchAdminProducts, patchAdminProduct } from "@/lib/api/admin";
import { ApiError } from "@/lib/api/client";
import { getAccessToken } from "@/lib/api/auth-session";
import { isDemoProfileUser } from "@/lib/auth/profile";
import { useAppStore } from "@/store/use-app-store";

function formatMoney(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(amount);
  } catch {
    return `${amount} ${currency}`;
  }
}

export const Route = createFileRoute("/admin/products")({
  component: AdminProductsPage,
});

function AdminProductsPage() {
  const user = useAppStore((s) => s.user);
  const qc = useQueryClient();
  const hydrateFromApi = Boolean(
    user && getAccessToken() && !isDemoProfileUser(user) && user.role === "admin",
  );

  const [moderation, setModeration] = useState<
    "pending" | "draft" | "published" | "rejected" | "all"
  >("pending");

  const productsQuery = useQuery({
    queryKey: ["admin", "products", moderation],
    queryFn: () => fetchAdminProducts({ moderation, limit: 100 }),
    enabled: hydrateFromApi,
    staleTime: 10_000,
  });

  const patchMutation = useMutation({
    mutationFn: ({
      id,
      moderationStatus,
    }: {
      id: string;
      moderationStatus: "published" | "rejected" | "draft";
    }) => patchAdminProduct(id, { moderationStatus }),
    onSuccess: (_, vars) => {
      void qc.invalidateQueries({ queryKey: ["admin"] });
      const label =
        vars.moderationStatus === "published"
          ? "Published"
          : vars.moderationStatus === "rejected"
            ? "Rejected"
            : "Updated";
      toast.success(label);
    },
    onError: (e: unknown) =>
      toast.error(e instanceof ApiError ? e.message : "Could not update product."),
  });

  if (productsQuery.isPending) {
    return <div className="py-4 text-sm text-muted-foreground">Loading listings…</div>;
  }

  if (productsQuery.isError) {
    return <div className="py-4 text-sm text-destructive">Could not load products.</div>;
  }

  const products = productsQuery.data?.products ?? [];
  const busy = patchMutation.isPending;

  return (
    <div className="min-w-0 space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Products</h1>
          <p className="text-sm text-muted-foreground">
            Publish listings to the storefront or reject policy issues.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium uppercase text-muted-foreground">Moderation</span>
          <Select
            value={moderation}
            onValueChange={(v) => setModeration(v as typeof moderation)}
            disabled={busy}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="published">Published</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
              <SelectItem value="all">All</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-border bg-surface">
        <table className="w-full text-left text-sm">
          <thead className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground bg-muted/30">
            <tr className="border-b border-border">
              <th className="px-4 py-3">Product</th>
              <th className="px-4 py-3">Seller</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Price</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.length === 0 ? (
              <tr>
                <td className="px-4 py-8 text-muted-foreground" colSpan={6}>
                  No products in this queue.
                </td>
              </tr>
            ) : (
              products.map((p) => (
                <tr key={p.id} className="border-b border-border/60">
                  <td className="max-w-[200px] px-4 py-3">
                    <p className="line-clamp-2 font-medium">{p.title}</p>
                    <p className="text-[11px] text-muted-foreground font-mono">{p.slug}</p>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {p.sellerName}
                    <br />
                    <span className="text-[11px]">@{p.sellerHandle}</span>
                  </td>
                  <td className="px-4 py-3">{p.categorySlug}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold uppercase">
                      {p.moderationStatus}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right font-semibold tabular-nums">
                    {formatMoney(p.price, p.currency)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right">
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={busy || p.archived || p.moderationStatus === "published"}
                      onClick={() =>
                        patchMutation.mutate({ id: p.id, moderationStatus: "published" })
                      }
                    >
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive"
                      disabled={busy}
                      onClick={() =>
                        patchMutation.mutate({ id: p.id, moderationStatus: "rejected" })
                      }
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
      <p className="text-[11px] text-muted-foreground">
        Showing {products.length} of {productsQuery.data?.pagination.total ?? products.length}.
      </p>
    </div>
  );
}
