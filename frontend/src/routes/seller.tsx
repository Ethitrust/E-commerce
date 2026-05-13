import { createFileRoute, Link, Outlet } from "@tanstack/react-router";

import { SiteShell } from "@/components/layout/SiteShell";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { Button } from "@/components/ui/button";
import { sellerDashboardNavItems } from "@/features/dashboard/nav";
import { getAccessToken } from "@/lib/api/auth-session";
import { isDemoProfileUser } from "@/lib/auth/profile";
import { useAppStore } from "@/store/use-app-store";

export const Route = createFileRoute("/seller")({
  component: SellerLayout,
});

function SellerLayout() {
  const user = useAppStore((s) => s.user);
  const brand = user?.name?.trim() || "Seller";
  const subtitle = "Seller dashboard";

  if (!user || !getAccessToken() || isDemoProfileUser(user)) {
    return (
      <SiteShell>
        <div className="container-page py-16">
          <h1 className="text-3xl font-bold tracking-tight">Seller dashboard</h1>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">
            Sign in with a Nexus account that was registered as a seller to manage listings and
            orders. Demo profiles only preview the storefront UI offline.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/login">
              <Button>Sign in</Button>
            </Link>
            <Link to="/register">
              <Button variant="outline">Register as seller</Button>
            </Link>
          </div>
        </div>
      </SiteShell>
    );
  }

  if (user.role !== "seller") {
    return (
      <SiteShell>
        <div className="container-page py-16">
          <h1 className="text-3xl font-bold tracking-tight">Seller access</h1>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">
            This area is reserved for seller accounts. Create a new account and choose{" "}
            <span className="font-semibold text-foreground">Open a seller shop</span> during
            registration, or switch to another profile with seller privileges.
          </p>
          <Link to="/register" className="mt-8 inline-block">
            <Button>Go to registration</Button>
          </Link>
        </div>
      </SiteShell>
    );
  }

  return (
    <SiteShell>
      <div className="container-page flex gap-6 py-8">
        <DashboardSidebar brand={brand} brandSubtitle={subtitle} items={sellerDashboardNavItems} />
        <div className="flex-1 min-w-0">
          <Outlet />
        </div>
      </div>
    </SiteShell>
  );
}
