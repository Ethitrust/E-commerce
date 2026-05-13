import { Link, useRouterState } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface DashNavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  /** When true, only exact path (and trailing-slash variant) counts as active. */
  exactMatch?: boolean;
}

interface Props {
  brand: string;
  brandSubtitle: string;
  items: DashNavItem[];
}

export function DashboardSidebar({ brand, brandSubtitle, items }: Props) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar p-4 lg:flex">
      <div className="mb-6 flex items-center gap-3 rounded-xl border border-sidebar-border bg-background/40 p-3">
        <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary text-primary-foreground text-sm font-bold">
          {brand[0]}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{brand}</p>
          <p className="truncate text-[11px] text-muted-foreground">{brandSubtitle}</p>
        </div>
      </div>
      <nav className="flex flex-col gap-1">
        {items.map((item) => {
          const normalized =
            pathname.endsWith("/") && pathname !== "/" ? pathname.slice(0, -1) : pathname;
          const itemPath =
            item.to.endsWith("/") && item.to !== "/" ? item.to.slice(0, -1) : item.to;
          const active =
            item.exactMatch === true
              ? normalized === itemPath || normalized === `${itemPath}/`
              : normalized === itemPath ||
                normalized.startsWith(`${itemPath}/`) ||
                normalized.startsWith(itemPath + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto rounded-xl border border-sidebar-border bg-background/40 p-4">
        <p className="text-xs font-semibold">Need help?</p>
        <p className="mt-1 text-[11px] text-muted-foreground">
          Reach our team 24/7 from any dashboard.
        </p>
        <Link
          to="/contact"
          className="mt-3 inline-block text-xs font-semibold text-primary hover:underline"
        >
          Contact support →
        </Link>
      </div>
    </aside>
  );
}
