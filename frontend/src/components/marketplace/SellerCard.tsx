import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Star, ShieldCheck } from "lucide-react";
import type { Seller } from "@/lib/mock-data";

export function SellerCard({ seller, index = 0 }: { seller: Seller; index?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.05 }}
    >
      <Link
        to="/sellers/$handle"
        params={{ handle: seller.handle }}
        className="block overflow-hidden rounded-2xl border border-border bg-surface shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-elevated"
      >
        <div className="relative h-20 overflow-hidden bg-muted">
          <img src={seller.banner} alt="" className="h-full w-full object-cover" />
        </div>
        <div className="-mt-8 px-5 pb-5">
          <img
            src={seller.avatar}
            alt={seller.name}
            className="h-14 w-14 rounded-full border-4 border-surface object-cover shadow-soft"
          />
          <div className="mt-3 flex items-center gap-1.5">
            <h3 className="text-sm font-semibold">{seller.name}</h3>
            {seller.verified && <ShieldCheck className="h-3.5 w-3.5 text-primary" />}
          </div>
          <p className="text-[11px] text-muted-foreground">{seller.location}</p>
          <div className="mt-3 flex items-center justify-between text-xs">
            <span className="flex items-center gap-1">
              <Star className="h-3 w-3 fill-warning text-warning" />
              <span className="font-semibold">{seller.rating}</span>
              <span className="text-muted-foreground">({seller.reviews})</span>
            </span>
            <span className="text-muted-foreground">{seller.sales.toLocaleString()} sales</span>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
