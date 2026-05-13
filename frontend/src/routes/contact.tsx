import { createFileRoute } from "@tanstack/react-router";
import { SiteShell } from "@/components/layout/SiteShell";
import { Button } from "@/components/ui/button";
import { Mail, MessageCircle, Phone } from "lucide-react";

export const Route = createFileRoute("/contact")({
  component: () => (
    <SiteShell>
      <div className="container-page py-16">
        <div className="grid gap-10 lg:grid-cols-2">
          <div>
            <h1 className="text-4xl font-bold tracking-tight">Get in touch</h1>
            <p className="mt-4 text-base text-muted-foreground">
              Our team is available 24/7 across email, chat, and phone.
            </p>
            <div className="mt-8 space-y-3">
              {[
                [Mail, "Email", "support@nexus.market"],
                [MessageCircle, "Live chat", "Available in your account"],
                [Phone, "Phone", "+1 (415) 555-0142"],
              ].map(([Icon, label, value]) => {
                const I = Icon as React.ComponentType<{ className?: string }>;
                return (
                  <div
                    key={label as string}
                    className="flex items-center gap-4 rounded-2xl border border-border bg-surface p-4"
                  >
                    <div className="grid h-10 w-10 place-items-center rounded-xl bg-accent text-accent-foreground">
                      <I className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{label as string}</p>
                      <p className="text-sm text-muted-foreground">{value as string}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <form
            onSubmit={(e) => e.preventDefault()}
            className="rounded-2xl border border-border bg-surface p-6 space-y-4"
          >
            <Field label="Name" placeholder="Alex Rivera" />
            <Field label="Email" type="email" placeholder="you@example.com" />
            <label className="block text-sm">
              <span className="mb-1.5 block text-xs font-semibold text-muted-foreground">
                Message
              </span>
              <textarea
                rows={5}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/15"
              />
            </label>
            <Button type="submit" className="w-full">
              Send message
            </Button>
          </form>
        </div>
      </div>
    </SiteShell>
  ),
});
function Field({
  label,
  ...rest
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold text-muted-foreground">{label}</span>
      <input
        {...rest}
        className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/15"
      />
    </label>
  );
}
