import { createFileRoute, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { SiteShell } from "@/components/layout/SiteShell";
import { ProductCard } from "@/components/marketplace/ProductCard";
import { ApiError } from "@/lib/api/client";
import { fetchCategoryDetail } from "@/lib/api/catalog";
import type { Product } from "@/lib/mock-data";

export const Route = createFileRoute("/categories/$slug")({
  notFoundComponent: () => (
    <SiteShell>
      <div className="container-page py-24 text-center">
        <h1 className="text-xl font-bold">Category not found</h1>
      </div>
    </SiteShell>
  ),
  component: CategoryDetailRoute,
});

function CategoryDetailRoute() {
  const { slug } = Route.useParams();

  const detailQ = useQuery({
    queryKey: ["catalog", "category", slug],
    queryFn: () => fetchCategoryDetail(slug),
    retry: (count, err) => (err instanceof ApiError && err.status === 404 ? false : count < 1),
  });

  if (detailQ.isPending) {
    return (
      <SiteShell>
        <div className="container-page py-12">
          <p className="text-sm text-muted-foreground">Loading category…</p>
        </div>
      </SiteShell>
    );
  }

  if (detailQ.isError && detailQ.error instanceof ApiError && detailQ.error.status === 404) {
    throw notFound();
  }

  if (
    (detailQ.isError && !(detailQ.error instanceof ApiError && detailQ.error.status === 404)) ||
    !detailQ.data
  ) {
    return (
      <SiteShell>
        <div className="container-page py-12">
          <p className="text-sm text-destructive">Could not load this category.</p>
        </div>
      </SiteShell>
    );
  }

  const { category, products } = detailQ.data;

  return (
    <SiteShell>
      <div className="container-page py-12">
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">Category</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">{category.name}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {category.count.toLocaleString()} listings
        </p>
        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {products.map((p: Product, i: number) => (
            <ProductCard key={p.id} product={p} index={i} />
          ))}
        </div>
      </div>
    </SiteShell>
  );
}
