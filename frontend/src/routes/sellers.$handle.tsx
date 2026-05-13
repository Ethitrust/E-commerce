import { createFileRoute, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Star, ShieldCheck, MapPin } from "lucide-react";

import { SiteShell } from "@/components/layout/SiteShell";
import { ProductCard } from "@/components/marketplace/ProductCard";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api/client";
import { fetchSellerStorefront } from "@/lib/api/catalog";

export const Route = createFileRoute("/sellers/$handle")({
  notFoundComponent: () => (
    <SiteShell>
      <div className="container-page py-24 text-center">
        <h1 className="text-xl font-bold">Seller not found</h1>
      </div>
    </SiteShell>
  ),
  component: SellerStorefrontRoute,
});

function SellerStorefrontRoute() {
  const { handle } = Route.useParams();

  const storefrontQ = useQuery({
    queryKey: ["catalog", "seller", handle],
    queryFn: () => fetchSellerStorefront(handle),
    retry: (count, err) => (err instanceof ApiError && err.status === 404 ? false : count < 1),
  });

  if (storefrontQ.isPending) {
    return (
      <SiteShell>
        <div className="container-page py-12">
          <p className="text-sm text-muted-foreground">Loading store…</p>
        </div>
      </SiteShell>
    );
  }

  if (
    storefrontQ.isError &&
    storefrontQ.error instanceof ApiError &&
    storefrontQ.error.status === 404
  ) {
    throw notFound();
  }

  if (
    (storefrontQ.isError &&
      !(storefrontQ.error instanceof ApiError && storefrontQ.error.status === 404)) ||
    !storefrontQ.data
  ) {
    return (
      <SiteShell>
        <div className="container-page py-12">
          <p className="text-sm text-destructive">Could not load this seller.</p>
        </div>
      </SiteShell>
    );
  }

  const { seller, products, pagination } = storefrontQ.data;

  return (
    <SiteShell>
      <div className="relative h-56 overflow-hidden bg-muted md:h-72">
        <img src={seller.banner} alt="" className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent" />
      </div>
      <div className="container-page relative -mt-16">
        <div className="flex flex-col gap-5 rounded-2xl border border-border bg-surface p-6 md:flex-row md:items-center">
          <img
            src={seller.avatar}
            alt={seller.name}
            className="h-20 w-20 rounded-2xl border-4 border-surface object-cover shadow-elevated"
          />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">{seller.name}</h1>
              {seller.verified && <ShieldCheck className="h-5 w-5 text-primary" />}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{seller.bio}</p>
            <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Star className="h-3 w-3 fill-warning text-warning" />
                <span className="font-semibold text-foreground">{seller.rating}</span> (
                {seller.reviews})
              </span>
              <span>{seller.sales.toLocaleString()} sales</span>
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {seller.location}
              </span>
              <span>Joined {seller.joined}</span>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline">Message</Button>
            <Button>Follow store</Button>
          </div>
        </div>
      </div>

      <div className="container-page py-12">
        <h2 className="text-xl font-bold">All listings ({pagination.total})</h2>
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {products.map((p, i) => (
            <ProductCard key={p.id} product={p} index={i} />
          ))}
        </div>
      </div>
    </SiteShell>
  );
}
