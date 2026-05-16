import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Flame, Clock, Sparkles } from "lucide-react";

import { SiteShell } from "@/components/layout/SiteShell";
import { Hero } from "@/components/marketplace/Hero";
import { CategoryTile } from "@/components/marketplace/CategoryTile";
import { ProductCard } from "@/components/marketplace/ProductCard";
import { SellerCard } from "@/components/marketplace/SellerCard";
import { SectionHeader } from "@/components/marketplace/SectionHeader";
import { fetchApprovedSellers, fetchCategories, fetchProductsList } from "@/lib/api/catalog";
import { formatPrice } from "@/lib/utils";

export const Route = createFileRoute("/")({
  component: HomePage,
});

function HomePage() {
  const categoriesQ = useQuery({
    queryKey: ["catalog", "categories"],
    queryFn: fetchCategories,
  });
  const homeFeedQ = useQuery({
    queryKey: ["catalog", "products", "home-feed"],
    queryFn: () => fetchProductsList({ limit: 48, sort: "newest" }),
  });
  const sellersQ = useQuery({
    queryKey: ["catalog", "sellers", { limit: 8 }],
    queryFn: () => fetchApprovedSellers({ limit: 8 }),
  });

  const items = homeFeedQ.data?.items ?? [];
  const trending = items.slice(0, 8);
  const deals = items.filter((p) => p.originalPrice).slice(0, 4);
  const recommended = items.slice(8, 16);

  return (
    <SiteShell>
      <Hero />

      <section className="container-page py-16">
        <SectionHeader
          eyebrow="Browse"
          title="Featured categories"
          description="Find what you love across millions of curated listings."
          href="/categories"
        />
        {categoriesQ.isPending ? (
          <p className="text-sm text-muted-foreground">Loading categories…</p>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-8">
            {(categoriesQ.data ?? []).map((c) => (
              <CategoryTile key={c.slug} category={c} />
            ))}
          </div>
        )}
      </section>

      <section className="container-page pb-16">
        <SectionHeader
          eyebrow="Hot right now"
          title="Trending products"
          description="What buyers are picking up this week."
          href="/products"
        />
        {homeFeedQ.isPending ? (
          <p className="text-sm text-muted-foreground">Loading products…</p>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {trending.map((p, i) => (
              <ProductCard key={p.id} product={p} index={i} />
            ))}
          </div>
        )}
      </section>

      {/* Flash deals banner */}
      <section className="container-page pb-16">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="overflow-hidden rounded-3xl border border-border bg-foreground text-background"
        >
          <div className="grid items-center gap-8 p-8 md:grid-cols-[1.2fr_2fr] md:p-10">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-background/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-widest">
                <Flame className="h-3 w-3" /> Flash deals
              </div>
              <h2 className="mt-4 text-3xl font-bold leading-tight md:text-4xl">
                Up to 40% off — ends in 6h.
              </h2>
              <p className="mt-2 text-sm text-background/70">
                Limited-stock drops from verified sellers, refreshed every hour.
              </p>
              <div className="mt-5 flex gap-3">
                <Link
                  to="/products"
                  className="inline-flex items-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary-hover"
                >
                  Shop deals
                </Link>
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4" />
                  <span className="font-mono font-bold tabular-nums">05:42:18</span>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {!homeFeedQ.isPending &&
                deals.map((p, i) => (
                  <Link
                    key={p.id}
                    to="/products/$slug"
                    params={{ slug: p.slug }}
                    className="group relative aspect-square overflow-hidden rounded-2xl border border-background/10 bg-background/5"
                  >
                    <img
                      src={p.image}
                      alt={p.title}
                      className="h-full w-full object-cover transition-transform group-hover:scale-105"
                    />
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-3">
                      <p className="line-clamp-1 text-xs font-semibold">{p.title}</p>
                      <p className="text-sm font-bold text-primary">{formatPrice(p.price, p.currency)}</p>
                    </div>
                    {i === 0 && (
                      <span className="absolute left-2 top-2 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground">
                        -40%
                      </span>
                    )}
                  </Link>
                ))}
            </div>
          </div>
        </motion.div>
      </section>

      <section className="container-page pb-16">
        <SectionHeader
          eyebrow="For you"
          title="Recommended picks"
          description="Curated based on what's trending across categories."
          href="/products"
        />
        {!homeFeedQ.isPending && (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {recommended.map((p, i) => (
              <ProductCard key={p.id} product={p} index={i} />
            ))}
          </div>
        )}
      </section>

      <section className="container-page pb-16">
        <SectionHeader
          eyebrow="Top stores"
          title="Popular sellers"
          description="Verified merchants buyers trust around the world."
        />
        {sellersQ.isPending ? (
          <p className="text-sm text-muted-foreground">Loading sellers…</p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {(sellersQ.data ?? []).map((s, i) => (
              <SellerCard key={s.id} seller={s} index={i} />
            ))}
          </div>
        )}
      </section>

      <section className="container-page pb-24">
        <div className="overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-primary to-primary-hover p-10 text-primary-foreground md:p-14">
          <div className="grid items-center gap-8 md:grid-cols-[1.5fr_1fr]">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-background/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-widest">
                <Sparkles className="h-3 w-3" /> Become a seller
              </div>
              <h2 className="mt-4 text-3xl font-bold md:text-4xl">Open your store in minutes.</h2>
              <p className="mt-3 max-w-xl text-primary-foreground/85">
                Join thousands of professional sellers using our analytics, payments, and logistics
                infrastructure to scale globally.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  to="/register"
                  className="inline-flex items-center rounded-lg bg-background px-5 py-2.5 text-sm font-semibold text-foreground hover:bg-background/90"
                >
                  Start selling free
                </Link>
                <Link
                  to="/about"
                  className="inline-flex items-center rounded-lg border border-background/30 px-5 py-2.5 text-sm font-semibold hover:bg-background/10"
                >
                  How it works
                </Link>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4 text-center">
              {[
                ["8.4M", "Monthly buyers"],
                ["120k", "Active sellers"],
                ["180+", "Countries"],
              ].map(([v, l]) => (
                <div key={l} className="rounded-2xl bg-background/10 p-4">
                  <p className="text-2xl font-bold">{v}</p>
                  <p className="mt-1 text-[11px] uppercase tracking-widest text-primary-foreground/80">
                    {l}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </SiteShell>
  );
}
