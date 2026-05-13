import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  label: string;
  value: string;
  delta?: string;
  trend?: "up" | "down";
  icon: LucideIcon;
}

export function StatCard({ label, value, delta, trend = "up", icon: Icon }: Props) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-5 shadow-soft">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {label}
          </p>
          <p className="mt-2 text-2xl font-bold tabular-nums">{value}</p>
        </div>
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-accent text-accent-foreground">
          <Icon className="h-5 w-5" />
        </div>
      </div>
      {delta && (
        <p
          className={cn(
            "mt-3 text-xs font-medium",
            trend === "up" ? "text-success" : "text-destructive",
          )}
        >
          {trend === "up" ? "▲" : "▼"} {delta} vs last week
        </p>
      )}
    </div>
  );
}
