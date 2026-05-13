import { createFileRoute, Link, Outlet } from "@tanstack/react-router";

import { SiteShell } from "@/components/layout/SiteShell";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { Button } from "@/components/ui/button";
import { adminDashboardNavItems } from "@/features/dashboard/nav";
import { getAccessToken } from "@/lib/api/auth-session";
import { isDemoProfileUser } from "@/lib/auth/profile";
import { useAppStore } from "@/store/use-app-store";

export const Route = createFileRoute("/admin")({
  component: AdminLayout,
});

function AdminLayout() {
  const user = useAppStore((s) => s.user);

  if (!user || !getAccessToken() || isDemoProfileUser(user)) {
    return (
      <SiteShell>
        <div className="container-page py-16">
          <h1 className="text-3xl font-bold tracking-tight">Admin dashboard</h1>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">
            Sign in with a Nexus admin account to manage sellers and moderation. Demo profiles
            browse the storefront only.
          </p>
          <Link to="/login" className="mt-8 inline-block">
            <Button>Sign in</Button>
          </Link>
        </div>
      </SiteShell>
    );
  }

  if (user.role !== "admin") {
    return (
      <SiteShell>
        <div className="container-page py-16">
          <h1 className="text-3xl font-bold tracking-tight">Admin access</h1>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">
            This workspace is restricted to Nexus platform administrators.
          </p>
        </div>
      </SiteShell>
    );
  }

  return (
    <SiteShell>
      <div className="container-page flex gap-6 py-8">
        <DashboardSidebar
          brand="Nexus Admin"
          brandSubtitle="Platform control"
          items={adminDashboardNavItems}
        />
        <div className="min-w-0 flex-1">
          <Outlet />
        </div>
      </div>
    </SiteShell>
  );
}
