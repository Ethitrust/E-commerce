import { createFileRoute } from "@tanstack/react-router";
import { SiteShell } from "@/components/layout/SiteShell";

export const Route = createFileRoute("/about")({
  component: () => (
    <SiteShell>
      <div className="container-page max-w-3xl py-16">
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">About Nexus</p>
        <h1 className="mt-2 text-4xl font-bold tracking-tight">A marketplace built on trust.</h1>
        <p className="mt-6 text-base leading-relaxed text-muted-foreground">
          Nexus is the trusted destination for buyers and sellers worldwide. We believe great
          commerce comes from radical transparency, world-class logistics, and a community of
          verified merchants. From flash deals to high-value auctions, we power millions of
          transactions every month.
        </p>
        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          {[
            ["8.4M", "Buyers"],
            ["120k", "Sellers"],
            ["180+", "Countries"],
          ].map(([v, l]) => (
            <div key={l} className="rounded-2xl border border-border bg-surface p-6 text-center">
              <p className="text-3xl font-bold">{v}</p>
              <p className="mt-1 text-xs uppercase tracking-widest text-muted-foreground">{l}</p>
            </div>
          ))}
        </div>
      </div>
    </SiteShell>
  ),
});
