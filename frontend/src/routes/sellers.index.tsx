import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { SiteShell } from "@/components/layout/SiteShell";
import { SellerCard } from "@/components/marketplace/SellerCard";
import { ApiError } from "@/lib/api/client";
import { fetchApprovedSellers } from "@/lib/api/catalog";

export const Route = createFileRoute("/sellers/")({
  component: SellersDirectoryPage,
});

function SellersDirectoryPage() {
  const sellersQuery = useQuery({
    queryKey: ["catalog", "sellers", "directory"],
    queryFn: () => fetchApprovedSellers({ limit: 100 }),
    staleTime: 60_000,
    retry: (count, err) => (err instanceof ApiError && err.status === 404 ? false : count < 1),
  });

  return (
    <SiteShell>
      <div className="container-page py-12">
        <h1 className="text-3xl font-bold tracking-tight">Top sellers</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Verified shops on Nexus. Open a storefront to browse their listings.
        </p>

        {sellersQuery.isPending ? (
          <p className="mt-8 text-sm text-muted-foreground">Loading sellers…</p>
        ) : sellersQuery.isError ? (
          <p className="mt-8 text-sm text-destructive">Could not load sellers right now.</p>
        ) : (
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {(sellersQuery.data ?? []).map((seller, i) => (
              <SellerCard key={seller.id} seller={seller} index={i} />
            ))}
          </div>
        )}
      </div>
    </SiteShell>
  );
}
