import { ApiError, fetchJsonAuthed, resolveApiUrl } from "@/lib/api/client";
import { getAccessToken } from "@/lib/api/auth-session";

export type SellerDashboardChartPoint = {
  label: string;
  revenue: number;
};

export type SellerDashboardStats = {
  revenue14d: number;
  ordersTotal: number;
  orders14d: number;
  conversion: number;
  visitors: number;
  chart: SellerDashboardChartPoint[];
};

export type SellerProductBadge = "new" | "hot" | "deal" | "bid";

export type SellerProduct = {
  id: string;
  title: string;
  slug: string;
  price: number;
  originalPrice?: number;
  currency: string;
  rating: number;
  reviews: number;
  sold: number;
  stock: number;
  image: string;
  gallery: string[];
  categorySlug: string;
  sellerId: string;
  shipping: string;
  badge?: SellerProductBadge;
  bidCount?: number;
  bidEndsAt?: string;
  description: string;
  specs: { label: string; value: string }[];
  tags: string[];
  moderationStatus: string;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
};

export type SellerProductCreateBody = {
  title: string;
  slug: string;
  price: number;
  currency?: string;
  originalPrice?: number;
  categorySlug: string;
  image: string;
  gallery?: string[];
  stock?: number;
  shipping?: string;
  badge?: SellerProductBadge;
  bidCount?: number;
  bidEndsAt?: string;
  description?: string;
  specs?: { label: string; value: string }[];
  tags?: string[];
};

export type SellerProductPatchBody = Partial<SellerProductCreateBody> & {
  originalPrice?: number | null;
  badge?: SellerProductBadge | null;
  bidCount?: number | null;
  bidEndsAt?: string | null;
  gallery?: string[];
  specs?: { label: string; value: string }[];
  tags?: string[];
};

export type SellerOrderLine = {
  productId: string;
  title: string;
  slug: string;
  unitPrice: number;
  quantity: number;
  image: string;
  lineTotal: number;
};

export type SellerOrderEscrow = {
  escrowId: string;
  escrowStatus: string;
  inviteeEmail: string;
  amount: number;
  currency: string;
  whoPaysFees: "buyer" | "seller" | "split";
  lastEventAt: string | null;
};

export type SellerOrder = {
  orderNumber: string;
  status: string;
  createdAt: string;
  currency: string;
  orderTotal: number;
  buyerName: string;
  buyerEmail: string;
  sellerLines: SellerOrderLine[];
  sellerLinesRevenue: number;
  /** This seller's escrow on this order, if any. */
  escrow: SellerOrderEscrow | null;
};

export async function fetchSellerDashboardStats(): Promise<SellerDashboardStats> {
  return fetchJsonAuthed<SellerDashboardStats>("/seller/dashboard/stats");
}

export async function fetchSellerProducts(): Promise<SellerProduct[]> {
  const { products } = await fetchJsonAuthed<{ products: SellerProduct[] }>("/seller/products");
  return products;
}

export async function fetchSellerOrders(): Promise<SellerOrder[]> {
  const { orders } = await fetchJsonAuthed<{ orders: SellerOrder[] }>("/seller/orders");
  return orders;
}

/** Triggers Ethitrust to resend the buyer's escrow invitation email. */
export async function resendSellerEscrowInvitation(
  orderNumber: string,
): Promise<{ escrowId: string; resent: boolean }> {
  return fetchJsonAuthed<{ escrowId: string; resent: boolean }>(
    `/seller/orders/${encodeURIComponent(orderNumber)}/escrow/resend`,
    { method: "POST" },
  );
}

export async function createSellerProduct(body: SellerProductCreateBody): Promise<SellerProduct> {
  const { product } = await fetchJsonAuthed<{ product: SellerProduct }>("/seller/products", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return product;
}

export async function patchSellerProduct(
  productId: string,
  body: SellerProductPatchBody,
): Promise<SellerProduct> {
  const path = `/seller/products/${encodeURIComponent(productId)}`;
  const { product } = await fetchJsonAuthed<{ product: SellerProduct }>(path, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return product;
}

/** Soft-archives listing (204 No Content). */
export async function deleteSellerProduct(productId: string): Promise<void> {
  await fetchJsonAuthed<string>(`/seller/products/${encodeURIComponent(productId)}`, {
    method: "DELETE",
  });
}

/** Multipart upload to Cloudinary via backend (`multipart` field name: `image`). */
export async function uploadSellerProductImage(file: File): Promise<{ url: string }> {
  const headers = new Headers();
  if (typeof window !== "undefined") {
    const token = getAccessToken();
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
  }

  const body = new FormData();
  body.append("image", file);

  const res = await fetch(resolveApiUrl("/seller/uploads/image"), {
    method: "POST",
    body,
    credentials: "include",
    headers,
  });

  let raw: unknown;
  const ct = res.headers.get("content-type") ?? "";
  if (ct.includes("application/json")) {
    raw = await res.json();
  } else {
    raw = await res.text();
  }

  if (!res.ok) {
    const payload = typeof raw === "object" && raw !== null ? raw : {};
    const errPayload = payload as { error?: { code?: string; message?: string } };
    const message = errPayload.error?.message ?? (typeof raw === "string" ? raw : res.statusText);
    const code = errPayload.error?.code;
    throw new ApiError(message, res.status, code);
  }

  return raw as { url: string };
}
