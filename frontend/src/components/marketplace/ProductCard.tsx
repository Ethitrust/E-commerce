import { Link } from "@tanstack/react-router";
import { Heart, ShoppingCart, Star } from "lucide-react";
import { motion } from "framer-motion";
import { useAppStore } from "@/store/use-app-store";
import type { Product } from "@/lib/mock-data";
import { getSeller } from "@/lib/mock-data";
import { cn, formatPrice } from "@/lib/utils";
import { toast } from "sonner";

interface Props {
  product: Product;
  index?: number;
}

const badgeStyles: Record<NonNullable<Product["badge"]>, string> = {
  new: "bg-foreground text-background",
  hot: "bg-destructive text-destructive-foreground",
  deal: "bg-success text-success-foreground",
  bid: "bg-primary text-primary-foreground",
};

const badgeLabel: Record<NonNullable<Product["badge"]>, string> = {
  new: "NEW",
  hot: "HOT",
  deal: "DEAL",
  bid: "LIVE BID",
};

export function ProductCard({ product, index = 0 }: Props) {
  const { wishlist, toggleWishlist, addToCart } = useAppStore();
  const mockSeller = getSeller(product.sellerId);
  const sellerName = product.seller?.name ?? mockSeller?.name ?? "Seller";
  const sellerHandle = product.seller?.handle ?? mockSeller?.handle;
  const isWished = wishlist.includes(product.id);
  const discount = product.originalPrice
    ? Math.round((1 - product.price / product.originalPrice) * 100)
    : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: Math.min(index * 0.04, 0.3), ease: [0.16, 1, 0.3, 1] }}
      className="group relative flex flex-col rounded-2xl border border-border bg-surface p-3 shadow-soft transition-all duration-300 hover:-translate-y-0.5 hover:shadow-elevated"
    >
      <Link
        to="/products/$slug"
        params={{ slug: product.slug }}
        className="relative mb-3 aspect-square overflow-hidden rounded-xl bg-muted"
      >
        <img
          src={product.image}
          alt={product.title}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        {product.badge && (
          <span
            className={cn(
              "absolute left-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wider",
              badgeStyles[product.badge],
            )}
          >
            {badgeLabel[product.badge]}
          </span>
        )}
        {discount > 0 && !product.badge && (
          <span className="absolute left-2 top-2 rounded-full bg-destructive px-2 py-0.5 text-[10px] font-bold tracking-wider text-destructive-foreground">
            -{discount}%
          </span>
        )}
        <button
          onClick={(e) => {
            e.preventDefault();
            void toggleWishlist(product.id).then(() => {
              toast(isWished ? "Removed from wishlist" : "Added to wishlist");
            });
          }}
          aria-label="Toggle wishlist"
          className={cn(
            "absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full border border-border bg-background/90 backdrop-blur transition-all",
            "opacity-0 group-hover:opacity-100",
            isWished && "opacity-100",
          )}
        >
          <Heart
            className={cn(
              "h-4 w-4",
              isWished ? "fill-destructive text-destructive" : "text-foreground",
            )}
          />
        </button>
        <button
          onClick={(e) => {
            e.preventDefault();
            void addToCart(product).then(() => toast.success("Added to cart"));
          }}
          className="absolute bottom-2 right-2 grid h-8 w-8 place-items-center rounded-full bg-primary text-primary-foreground opacity-0 shadow-elevated transition-all group-hover:opacity-100"
          aria-label="Add to cart"
        >
          <ShoppingCart className="h-4 w-4" />
        </button>
      </Link>

      <div className="flex flex-col gap-1.5">
        <Link to="/products/$slug" params={{ slug: product.slug }}>
          <h3 className="line-clamp-1 text-sm font-semibold leading-tight">{product.title}</h3>
        </Link>
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <Star className="h-3 w-3 fill-warning text-warning" />
          <span className="font-medium text-foreground">{product.rating.toFixed(1)}</span>
          <span>({product.reviews})</span>
          <span>·</span>
          {sellerHandle ? (
            <Link
              to="/sellers/$handle"
              params={{ handle: sellerHandle }}
              className="truncate hover:text-foreground hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              {sellerName}
            </Link>
          ) : (
            <span className="truncate">{sellerName}</span>
          )}
        </div>
        <div className="mt-1 flex items-end justify-between">
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-base font-bold">{formatPrice(product.price, product.currency)}</span>
              {product.originalPrice && (
                <span className="text-xs text-muted-foreground line-through">
                  {formatPrice(product.originalPrice, product.currency)}
                </span>
              )}
            </div>
            <p className="text-[10px] text-muted-foreground">{product.shipping}</p>
          </div>
          {product.bidCount && (
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Ends in</p>
              <p className="text-xs font-semibold text-destructive">{product.bidEndsAt}</p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
