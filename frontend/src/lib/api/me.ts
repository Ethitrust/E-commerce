import { fetchJsonAuthed } from "@/lib/api/client";

export type MeCartLineJson = {
  productId: string;
  quantity: number;
  product: Record<string, unknown>;
};

export async function getMeCart(): Promise<{ items: MeCartLineJson[] }> {
  return fetchJsonAuthed<{ items: MeCartLineJson[] }>("/me/cart");
}

export async function putMeCart(body: {
  items: { productId: string; quantity: number }[];
}): Promise<{ items: MeCartLineJson[] }> {
  return fetchJsonAuthed<{ items: MeCartLineJson[] }>("/me/cart", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export async function getMeWishlist(): Promise<{ products: Record<string, unknown>[] }> {
  return fetchJsonAuthed<{ products: Record<string, unknown>[] }>("/me/wishlist");
}

export async function putMeWishlist(productId: string, body: { add: boolean }): Promise<void> {
  await fetchJsonAuthed<unknown>(`/me/wishlist/${encodeURIComponent(productId)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export async function getMeRecent(): Promise<{ productIds: string[] }> {
  return fetchJsonAuthed<{ productIds: string[] }>("/me/recent");
}

export async function postMeRecent(productId: string): Promise<void> {
  await fetchJsonAuthed<unknown>(`/me/recent/${encodeURIComponent(productId)}`, {
    method: "POST",
  });
}
