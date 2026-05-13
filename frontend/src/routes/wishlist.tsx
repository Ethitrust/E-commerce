import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Heart } from "lucide-react";

import { SiteShell } from "@/components/layout/SiteShell";
import { ProductCard } from "@/components/marketplace/ProductCard";
import { Button } from "@/components/ui/button";
import { getAccessToken } from "@/lib/api/auth-session";
import { normalizeProduct } from "@/lib/api/catalogNormalize";
import { getMeWishlist } from "@/lib/api/me";
import { isDemoProfileUser } from "@/lib/auth/profile";
import { products } from "@/lib/mock-data";
import { useAppStore } from "@/store/use-app-store";

export const Route = createFileRoute("/wishlist")({
  component: WishlistPage,
});

function WishlistPage() {
  const user = useAppStore((s) => s.user);
  const wishSig = useAppStore((s) => s.wishlist.join("\0"));

  const hydrateFromApi = Boolean(user && getAccessToken() && !isDemoProfileUser(user));

  const wishlistQuery = useQuery({
    queryKey: ["me", "wishlist", user?.id ?? "anon", wishSig],
    queryFn: async () => {
      const res = await getMeWishlist();
      return res.products.map((p) => normalizeProduct(p));
    },
    enabled: hydrateFromApi,
    staleTime: 15_000,
  });

  const guestWishIds = useAppStore((s) => s.wishlist);
  const useMockWishlistCatalog = Boolean(user && isDemoProfileUser(user));
  const guestItems = hydrateFromApi
    ? []
    : useMockWishlistCatalog
      ? products.filter((p) => guestWishIds.includes(p.id))
      : [];

  const items = hydrateFromApi ? (wishlistQuery.data ?? []) : guestItems;
  const pending = hydrateFromApi && wishlistQuery.isPending;
  const error = hydrateFromApi && wishlistQuery.isError;

  const guestNeedsSignIn = !hydrateFromApi && !useMockWishlistCatalog;

  return (
    <SiteShell>
      <div className="container-page py-12">
        <h1 className="text-3xl font-bold tracking-tight">Wishlist</h1>
        <p className="mt-1 text-sm text-muted-foreground">{items.length} saved items</p>

        {guestNeedsSignIn ? (
          <div className="mt-6 rounded-2xl border border-border bg-surface p-6">
            <p className="text-sm font-semibold">Sign in to sync your wishlist</p>
            <p className="mt-1 max-w-xl text-sm text-muted-foreground">
              Guest favourites stay on this device only. With a Nexus account you can load saved
              items from the marketplace on any device.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link to="/login">
                <Button>Sign in</Button>
              </Link>
              <Link to="/register">
                <Button variant="outline">Create account</Button>
              </Link>
            </div>
          </div>
        ) : !hydrateFromApi ? (
          <p className="mt-3 max-w-xl text-xs leading-relaxed text-muted-foreground">
            Demo profile — favourites resolve against sample catalog IDs on this device. Sign in
            with a live Nexus account for a real wishlist.
          </p>
        ) : (
          <p className="mt-3 max-w-xl text-xs leading-relaxed text-muted-foreground">
            Synced from your Nexus account.
          </p>
        )}

        {guestNeedsSignIn ? null : pending ? (
          <p className="mt-12 text-sm text-muted-foreground">Loading your saved items…</p>
        ) : error ? (
          <div className="mt-12 rounded-2xl border border-destructive/30 bg-destructive/5 p-8 text-center text-sm text-destructive">
            Could not load your wishlist right now.
          </div>
        ) : items.length === 0 ? (
          <div className="mt-12 rounded-2xl border border-dashed border-border bg-surface p-16 text-center">
            <Heart className="mx-auto h-10 w-10 text-muted-foreground" />
            <p className="mt-4 text-base font-semibold">Nothing saved yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Tap the heart on any product to save it for later.
            </p>
            <Link to="/products" className="mt-6 inline-block">
              <Button>Browse products</Button>
            </Link>
          </div>
        ) : (
          <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {items.map((p, i) => (
              <ProductCard key={p.id} product={p} index={i} />
            ))}
          </div>
        )}
      </div>
    </SiteShell>
  );
}
