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
import { fetchAdminSellers, patchAdminSeller } from "@/lib/api/admin";
import { ApiError } from "@/lib/api/client";
import { getAccessToken } from "@/lib/api/auth-session";
import { isDemoProfileUser } from "@/lib/auth/profile";
import { useAppStore } from "@/store/use-app-store";

export const Route = createFileRoute("/admin/sellers")({
  component: AdminSellersPage,
});

function AdminSellersPage() {
  const user = useAppStore((s) => s.user);
  const qc = useQueryClient();
  const hydrateFromApi = Boolean(
    user && getAccessToken() && !isDemoProfileUser(user) && user.role === "admin",
  );

  const [status, setStatus] = useState<"pending" | "approved" | "suspended" | "all">("all");

  const sellersQuery = useQuery({
    queryKey: ["admin", "sellers", status],
    queryFn: () => fetchAdminSellers({ status, limit: 100 }),
    enabled: hydrateFromApi,
    staleTime: 10_000,
  });

  const patchMutation = useMutation({
    mutationFn: ({
      id,
      body,
    }: {
      id: string;
      body: { status?: "pending" | "approved" | "suspended"; verified?: boolean };
    }) => patchAdminSeller(id, body),
    onSuccess: (_, vars) => {
      void qc.invalidateQueries({ queryKey: ["admin"] });
      toast.success(vars.body.status === "suspended" ? "Seller suspended" : "Seller updated");
    },
    onError: (e: unknown) =>
      toast.error(e instanceof ApiError ? e.message : "Could not update seller."),
  });

  if (sellersQuery.isPending) {
    return <div className="py-4 text-sm text-muted-foreground">Loading sellers…</div>;
  }

  if (sellersQuery.isError) {
    return <div className="py-4 text-sm text-destructive">Could not load sellers.</div>;
  }

  const sellers = sellersQuery.data?.sellers ?? [];
  const busy = patchMutation.isPending;

  return (
    <div className="min-w-0 space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Sellers</h1>
          <p className="text-sm text-muted-foreground">Approve new shops or suspend accounts.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium uppercase text-muted-foreground">Status</span>
          <Select
            value={status}
            onValueChange={(v) => setStatus(v as typeof status)}
            disabled={busy}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="suspended">Suspended</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-border bg-surface">
        <table className="w-full text-left text-sm">
          <thead className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground bg-muted/30">
            <tr className="border-b border-border">
              <th className="px-4 py-3">Shop</th>
              <th className="px-4 py-3">Handle</th>
              <th className="px-4 py-3">Owner</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sellers.length === 0 ? (
              <tr>
                <td className="px-4 py-8 text-muted-foreground" colSpan={6}>
                  No sellers match this filter.
                </td>
              </tr>
            ) : (
              sellers.map((s) => (
                <tr key={s.id} className="border-b border-border/60">
                  <td className="px-4 py-3 font-medium">{s.name}</td>
                  <td className="px-4 py-3 font-mono text-xs">{s.handle}</td>
                  <td className="px-4 py-3">{s.ownerName}</td>
                  <td className="px-4 py-3 text-muted-foreground">{s.ownerEmail}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold uppercase">
                      {s.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {s.status === "pending" ? (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busy}
                        onClick={() =>
                          patchMutation.mutate({ id: s.id, body: { status: "approved" } })
                        }
                      >
                        Approve
                      </Button>
                    ) : (
                      <>
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={busy || s.status === "approved"}
                          onClick={() =>
                            patchMutation.mutate({ id: s.id, body: { status: "approved" } })
                          }
                        >
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive"
                          disabled={busy || s.status === "suspended"}
                          onClick={() =>
                            patchMutation.mutate({ id: s.id, body: { status: "suspended" } })
                          }
                        >
                          Suspend
                        </Button>
                      </>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <p className="text-[11px] text-muted-foreground">
        Showing {sellers.length} of {sellersQuery.data?.pagination.total ?? sellers.length}.
      </p>
    </div>
  );
}
