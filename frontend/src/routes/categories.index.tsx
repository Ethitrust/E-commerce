import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { SiteShell } from "@/components/layout/SiteShell";
import { CategoryTile } from "@/components/marketplace/CategoryTile";
import { fetchCategories } from "@/lib/api/catalog";

export const Route = createFileRoute("/categories/")({
  component: CategoriesIndexPage,
});

function CategoriesIndexPage() {
  const { data: categories, isPending } = useQuery({
    queryKey: ["catalog", "categories"],
    queryFn: fetchCategories,
  });

  return (
    <SiteShell>
      <div className="container-page py-12">
        <h1 className="text-3xl font-bold tracking-tight">All categories</h1>
        <p className="mt-2 text-sm text-muted-foreground">Browse the full catalog by category.</p>
        {isPending ? (
          <p className="mt-8 text-sm text-muted-foreground">Loading…</p>
        ) : (
          <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {(categories ?? []).map((c) => (
              <CategoryTile key={c.slug} category={c} />
            ))}
          </div>
        )}
      </div>
    </SiteShell>
  );
}
