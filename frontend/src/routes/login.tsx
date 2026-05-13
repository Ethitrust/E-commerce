import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { SiteShell } from "@/components/layout/SiteShell";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api/client";
import { postLogin } from "@/lib/api/auth";
import { useAppStore, type AuthUser } from "@/store/use-app-store";
import { toast } from "sonner";
import type { Role } from "@/lib/mock-data";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function loginHomeForRole(role: Role): "/" | "/seller" | "/admin" {
  if (role === "admin") return "/admin";
  if (role === "seller") return "/seller";
  return "/";
}

function LoginPage() {
  const navigate = useNavigate();
  const completeAuthenticatedSession = useAppStore((s) => s.completeAuthenticatedSession);

  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");

  const submitApi = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await postLogin(email.trim(), pw);
      const user: AuthUser = {
        id: res.user.id,
        name: res.user.name,
        email: res.user.email,
        role: res.user.role,
        avatar: res.user.avatar ?? "",
      };
      await completeAuthenticatedSession(res.accessToken, user);
      toast.success(`Welcome back, ${user.name.split(" ")[0]}`);
      navigate({ to: loginHomeForRole(user.role) });
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Could not sign in.";
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <SiteShell>
      <div className="container-page py-16">
        <div className="mx-auto max-w-md rounded-2xl border border-border bg-surface p-8 shadow-elevated">
          <h1 className="text-2xl font-bold tracking-tight">Welcome back</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Sign in with your Nexus account.
          </p>

          <form onSubmit={submitApi} className="mt-6 space-y-4">
            <Field
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              disabled={busy}
              required
            />
            <Field
              label="Password"
              type="password"
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              disabled={busy}
              required
            />
            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? "Signing in…" : "Sign in"}
            </Button>
          </form>

          <div className="mt-8 text-center text-sm text-muted-foreground">
            New here?{" "}
            <Link to="/register" className="font-semibold text-primary hover:underline">
              Create an account
            </Link>
          </div>
        </div>
      </div>
    </SiteShell>
  );
}

function Field({
  label,
  ...rest
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold text-muted-foreground">{label}</span>
      <input
        {...rest}
        className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/15 disabled:opacity-60"
      />
    </label>
  );
}
