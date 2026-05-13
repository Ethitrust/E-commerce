import { create } from "zustand";
import { persist } from "zustand/middleware";
import { toast } from "sonner";

import { ApiError, fetchJson } from "@/lib/api/client";
import { clearAccessToken, getAccessToken, setAccessToken } from "@/lib/api/auth-session";
import { normalizeProduct } from "@/lib/api/catalogNormalize";
import type { MeCartLineJson } from "@/lib/api/me";
import {
  getMeCart,
  getMeRecent,
  getMeWishlist,
  postMeRecent,
  putMeCart,
  putMeWishlist,
} from "@/lib/api/me";
import { isDemoProfileUser } from "@/lib/auth/profile";
import type { Product, Role } from "@/lib/mock-data";

export interface CartItem {
  productId: string;
  quantity: number;
  product: Product;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  avatar: string;
}

function linesToCartItems(lines: MeCartLineJson[]): CartItem[] {
  return lines.map((row) => ({
    productId: row.productId,
    quantity: row.quantity,
    product: normalizeProduct(row.product),
  }));
}

async function mergeLocalCartIntoServer(local: CartItem[]): Promise<CartItem[]> {
  const server = await getMeCart();
  const merged = new Map<string, { qty: number; product: Product }>();
  for (const row of server.items) {
    merged.set(row.productId, {
      qty: row.quantity,
      product: normalizeProduct(row.product),
    });
  }
  for (const row of local) {
    const prev = merged.get(row.productId);
    const q = (prev?.qty ?? 0) + row.quantity;
    merged.set(row.productId, {
      qty: q,
      product: prev?.product ?? row.product,
    });
  }
  const payload = [...merged.entries()].map(([productId, v]) => ({
    productId,
    quantity: v.qty,
  }));
  const replaced = await putMeCart({ items: payload });
  return linesToCartItems(replaced.items);
}

async function pushLocalCartReplacingRemote(cart: CartItem[]): Promise<CartItem[]> {
  const replaced = await putMeCart({
    items: cart.map((c) => ({ productId: c.productId, quantity: c.quantity })),
  });
  return linesToCartItems(replaced.items);
}

interface AppState {
  user: AuthUser | null;
  login: (user: AuthUser) => void;
  logout: () => Promise<void>;
  switchRole: (role: Role) => void;
  completeAuthenticatedSession: (accessToken: string, user: AuthUser) => Promise<void>;

  theme: "light" | "dark";
  toggleTheme: () => void;

  cart: CartItem[];
  addToCart: (p: Product, q?: number) => Promise<void>;
  removeFromCart: (id: string) => Promise<void>;
  updateQuantity: (id: string, q: number) => Promise<void>;
  clearCart: () => Promise<void>;

  wishlist: string[];
  toggleWishlist: (id: string) => Promise<void>;

  recent: string[];
  pushRecent: (id: string) => Promise<void>;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      user: null,
      login: (user) => set({ user }),
      logout: async () => {
        try {
          await fetchJson("/auth/logout", { method: "POST" });
        } catch {
          /* still clear client session */
        }
        clearAccessToken();
        set({ user: null });
      },
      switchRole: (role) => set((s) => (s.user ? { user: { ...s.user, role } } : {})),

      completeAuthenticatedSession: async (accessToken, user) => {
        setAccessToken(accessToken);
        set({ user });
        try {
          const mergedCart = await mergeLocalCartIntoServer(get().cart);
          const [wishRes, recentRes] = await Promise.all([getMeWishlist(), getMeRecent()]);
          set({
            cart: mergedCart,
            wishlist: wishRes.products.map((p) => normalizeProduct(p).id),
            recent: recentRes.productIds.slice(0, 8),
          });
        } catch (e) {
          const msg = e instanceof ApiError ? e.message : "Could not sync your marketplace data.";
          toast.error(msg);
        }
      },

      theme: "light",
      toggleTheme: () => {
        const next = get().theme === "light" ? "dark" : "light";
        if (typeof document !== "undefined") {
          document.documentElement.classList.toggle("dark", next === "dark");
        }
        set({ theme: next });
      },

      cart: [],
      addToCart: async (product, quantity = 1) => {
        const prev = get().cart;
        set((s) => {
          const existing = s.cart.find((c) => c.productId === product.id);
          if (existing) {
            return {
              cart: s.cart.map((c) =>
                c.productId === product.id ? { ...c, quantity: c.quantity + quantity } : c,
              ),
            };
          }
          return { cart: [...s.cart, { productId: product.id, quantity, product }] };
        });
        if (!getAccessToken()) return;
        try {
          const synced = await pushLocalCartReplacingRemote(get().cart);
          set({ cart: synced });
        } catch {
          set({ cart: prev });
          toast.error("Could not update cart on the server.");
        }
      },
      removeFromCart: async (id) => {
        const prev = get().cart;
        set((s) => ({ cart: s.cart.filter((c) => c.productId !== id) }));
        if (!getAccessToken()) return;
        try {
          const synced = await pushLocalCartReplacingRemote(get().cart);
          set({ cart: synced });
        } catch {
          set({ cart: prev });
          toast.error("Could not update cart on the server.");
        }
      },
      updateQuantity: async (id, q) => {
        const prev = get().cart;
        set((s) => ({
          cart: s.cart.map((c) => (c.productId === id ? { ...c, quantity: Math.max(1, q) } : c)),
        }));
        if (!getAccessToken()) return;
        try {
          const synced = await pushLocalCartReplacingRemote(get().cart);
          set({ cart: synced });
        } catch {
          set({ cart: prev });
          toast.error("Could not update cart on the server.");
        }
      },
      clearCart: async () => {
        const prev = get().cart;
        set({ cart: [] });
        if (!getAccessToken()) return;
        try {
          const synced = await pushLocalCartReplacingRemote([]);
          set({ cart: synced });
        } catch {
          set({ cart: prev });
          toast.error("Could not clear cart on the server.");
        }
      },

      wishlist: [],
      toggleWishlist: async (id) => {
        const prev = get().wishlist;
        const add = !prev.includes(id);
        set((s) => ({
          wishlist: add ? [...s.wishlist, id] : s.wishlist.filter((x) => x !== id),
        }));
        if (!getAccessToken()) return;
        try {
          await putMeWishlist(id, { add });
        } catch {
          set({ wishlist: prev });
          toast.error("Could not update wishlist.");
        }
      },

      recent: [],
      pushRecent: async (id) => {
        set((s) => ({
          recent: [id, ...s.recent.filter((x) => x !== id)].slice(0, 8),
        }));
        if (!getAccessToken()) return;
        try {
          await postMeRecent(id);
        } catch {
          /* browsing history is best-effort */
        }
      },
    }),
    {
      name: "nexus-marketplace",
      partialize: (s) => ({
        user: s.user,
        theme: s.theme,
        cart: s.cart,
        wishlist: s.wishlist,
        recent: s.recent,
      }),
      onRehydrateStorage: () => (state) => {
        if (!state || typeof window === "undefined") return;
        if (state.user && !isDemoProfileUser(state.user) && !getAccessToken()) {
          queueMicrotask(() => {
            useAppStore.setState({ user: null });
          });
        }
      },
    },
  ),
);

export const demoUsers: Record<Role, AuthUser> = {
  buyer: {
    id: "u1",
    name: "Alex Rivera",
    email: "alex@nexus.market",
    role: "buyer",
    avatar:
      "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80",
  },
  seller: {
    id: "u2",
    name: "Mira Chen",
    email: "mira@apexgear.com",
    role: "seller",
    avatar:
      "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=200&q=80",
  },
  admin: {
    id: "u3",
    name: "Jordan Lee",
    email: "jordan@nexus.market",
    role: "admin",
    avatar:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80",
  },
};
