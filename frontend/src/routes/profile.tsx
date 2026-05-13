import { createFileRoute, Link } from "@tanstack/react-router";

import { SiteShell } from "@/components/layout/SiteShell";
import { Button } from "@/components/ui/button";
import { isDemoProfileUser } from "@/lib/auth/profile";
import { demoUsers, useAppStore } from "@/store/use-app-store";

export const Route = createFileRoute("/profile")({
  component: ProfileRoute,
});

function ProfileRoute() {
  const user = useAppStore((s) => s.user);
  const switchRole = useAppStore((s) => s.switchRole);

  if (!user) {
    return (
      <SiteShell>
        <div className="container-page py-24 text-center">
          <h1 className="text-2xl font-bold">Sign in to view your profile</h1>
          <Link to="/login" className="mt-4 inline-block">
            <Button>Sign in</Button>
          </Link>
        </div>
      </SiteShell>
    );
  }

  const showDemoRoleSwitcher = Boolean(import.meta.env.DEV && isDemoProfileUser(user));

  return (
    <SiteShell>
      <div className="container-page py-12">
        <div className="flex flex-wrap items-start gap-4 rounded-2xl border border-border bg-surface p-6">
          <img src={user.avatar} alt="" className="h-16 w-16 rounded-full object-cover" />
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-bold">{user.name}</h1>
            <p className="text-sm text-muted-foreground">{user.email}</p>
            <span className="mt-1 inline-block rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-accent-foreground">
              {user.role}
            </span>
          </div>
          {showDemoRoleSwitcher ? (
            <div className="flex flex-wrap gap-2">
              {(Object.keys(demoUsers) as Array<keyof typeof demoUsers>).map((r) => (
                <Button
                  key={r}
                  variant={user.role === r ? "default" : "outline"}
                  size="sm"
                  onClick={() => switchRole(r)}
                >
                  Switch to {r}
                </Button>
              ))}
            </div>
          ) : null}
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {[
            ["Personal information", "Update name, email and contact info"],
            ["Shipping addresses", "Manage your saved delivery addresses"],
            ["Payment methods", "Cards, wallets and saved methods"],
            ["Notifications", "Email and push preferences"],
            ["Security", "Password and two-factor authentication"],
            ["Privacy", "Data and privacy controls"],
          ].map(([title, desc]) => (
            <div key={title} className="rounded-2xl border border-border bg-surface p-5">
              <p className="font-semibold">{title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
              <Button variant="outline" size="sm" className="mt-3 h-9" disabled title="Coming soon">
                Coming soon
              </Button>
            </div>
          ))}
        </div>
      </div>
    </SiteShell>
  );
}
