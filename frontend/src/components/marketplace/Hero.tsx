import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Search, ShieldCheck, Truck, Sparkles } from "lucide-react";

export function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-border bg-gradient-to-br from-background via-background to-accent/40">
      <div className="container-page grid items-center gap-12 py-16 lg:grid-cols-[1.1fr_0.9fr] lg:py-24">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-[11px] font-semibold text-muted-foreground">
            <Sparkles className="h-3 w-3 text-primary" />
            Curated drop · Spring 2026
          </div>
          <h1 className="mt-5 text-balance text-4xl font-bold leading-[1.05] tracking-tight md:text-5xl lg:text-6xl">
            The marketplace built for
            <span className="text-primary"> serious buyers and sellers.</span>
          </h1>
          <p className="mt-5 max-w-xl text-base text-muted-foreground md:text-lg">
            Buy, sell, and bid across millions of verified listings. Fast checkout, global shipping,
            and protection on every order.
          </p>

          <form className="mt-8 flex max-w-xl items-center gap-2 rounded-full border border-border bg-surface p-1.5 shadow-soft focus-within:ring-2 focus-within:ring-primary/15">
            <Search className="ml-3 h-4 w-4 text-muted-foreground" />
            <input
              placeholder="What are you looking for today?"
              className="h-10 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
            <Link
              to="/products"
              className="inline-flex h-10 items-center rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground hover:bg-primary-hover"
            >
              Search
            </Link>
          </form>

          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary" /> Buyer protection
            </div>
            <div className="flex items-center gap-2">
              <Truck className="h-4 w-4 text-primary" /> Free returns 30 days
            </div>
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" /> Verified sellers
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="relative"
        >
          <div className="relative aspect-[5/4] overflow-hidden rounded-3xl border border-border bg-muted shadow-floating">
            <img
              src="https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1400&q=80"
              alt="Curated featured products"
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-background/80 to-transparent p-6">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-primary">
                Featured collection
              </p>
              <p className="text-lg font-bold">Premium Spring Edit</p>
            </div>
          </div>

          <div className="absolute -bottom-6 -left-6 hidden w-56 rounded-2xl border border-border bg-surface p-4 shadow-floating md:block">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              Live activity
            </p>
            <p className="mt-1 text-sm font-semibold">+2,140 buyers shopping now</p>
            <div className="mt-3 flex -space-x-2">
              {[
                "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=80&q=80",
                "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=80&q=80",
                "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=80&q=80",
              ].map((src) => (
                <img
                  key={src}
                  src={src}
                  alt=""
                  className="h-7 w-7 rounded-full border-2 border-surface object-cover"
                />
              ))}
            </div>
          </div>

          <div className="absolute -right-4 top-8 hidden rounded-2xl border border-border bg-surface px-4 py-3 shadow-floating md:block">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              Top bid
            </p>
            <p className="text-sm font-bold tabular-nums">$2,450 · 04h 22m left</p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
