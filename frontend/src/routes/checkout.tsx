import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { CheckCircle2, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { SiteShell } from "@/components/layout/SiteShell";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api/client";
import { getAccessToken } from "@/lib/api/auth-session";
import { postCheckout } from "@/lib/api/checkout";
import type { CheckoutPayload } from "@/lib/api/checkout";
import { isDemoProfileUser } from "@/lib/auth/profile";
import { putMeCart } from "@/lib/api/me";
import { formatPrice } from "@/lib/utils";
import { useAppStore } from "@/store/use-app-store";

export const Route = createFileRoute("/checkout")({
  component: CheckoutPage,
});

const PAY_OPTIONS: Array<{
  id: CheckoutPayload["paymentMethod"];
  label: string;
}> = [
  { id: "card", label: "Credit / debit card" },
  { id: "paypal", label: "PayPal" },
  { id: "apple_pay", label: "Apple Pay" },
];

function CheckoutPage() {
  const navigate = useNavigate();
  const user = useAppStore((s) => s.user);
  const cart = useAppStore((s) => s.cart);
  const clearCart = useAppStore((s) => s.clearCart);

  const canCheckout = Boolean(getAccessToken() && user && !isDemoProfileUser(user));

  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  const [fullName, setFullName] = useState("");
  const [shipEmail, setShipEmail] = useState("");
  const [line1, setLine1] = useState("");
  const [city, setCity] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [country, setCountry] = useState("US");

  const [paymentMethod, setPaymentMethod] = useState<CheckoutPayload["paymentMethod"]>("card");

  useEffect(() => {
    if (!user) return;
    setFullName((n) => n || user.name || "");
    setShipEmail((e) => e || user.email || "");
  }, [user]);

  const subtotal = cart.reduce((s, c) => s + c.product.price * c.quantity, 0);
  const shipping = cart.length ? 300 : 0;
  const total = subtotal + shipping;

  const placeOrder = async () => {
    if (!canCheckout) return;
    if (!cart.length) {
      toast.error("Your cart is empty.");
      return;
    }

    setSubmitting(true);
    try {
      await putMeCart({
        items: cart.map((c) => ({ productId: c.productId, quantity: c.quantity })),
      });

      await postCheckout({
        shippingAddress: {
          name: fullName.trim(),
          email: shipEmail.trim(),
          line1: line1.trim(),
          city: city.trim(),
          postalCode: postalCode.trim(),
          country: country.trim().toUpperCase() || "US",
        },
        paymentMethod,
      });

      await clearCart();
      toast.success("Order placed successfully");
      navigate({ to: "/orders" });
    } catch (err) {
      if (err instanceof ApiError && err.code === "EMPTY_CART") {
        toast.error("Cart is empty on the server. Try adding items again.");
      } else if (err instanceof ApiError && err.code === "INSUFFICIENT_STOCK") {
        toast.error(err.message || "Insufficient stock.");
      } else if (err instanceof ApiError && err.code === "INVALID_CART") {
        toast.error(err.message || "One or more items are unavailable.");
      } else if (err instanceof ApiError) {
        toast.error(err.message);
      } else {
        toast.error("Checkout failed.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (!canCheckout) {
    return (
      <SiteShell>
        <div className="container-page py-16">
          <h1 className="text-3xl font-bold tracking-tight">Checkout</h1>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">
            Sign in with your Nexus account to complete checkout — we place orders against your
            synced cart on the server.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/login">
              <Button>Sign in</Button>
            </Link>
            <Link to="/cart">
              <Button variant="outline">Back to cart</Button>
            </Link>
          </div>
        </div>
      </SiteShell>
    );
  }

  const goPayment = () => {
    if (
      !fullName.trim() ||
      !shipEmail.trim() ||
      !line1.trim() ||
      !city.trim() ||
      !postalCode.trim()
    ) {
      toast.error("Please fill in all shipping fields.");
      return;
    }
    setStep(2);
  };

  return (
    <SiteShell>
      <div className="container-page py-12">
        <h1 className="text-3xl font-bold tracking-tight">Checkout</h1>
        <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
          <ShieldCheck className="h-3.5 w-3.5 text-primary" /> Secure encrypted checkout
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_400px]">
          <div className="space-y-6">
            <div className="flex gap-2">
              {["Shipping", "Payment", "Review"].map((label, i) => (
                <div
                  key={label}
                  className={`flex-1 rounded-xl border p-3 text-sm ${step === i + 1 ? "border-primary bg-accent font-semibold" : "border-border bg-surface text-muted-foreground"}`}
                >
                  <span className="mr-2 inline-grid h-5 w-5 place-items-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                    {i + 1}
                  </span>
                  {label}
                </div>
              ))}
            </div>

            {step === 1 && (
              <Section title="Shipping address">
                <div className="grid gap-3 md:grid-cols-2">
                  <CheckoutInput
                    label="Full name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                  />
                  <CheckoutInput
                    label="Email"
                    type="email"
                    value={shipEmail}
                    onChange={(e) => setShipEmail(e.target.value)}
                  />
                  <CheckoutInput
                    label="Address"
                    value={line1}
                    onChange={(e) => setLine1(e.target.value)}
                    className="md:col-span-2"
                  />
                  <CheckoutInput
                    label="City"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                  />
                  <CheckoutInput
                    label="Postal code"
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value)}
                  />
                  <CheckoutInput
                    label="Country"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    placeholder="US"
                  />
                </div>
                <Button className="mt-5" onClick={goPayment}>
                  Continue to payment
                </Button>
              </Section>
            )}
            {step === 2 && (
              <Section title="Payment method">
                <p className="mb-4 text-xs text-muted-foreground">
                  Payment capture is simulated — nothing is charged.
                </p>
                <div className="space-y-2">
                  {PAY_OPTIONS.map((p) => (
                    <label
                      key={p.id}
                      className="flex cursor-pointer items-center gap-3 rounded-xl border border-border bg-surface p-4 has-[:checked]:border-primary has-[:checked]:bg-accent"
                    >
                      <input
                        type="radio"
                        name="pay"
                        checked={paymentMethod === p.id}
                        onChange={() => setPaymentMethod(p.id)}
                        className="accent-primary"
                      />
                      <span className="text-sm font-medium">{p.label}</span>
                    </label>
                  ))}
                </div>
                <div className="mt-5 grid gap-3 md:grid-cols-2">
                  <CheckoutInput
                    label="Card number"
                    placeholder="•••• •••• •••• 4242"
                    className="md:col-span-2"
                    disabled
                  />
                  <CheckoutInput label="Expiry" placeholder="MM/YY" disabled />
                  <CheckoutInput label="CVC" placeholder="•••" disabled />
                </div>
                <div className="mt-5 flex gap-2">
                  <Button variant="outline" type="button" onClick={() => setStep(1)}>
                    Back
                  </Button>
                  <Button type="button" onClick={() => setStep(3)}>
                    Review order
                  </Button>
                </div>
              </Section>
            )}
            {step === 3 && (
              <Section title="Review and place order">
                <p className="text-sm text-muted-foreground">
                  By placing your order you agree to our terms and buyer protection policy.
                </p>
                <div className="mt-4 flex gap-2">
                  <Button
                    variant="outline"
                    type="button"
                    onClick={() => setStep(2)}
                    disabled={submitting}
                  >
                    Back
                  </Button>
                  <Button
                    type="button"
                    onClick={placeOrder}
                    disabled={submitting || cart.length === 0}
                  >
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    {submitting ? "Placing…" : "Place order"}
                  </Button>
                </div>
              </Section>
            )}
          </div>

          <aside className="h-fit rounded-2xl border border-border bg-surface p-6">
            <h3 className="text-base font-bold">Order summary</h3>
            <div className="mt-4 max-h-72 space-y-3 overflow-y-auto pr-1">
              {cart.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Your cart is empty.{" "}
                  <Link to="/products" className="font-semibold text-primary">
                    Browse products
                  </Link>
                </p>
              ) : (
                cart.map((c) => (
                  <div key={c.productId} className="flex gap-3">
                    <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-muted">
                      <img src={c.product.image} alt="" className="h-full w-full object-cover" />
                    </div>
                    <div className="flex-1 text-xs">
                      <p className="line-clamp-1 font-semibold">{c.product.title}</p>
                      <p className="text-muted-foreground">Qty {c.quantity}</p>
                    </div>
                    <p className="text-sm font-semibold tabular-nums">
                      {formatPrice(c.product.price * c.quantity, c.product.currency)}
                    </p>
                  </div>
                ))
              )}
            </div>
            <div className="my-4 border-t border-border" />
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt>Subtotal</dt>
                <dd className="tabular-nums">{formatPrice(subtotal)}</dd>
              </div>
              <div className="flex justify-between">
                <dt>Shipping</dt>
                <dd className="tabular-nums">{formatPrice(shipping)}</dd>
              </div>
              <div className="flex justify-between text-base font-bold">
                <dt>Total</dt>
                <dd className="tabular-nums">{formatPrice(total)}</dd>
              </div>
            </dl>
          </aside>
        </div>
      </div>
    </SiteShell>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-6">
      <h3 className="text-base font-bold">{title}</h3>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function CheckoutInput({
  label,
  className,
  ...rest
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className={`block text-sm ${className ?? ""}`}>
      <span className="mb-1.5 block text-xs font-semibold text-muted-foreground">{label}</span>
      <input
        {...rest}
        className="h-10 w-full rounded-md border border-border bg-background px-3 outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/15 disabled:opacity-60"
      />
    </label>
  );
}
