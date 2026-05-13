import { Link } from "@tanstack/react-router";

export function Footer() {
  return (
    <footer className="mt-24 border-t border-border bg-surface">
      <div className="container-page grid gap-10 py-16 md:grid-cols-2 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <div className="flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground">
              <span className="text-sm font-bold">N</span>
            </div>
            <span className="text-lg font-bold tracking-tight">Nexus Marketplace</span>
          </div>
          <p className="mt-4 max-w-xs text-sm text-muted-foreground">
            The trusted marketplace for buyers, sellers, and bidders. Verified listings, secure
            checkout, fast global shipping.
          </p>
          <div className="mt-6 max-w-sm rounded-xl border border-border bg-background p-4">
            <p className="text-xs font-semibold">Get weekly curated drops</p>
            <div className="mt-2 flex gap-2">
              <input
                placeholder="you@example.com"
                className="h-9 flex-1 rounded-md border border-border bg-surface px-3 text-sm outline-none focus:border-primary/30 focus:ring-2 focus:ring-primary/15"
              />
              <button className="h-9 rounded-md bg-primary px-4 text-xs font-semibold text-primary-foreground hover:bg-primary-hover">
                Join
              </button>
            </div>
          </div>
        </div>

        <FooterCol
          title="Marketplace"
          links={[
            ["Browse all", "/products"],
            ["Categories", "/categories"],
            ["Top sellers", "/sellers"],
            ["Auctions", "/products"],
          ]}
        />
        <FooterCol
          title="Company"
          links={[
            ["About", "/about"],
            ["Contact", "/contact"],
            ["Help center", "/help"],
            ["Become a seller", "/register"],
          ]}
        />
        <FooterCol
          title="Legal"
          links={[
            ["Terms of service", "/help"],
            ["Privacy policy", "/help"],
            ["Buyer guarantee", "/help"],
            ["Seller policies", "/help"],
          ]}
        />
      </div>

      <div className="border-t border-border">
        <div className="container-page flex flex-col items-center justify-between gap-3 py-5 text-xs text-muted-foreground sm:flex-row">
          <p>© 2026 Nexus Marketplace. All rights reserved.</p>
          <p>Made for buyers, sellers, and creators worldwide.</p>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <div>
      <h4 className="text-xs font-semibold uppercase tracking-widest text-foreground">{title}</h4>
      <ul className="mt-4 space-y-2">
        {links.map(([label, href]) => (
          <li key={label}>
            <Link
              to={href}
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
