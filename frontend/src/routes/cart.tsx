import { createFileRoute, Link } from "@tanstack/react-router";
import { ShoppingBag, Trash2 } from "lucide-react";
import { SiteShell } from "@/components/layout/SiteShell";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/store/use-app-store";

export const Route = createFileRoute("/cart")({
  component: CartPage,
});

function CartPage() {
  const { cart, removeFromCart, updateQuantity } = useAppStore();
  const subtotal = cart.reduce((s, c) => s + c.product.price * c.quantity, 0);
  const shipping = cart.length ? 12 : 0;
  const total = subtotal + shipping;

  return (
    <SiteShell>
      <div className="container-page py-12">
        <h1 className="text-3xl font-bold tracking-tight">Your cart</h1>
        <p className="mt-1 text-sm text-muted-foreground">{cart.length} items</p>

        {cart.length === 0 ? (
          <div className="mt-12 rounded-2xl border border-dashed border-border bg-surface p-16 text-center">
            <ShoppingBag className="mx-auto h-10 w-10 text-muted-foreground" />
            <p className="mt-4 text-base font-semibold">Your cart is empty</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Browse the marketplace to find something you love.
            </p>
            <Link to="/products" className="mt-6 inline-block">
              <Button>Continue shopping</Button>
            </Link>
          </div>
        ) : (
          <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_360px]">
            <div className="space-y-3">
              {cart.map((c) => (
                <div
                  key={c.productId}
                  className="flex gap-4 rounded-2xl border border-border bg-surface p-4"
                >
                  <Link
                    to="/products/$slug"
                    params={{ slug: c.product.slug }}
                    className="h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-muted"
                  >
                    <img src={c.product.image} alt="" className="h-full w-full object-cover" />
                  </Link>
                  <div className="flex flex-1 flex-col">
                    <Link
                      to="/products/$slug"
                      params={{ slug: c.product.slug }}
                      className="text-sm font-semibold hover:text-primary"
                    >
                      {c.product.title}
                    </Link>
                    <p className="mt-0.5 text-xs text-muted-foreground">{c.product.shipping}</p>
                    <div className="mt-auto flex items-center justify-between">
                      <div className="flex items-center rounded-lg border border-border">
                        <button
                          type="button"
                          onClick={() => void updateQuantity(c.productId, c.quantity - 1)}
                          className="px-2.5 py-1.5 text-sm font-bold"
                        >
                          −
                        </button>
                        <span className="w-8 text-center text-sm tabular-nums">{c.quantity}</span>
                        <button
                          type="button"
                          onClick={() => void updateQuantity(c.productId, c.quantity + 1)}
                          className="px-2.5 py-1.5 text-sm font-bold"
                        >
                          +
                        </button>
                      </div>
                      <p className="text-base font-bold">
                        ${(c.product.price * c.quantity).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => void removeFromCart(c.productId)}
                    className="self-start text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
            <aside className="h-fit rounded-2xl border border-border bg-surface p-6">
              <h3 className="text-base font-bold">Order summary</h3>
              <dl className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt>Subtotal</dt>
                  <dd className="tabular-nums">${subtotal.toLocaleString()}</dd>
                </div>
                <div className="flex justify-between">
                  <dt>Shipping</dt>
                  <dd className="tabular-nums">${shipping}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Tax</dt>
                  <dd className="tabular-nums">Calculated at checkout</dd>
                </div>
              </dl>
              <div className="my-4 border-t border-border" />
              <div className="flex justify-between text-base font-bold">
                <span>Total</span>
                <span className="tabular-nums">${total.toLocaleString()}</span>
              </div>
              <Link to="/checkout" className="mt-5 block">
                <Button className="w-full">Checkout</Button>
              </Link>
              <Link
                to="/products"
                className="mt-3 block text-center text-xs font-semibold text-muted-foreground hover:text-foreground"
              >
                Continue shopping
              </Link>
            </aside>
          </div>
        )}
      </div>
    </SiteShell>
  );
}
