import { Link } from "@tanstack/react-router";
import {
  Smartphone,
  Shirt,
  Home,
  Headphones,
  Watch,
  Camera,
  Gem,
  Dumbbell,
  type LucideIcon,
} from "lucide-react";
import type { Category } from "@/lib/mock-data";

const iconMap: Record<string, LucideIcon> = {
  Smartphone,
  Shirt,
  Home,
  Headphones,
  Watch,
  Camera,
  Gem,
  Dumbbell,
};

export function CategoryTile({ category }: { category: Category }) {
  const Icon = iconMap[category.icon] ?? Smartphone;
  return (
    <Link
      to="/categories/$slug"
      params={{ slug: category.slug }}
      className="group flex flex-col items-center gap-3 rounded-2xl border border-border bg-surface p-5 text-center shadow-soft transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-elevated"
    >
      <div className="grid h-12 w-12 place-items-center rounded-xl bg-accent text-accent-foreground transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-sm font-semibold">{category.name}</p>
        <p className="text-[11px] text-muted-foreground">
          {category.count.toLocaleString()} listings
        </p>
      </div>
    </Link>
  );
}
