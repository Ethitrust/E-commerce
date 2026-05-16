import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { SlidersHorizontal, X } from "lucide-react";

import { SiteShell } from "@/components/layout/SiteShell";
import { ProductCard } from "@/components/marketplace/ProductCard";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { fetchCategories, fetchProductsList } from "@/lib/api/catalog";

interface SearchParams {
  q?: string;
  cat?: string;
  sort?: string;
}

function catalogSortFromSearch(
  sort: string | undefined,
  q: string | undefined,
): string | undefined {
  if (sort && sort !== "") return sort;
  return q?.trim() ? "relevance" : undefined;
}

export const Route = createFileRoute("/products/")({
  validateSearch: (s: Record<string, unknown>): SearchParams => ({
    q: typeof s.q === "string" ? s.q : undefined,
    cat: typeof s.cat === "string" ? s.cat : undefined,
    sort: typeof s.sort === "string" ? s.sort : undefined,
  }),
  component: ProductsPage,
});

function ProductsPage() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const [price, setPrice] = useState<number[]>([0, 3000]);
  const [openFilters, setOpenFilters] = useState(false);
  const [conds, setConds] = useState<string[]>([]);

  const categoriesQ = useQuery({
    queryKey: ["catalog", "categories"],
    queryFn: fetchCategories,
  });
  const categories = categoriesQ.data ?? [];

  const listQuery = useQuery({
    queryKey: ["catalog", "products", "list", search.q, search.cat, search.sort],
    queryFn: () =>
      fetchProductsList({
        page: 1,
        limit: 48,
        q: search.q,
        category: search.cat,
        sort: catalogSortFromSearch(search.sort, search.q),
      }),
  });

  const filtered = useMemo(() => {
    let list = [...(listQuery.data?.items ?? [])];
    list = list.filter((p) => p.price >= price[0] && p.price <= price[1]);
    if (conds.length === 0) return list;

    return list.filter((p) => {
      const conditionSpec = p.specs.find((s) => s.label === "Condition")?.value;
      if (!conditionSpec) return false;
      return conds.some((c) => conditionSpec.includes(c));
    });
  }, [listQuery.data?.items, price, conds]);

  const heading =
    search.cat === undefined
      ? "Marketplace"
      : (categories.find((c) => c.slug === search.cat)?.name ?? "Marketplace");

  const Filters = (
    <div className="space-y-6">
      <div>
        <h4 className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Categories
        </h4>
        <div className="space-y-1">
          <button
            type="button"
            onClick={() => navigate({ search: (p) => ({ ...p, cat: undefined }) })}
            className={`block w-full rounded-md px-2 py-1.5 text-left text-sm ${!search.cat ? "bg-accent font-semibold" : "hover:bg-accent/60"}`}
          >
            All categories
          </button>
          {categories.map((c) => (
            <button
              type="button"
              key={c.slug}
              onClick={() => navigate({ search: (p) => ({ ...p, cat: c.slug }) })}
              className={`flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm ${search.cat === c.slug ? "bg-accent font-semibold" : "hover:bg-accent/60"}`}
            >
              <span>{c.name}</span>
              <span className="text-[10px] text-muted-foreground">{c.count}</span>
            </button>
          ))}
        </div>
      </div>
      <div>
        <h4 className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Price range
        </h4>
        <Slider value={price} onValueChange={setPrice} min={0} max={3000} step={50} />
        <div className="mt-2 flex justify-between text-xs text-muted-foreground">
          <span>${price[0]}</span>
          <span>${price[1]}</span>
        </div>
      </div>
      <div>
        <h4 className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Condition
        </h4>
        {["Brand New", "Used - Like New", "Refurbished"].map((c) => (
          <label key={c} className="flex items-center gap-2 py-1 text-sm">
            <Checkbox
              checked={conds.includes(c)}
              onCheckedChange={(v) => setConds(v ? [...conds, c] : conds.filter((x) => x !== c))}
            />
            {c}
          </label>
        ))}
      </div>
    </div>
  );

  return (
    <SiteShell>
      <div className="container-page py-8">
        <div className="mb-6 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{heading}</h1>
            <p className="text-sm text-muted-foreground">
              {listQuery.isPending
                ? "Loading listings…"
                : `${filtered.length.toLocaleString()} listings${search.q ? ` for "${search.q}"` : ""}`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="lg:hidden"
              onClick={() => setOpenFilters(true)}
            >
              <SlidersHorizontal className="mr-1 h-4 w-4" />
              Filters
            </Button>
            <select
              value={search.sort ?? ""}
              onChange={(e) =>
                navigate({ search: (p) => ({ ...p, sort: e.target.value || undefined }) })
              }
              className="h-9 rounded-md border border-border bg-surface px-3 text-sm outline-none focus:ring-2 focus:ring-primary/15"
            >
              <option value="">Sort: Featured</option>
              <option value="price-asc">Price: Low to high</option>
              <option value="price-desc">Price: High to low</option>
              <option value="rating">Top rated</option>
              <option value="newest">Newest</option>
              <option value="relevance">Relevance</option>
            </select>
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-[260px_1fr]">
          <aside className="hidden lg:block">{Filters}</aside>

          {openFilters && (
            <div className="fixed inset-0 z-50 lg:hidden">
              <div
                className="absolute inset-0 bg-foreground/40"
                onClick={() => setOpenFilters(false)}
                aria-hidden
              />
              <div className="absolute inset-y-0 left-0 w-80 max-w-[85vw] overflow-y-auto bg-background p-6">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-base font-bold">Filters</h3>
                  <button
                    type="button"
                    onClick={() => setOpenFilters(false)}
                    aria-label="Close filters"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
                {Filters}
              </div>
            </div>
          )}

          <div>
            {listQuery.isPending ? (
              <p className="text-sm text-muted-foreground">Loading products…</p>
            ) : filtered.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border bg-surface p-16 text-center">
                <p className="text-base font-semibold">No products match your filters</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Try widening your price range or clearing the search.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
                {filtered.map((p, i) => (
                  <ProductCard key={p.id} product={p} index={i} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </SiteShell>
  );
}
