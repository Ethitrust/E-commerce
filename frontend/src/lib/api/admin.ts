import { fetchJsonAuthed } from "@/lib/api/client";

export type AdminTransactionsWeekDay = {
  label: string;
  transactions: number;
  gmv: number;
};

export type AdminDashboardStats = {
  usersTotal: number;
  ordersTotal: number;
  gmvTotal: number;
  sellersPending: number;
  productsPending: number;
  transactionsWeek: AdminTransactionsWeekDay[];
};

export type AdminSellerRow = {
  id: string;
  name: string;
  handle: string;
  status: string;
  verified: boolean;
  whoPaysFees: "buyer" | "seller" | "split";
  ownerUserId: string;
  ownerName: string;
  ownerEmail: string;
  joinedYear?: string;
  createdAt: string;
  updatedAt: string;
};

export type AdminSellersResponse = {
  sellers: AdminSellerRow[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
};

export type AdminProductRow = {
  id: string;
  title: string;
  slug: string;
  price: number;
  currency: string;
  categorySlug: string;
  moderationStatus: string;
  archived: boolean;
  sellerId: string;
  sellerName: string;
  sellerHandle: string;
  image: string;
  updatedAt: string;
};

export type AdminProductsResponse = {
  products: AdminProductRow[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
};

export async function fetchAdminDashboardStats(): Promise<AdminDashboardStats> {
  return fetchJsonAuthed<AdminDashboardStats>("/admin/dashboard/stats");
}

export async function fetchAdminSellers(searchParams?: {
  status?: "pending" | "approved" | "suspended" | "all";
  page?: number;
  limit?: number;
}): Promise<AdminSellersResponse> {
  const qs = new URLSearchParams();
  if (searchParams?.status) {
    qs.set("status", searchParams.status);
  }
  if (searchParams?.page != null) {
    qs.set("page", String(searchParams.page));
  }
  if (searchParams?.limit != null) {
    qs.set("limit", String(searchParams.limit));
  }
  const q = qs.toString();
  return fetchJsonAuthed<AdminSellersResponse>(`/admin/sellers${q ? `?${q}` : ""}`);
}

export async function fetchAdminProducts(searchParams?: {
  moderation?: "pending" | "draft" | "published" | "rejected" | "all";
  page?: number;
  limit?: number;
}): Promise<AdminProductsResponse> {
  const qs = new URLSearchParams();
  if (searchParams?.moderation) {
    qs.set("moderation", searchParams.moderation);
  }
  if (searchParams?.page != null) {
    qs.set("page", String(searchParams.page));
  }
  if (searchParams?.limit != null) {
    qs.set("limit", String(searchParams.limit));
  }
  const q = qs.toString();
  return fetchJsonAuthed<AdminProductsResponse>(`/admin/products${q ? `?${q}` : ""}`);
}

export async function patchAdminSeller(
  sellerId: string,
  body: {
    status?: "pending" | "approved" | "suspended";
    verified?: boolean;
    whoPaysFees?: "buyer" | "seller" | "split";
  },
): Promise<AdminSellerRow> {
  const { seller } = await fetchJsonAuthed<{ seller: AdminSellerRow }>(
    `/admin/sellers/${encodeURIComponent(sellerId)}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );
  return seller;
}

export async function patchAdminProduct(
  productId: string,
  body: { moderationStatus: "published" | "rejected" | "draft" },
): Promise<AdminProductRow> {
  const { product } = await fetchJsonAuthed<{ product: AdminProductRow }>(
    `/admin/products/${encodeURIComponent(productId)}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );
  return product;
}
