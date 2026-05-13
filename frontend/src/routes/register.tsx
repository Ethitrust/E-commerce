import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { SiteShell } from "@/components/layout/SiteShell";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api/client";
import { postRegister } from "@/lib/api/auth";
import type { AuthUser } from "@/store/use-app-store";
import { useAppStore } from "@/store/use-app-store";
import { toast } from "sonner";

export const Route = createFileRoute("/register")({
  component: RegisterPage,
});

function RegisterPage() {
  const navigate = useNavigate();
  const completeAuthenticatedSession = useAppStore((s) => s.completeAuthenticatedSession);

  const [busy, setBusy] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [becomeSeller, setBecomeSeller] = useState(false);
  const [sellerHandle, setSellerHandle] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await postRegister({
        name: name.trim(),
        email: email.trim(),
        password: pw,
        becomeSeller: becomeSeller ? true : undefined,
        sellerHandle:
          becomeSeller && sellerHandle.trim() ? sellerHandle.trim().toLowerCase() : undefined,
      });
      const user: AuthUser = {
        id: res.user.id,
        name: res.user.name,
        email: res.user.email,
        role: res.user.role,
        avatar: res.user.avatar ?? "",
      };
      await completeAuthenticatedSession(res.accessToken, user);
      toast.success("Account created — you're signed in.");
      navigate({ to: user.role === "seller" ? "/seller" : "/" });
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Could not create account.";
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <SiteShell>
      <div className="container-page py-16">
        <div className="mx-auto max-w-md rounded-2xl border border-border bg-surface p-8 shadow-elevated">
          <h1 className="text-2xl font-bold tracking-tight">Create your account</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Registers a live buyer (or seller) against the Nexus API — no payment step yet.
          </p>

          <form onSubmit={submit} className="mt-6 space-y-4">
            <Field
              label="Full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Alex Rivera"
              autoComplete="name"
              disabled={busy}
              required
            />
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
              placeholder="At least 8 characters"
              autoComplete="new-password"
              disabled={busy}
              required
              minLength={8}
            />

            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={becomeSeller}
                disabled={busy}
                onChange={(e) => setBecomeSeller(e.target.checked)}
                className="accent-primary"
              />
              <span>Open a seller shop (requires a unique handle)</span>
            </label>

            {becomeSeller ? (
              <Field
                label="Shop handle"
                value={sellerHandle}
                onChange={(e) => setSellerHandle(e.target.value)}
                placeholder="my-store"
                pattern="^[a-z0-9]+(-[a-z0-9]+)*$"
                disabled={busy}
              />
            ) : null}

            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? "Creating…" : "Create account"}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-muted-foreground">
            Already a member?{" "}
            <Link to="/login" className="font-semibold text-primary hover:underline">
              Sign in
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
