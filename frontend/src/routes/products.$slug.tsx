import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Star, Heart, ShoppingCart, ShieldCheck, Truck, Repeat, ChevronRight } from "lucide-react";

import { SiteShell } from "@/components/layout/SiteShell";
import { ProductCard } from "@/components/marketplace/ProductCard";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Product, Seller } from "@/lib/mock-data";
import { getSeller } from "@/lib/mock-data";
import { ApiError } from "@/lib/api/client";
import { fetchProductBySlug, fetchProductsList, fetchSellerStorefront } from "@/lib/api/catalog";
import { formatPrice } from "@/lib/utils";
import { useAppStore } from "@/store/use-app-store";
import { toast } from "sonner";

export const Route = createFileRoute("/products/$slug")({
  notFoundComponent: () => (
    <SiteShell>
      <div className="container-page py-24 text-center">
        <h1 className="text-2xl font-bold">Product not found</h1>
        <Link
          to="/products"
          className="mt-4 inline-block text-sm font-semibold text-primary hover:underline"
        >
          Back to marketplace
        </Link>
      </div>
    </SiteShell>
  ),
  component: ProductDetailPage,
});

function sellerFallbackFromProduct(product: Product): Seller | null {
  const embedded = product.seller;
  if (!embedded) return getSeller(product.sellerId) ?? null;
  const mock = getSeller(product.sellerId);
  return (
    mock ?? {
      id: embedded.id,
      name: embedded.name,
      handle: embedded.handle,
      avatar: embedded.avatar,
      rating: product.rating,
      reviews: product.reviews,
      sales: product.sold,
      joined: "",
      location: "Worldwide shipping",
      banner: embedded.avatar,
      bio: `Shop quality listings from ${embedded.name}.`,
      verified: false,
    }
  );
}

function ProductDetailPage() {
  const { slug } = Route.useParams();
  const productQ = useQuery({
    queryKey: ["catalog", "product", slug],
    queryFn: () => fetchProductBySlug(slug),
    retry: (count, err) => (err instanceof ApiError && err.status === 404 ? false : count < 1),
  });

  const product = productQ.data;

  const storefrontQ = useQuery({
    queryKey: ["catalog", "seller", "storefront", product?.seller?.handle],
    queryFn: () => fetchSellerStorefront(product!.seller!.handle),
    enabled: Boolean(product?.seller?.handle),
  });

  const relatedQ = useQuery({
    queryKey: ["catalog", "products", "related", product?.categorySlug, product?.id],
    queryFn: () =>
      fetchProductsList({
        category: product!.categorySlug,
        limit: 12,
        sort: "newest",
      }),
    enabled: Boolean(product?.categorySlug),
  });

  const [activeImg, setActiveImg] = useState("");
  const [qty, setQty] = useState(1);
  const { addToCart, toggleWishlist, wishlist, pushRecent } = useAppStore();

  useEffect(() => {
    if (!product) return;
    void pushRecent(product.id);
    setActiveImg(product.image);
    setQty(1);
  }, [product, pushRecent]);

  if (productQ.isPending) {
    return (
      <SiteShell>
        <div className="container-page py-12">
          <p className="text-sm text-muted-foreground">Loading product…</p>
        </div>
      </SiteShell>
    );
  }

  if (productQ.isError && productQ.error instanceof ApiError && productQ.error.status === 404) {
    throw notFound();
  }

  if (
    (productQ.isError && !(productQ.error instanceof ApiError && productQ.error.status === 404)) ||
    !product
  ) {
    return (
      <SiteShell>
        <div className="container-page py-12">
          <p className="text-sm text-destructive">Could not load this product.</p>
        </div>
      </SiteShell>
    );
  }

  const seller = storefrontQ.data?.seller ?? sellerFallbackFromProduct(product);
  const isWished = wishlist.includes(product.id);
  const related = (relatedQ.data?.items ?? []).filter((p) => p.id !== product.id).slice(0, 4);
  const displayImg = activeImg || product.image;

  return (
    <SiteShell>
      <div className="container-page py-8">
        <nav className="mb-6 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Link to="/" className="hover:text-foreground">
            Home
          </Link>
          <ChevronRight className="h-3 w-3" />
          <Link to="/products" className="hover:text-foreground">
            Marketplace
          </Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-foreground">{product.title}</span>
        </nav>

        <div className="grid gap-10 lg:grid-cols-[1.1fr_1fr]">
          <div>
            <div className="aspect-square overflow-hidden rounded-2xl border border-border bg-muted">
              <img src={displayImg} alt={product.title} className="h-full w-full object-cover" />
            </div>
            <div className="mt-3 grid grid-cols-4 gap-2">
              {product.gallery.map((g: string) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setActiveImg(g)}
                  className={`aspect-square overflow-hidden rounded-xl border-2 transition-all ${displayImg === g ? "border-primary" : "border-transparent hover:border-border"}`}
                >
                  <img src={g} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2">
              {product.badge && (
                <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary-foreground">
                  {product.badge}
                </span>
              )}
              <Link
                to="/categories/$slug"
                params={{ slug: product.categorySlug }}
                className="text-xs font-semibold uppercase tracking-widest text-muted-foreground hover:text-foreground"
              >
                {product.category}
              </Link>
            </div>
            <h1 className="mt-3 text-3xl font-bold tracking-tight">{product.title}</h1>
            <div className="mt-3 flex items-center gap-3 text-sm">
              <div className="flex items-center gap-1">
                <Star className="h-4 w-4 fill-warning text-warning" />
                <span className="font-semibold">{product.rating.toFixed(1)}</span>
                <span className="text-muted-foreground">({product.reviews} reviews)</span>
              </div>
              <span className="text-muted-foreground">·</span>
              <span className="text-muted-foreground">{product.sold.toLocaleString()} sold</span>
            </div>

            <div className="mt-6 rounded-2xl border border-border bg-surface p-5">
              <div className="flex items-baseline gap-3">
                <span className="text-3xl font-bold">{formatPrice(product.price, product.currency)}</span>
                {product.originalPrice && (
                  <>
                    <span className="text-base text-muted-foreground line-through">
                      {formatPrice(product.originalPrice, product.currency)}
                    </span>
                    <span className="rounded bg-success/15 px-2 py-0.5 text-xs font-bold text-success">
                      Save {formatPrice(product.originalPrice - product.price, product.currency)}
                    </span>
                  </>
                )}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {product.shipping} · Stock: {product.stock} available
              </p>

              <div className="mt-5 flex items-center gap-3">
                <div className="flex items-center rounded-lg border border-border">
                  <button
                    type="button"
                    onClick={() => setQty(Math.max(1, qty - 1))}
                    className="px-3 py-2 text-sm font-bold"
                  >
                    -
                  </button>
                  <span className="w-10 text-center text-sm tabular-nums">{qty}</span>
                  <button
                    type="button"
                    onClick={() => setQty(qty + 1)}
                    className="px-3 py-2 text-sm font-bold"
                  >
                    +
                  </button>
                </div>
                <Button
                  className="flex-1"
                  onClick={() =>
                    void addToCart(product, qty).then(() => toast.success("Added to cart"))
                  }
                >
                  <ShoppingCart className="mr-2 h-4 w-4" />
                  Add to cart
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => void toggleWishlist(product.id)}
                >
                  <Heart
                    className={`h-4 w-4 ${isWished ? "fill-destructive text-destructive" : ""}`}
                  />
                </Button>
              </div>
              <div className="mt-3 flex gap-2">
                <Link to="/checkout" className="flex-1">
                  <Button variant="secondary" className="w-full">
                    Buy now
                  </Button>
                </Link>
                {product.badge === "bid" && (
                  <Button variant="outline" className="flex-1">
                    Place a bid
                  </Button>
                )}
              </div>
            </div>

            <div className="mt-6 grid grid-cols-3 gap-3 text-xs">
              <div className="flex items-center gap-2 rounded-xl border border-border bg-surface p-3">
                <ShieldCheck className="h-4 w-4 text-primary" /> Buyer protection
              </div>
              <div className="flex items-center gap-2 rounded-xl border border-border bg-surface p-3">
                <Truck className="h-4 w-4 text-primary" /> Fast shipping
              </div>
              <div className="flex items-center gap-2 rounded-xl border border-border bg-surface p-3">
                <Repeat className="h-4 w-4 text-primary" /> 30-day returns
              </div>
            </div>

            {seller && (
              <Link
                to="/sellers/$handle"
                params={{ handle: seller.handle }}
                className="mt-6 flex items-center gap-3 rounded-2xl border border-border bg-surface p-4 hover:border-primary/40"
              >
                <img src={seller.avatar} alt="" className="h-12 w-12 rounded-full object-cover" />
                <div className="flex-1">
                  <p className="text-sm font-semibold">{seller.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {seller.sales.toLocaleString()} sales · ★ {seller.rating}
                  </p>
                </div>
                <Button variant="outline" size="sm">
                  Visit store
                </Button>
              </Link>
            )}
          </div>
        </div>

        <Tabs defaultValue="desc" className="mt-12">
          <TabsList>
            <TabsTrigger value="desc">Description</TabsTrigger>
            <TabsTrigger value="specs">Specifications</TabsTrigger>
            <TabsTrigger value="reviews">Reviews</TabsTrigger>
            <TabsTrigger value="shipping">Shipping</TabsTrigger>
          </TabsList>
          <TabsContent
            value="desc"
            className="mt-6 max-w-3xl text-sm leading-relaxed text-muted-foreground"
          >
            {product.description}
          </TabsContent>
          <TabsContent value="specs" className="mt-6 max-w-2xl">
            <dl className="divide-y divide-border rounded-2xl border border-border bg-surface">
              {product.specs.map((s: { label: string; value: string }) => (
                <div key={s.label} className="grid grid-cols-2 gap-4 p-4 text-sm">
                  <dt className="font-medium text-muted-foreground">{s.label}</dt>
                  <dd className="font-semibold">{s.value}</dd>
                </div>
              ))}
            </dl>
          </TabsContent>
          <TabsContent value="reviews" className="mt-6 space-y-4">
            {[
              {
                name: "Sam K.",
                rating: 5,
                text: "Exceeded my expectations. Build quality is fantastic and shipping was fast.",
              },
              {
                name: "Priya M.",
                rating: 4,
                text: "Solid purchase. Packaging was great and the seller was responsive.",
              },
              { name: "Yuki T.", rating: 5, text: "Best in its class — verified buyer." },
            ].map((r) => (
              <div key={r.name} className="rounded-2xl border border-border bg-surface p-5">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold">{r.name}</p>
                  <div className="flex">
                    {Array.from({ length: r.rating }).map((_, i) => (
                      <Star key={i} className="h-3 w-3 fill-warning text-warning" />
                    ))}
                  </div>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{r.text}</p>
              </div>
            ))}
          </TabsContent>
          <TabsContent value="shipping" className="mt-6 max-w-2xl text-sm text-muted-foreground">
            <p>
              Ships within 1–2 business days from {seller?.location ?? "the seller"}. Tracked
              delivery worldwide. Free returns within 30 days, no questions asked.
            </p>
          </TabsContent>
        </Tabs>

        <section className="mt-16">
          <h2 className="mb-6 text-xl font-bold">Related products</h2>
          {relatedQ.isPending ? (
            <p className="text-sm text-muted-foreground">Loading related…</p>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {related.map((p: Product, i: number) => (
                <ProductCard key={p.id} product={p} index={i} />
              ))}
            </div>
          )}
        </section>
      </div>
    </SiteShell>
  );
}
