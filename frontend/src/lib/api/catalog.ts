import { fetchJson } from "@/lib/api/client";

import { normalizeCategory, normalizeProduct, normalizeSeller } from "@/lib/api/catalogNormalize";

import type { Category, Product, Seller } from "@/lib/mock-data";

export type ProductsListPagination = {
  page: number;

  limit: number;

  total: number;

  totalPages: number;
};

export type ProductsListResponse = {
  items: Product[];

  pagination: ProductsListPagination;
};

export type CategoryDetailResponse = {
  category: Category;

  products: Product[];

  pagination: { page: number; limit: number; total: number };
};

export type SellerStorefrontResponse = {
  seller: Seller;

  products: Product[];

  pagination: { page: number; limit: number; total: number };
};

export async function fetchCategories(): Promise<Category[]> {
  const rows = await fetchJson<unknown[]>("/categories");

  return rows.map((r) => normalizeCategory(r as Record<string, unknown>));
}

export async function fetchCategoryDetail(
  slug: string,

  opts?: { page?: number; limit?: number },
): Promise<CategoryDetailResponse> {
  const sp = new URLSearchParams();

  if (opts?.page != null) {
    sp.set("page", String(opts.page));
  }

  if (opts?.limit != null) {
    sp.set("limit", String(opts.limit));
  }

  const qs = sp.toString();

  const res = await fetchJson<{
    category: unknown;

    products: unknown[];

    pagination: CategoryDetailResponse["pagination"];
  }>(`/categories/${encodeURIComponent(slug)}${qs ? `?${qs}` : ""}`);

  return {
    category: normalizeCategory(res.category as Record<string, unknown>),

    products: res.products.map((p) => normalizeProduct(p as Record<string, unknown>)),

    pagination: res.pagination,
  };
}

export type FetchProductsArgs = {
  page?: number;

  limit?: number;

  q?: string;

  category?: string;

  sellerId?: string;

  sort?: string;
};

export async function fetchProductsList(
  args: FetchProductsArgs = {},
): Promise<ProductsListResponse> {
  const sp = new URLSearchParams();

  if (args.page != null) {
    sp.set("page", String(args.page));
  }

  if (args.limit != null) {
    sp.set("limit", String(args.limit));
  }

  if (args.q) {
    sp.set("q", args.q);
  }

  if (args.category) {
    sp.set("category", args.category);
  }

  if (args.sellerId) {
    sp.set("sellerId", args.sellerId);
  }

  if (args.sort) {
    sp.set("sort", args.sort);
  }

  const qs = sp.toString();

  const raw = await fetchJson<{ items: unknown[]; pagination: ProductsListPagination }>(
    `/products${qs ? `?${qs}` : ""}`,
  );

  return {
    items: raw.items.map((p) => normalizeProduct(p as Record<string, unknown>)),

    pagination: raw.pagination,
  };
}

export async function fetchProductBySlug(slug: string): Promise<Product> {
  const raw = await fetchJson<unknown>(`/products/${encodeURIComponent(slug)}`);

  return normalizeProduct(raw as Record<string, unknown>);
}

export async function fetchApprovedSellers(opts?: { limit?: number }): Promise<Seller[]> {
  const sp = new URLSearchParams();

  if (opts?.limit != null) {
    sp.set("limit", String(opts.limit));
  }

  const qs = sp.toString();

  const rows = await fetchJson<unknown[]>(`/sellers${qs ? `?${qs}` : ""}`);

  return rows.map((s) => normalizeSeller(s as Record<string, unknown>));
}

export async function fetchSellerStorefront(
  handle: string,

  opts?: { page?: number; limit?: number },
): Promise<SellerStorefrontResponse> {
  const sp = new URLSearchParams();

  if (opts?.page != null) {
    sp.set("page", String(opts.page));
  }

  if (opts?.limit != null) {
    sp.set("limit", String(opts.limit));
  }

  const qs = sp.toString();

  const raw = await fetchJson<{
    seller: unknown;

    products: unknown[];

    pagination: SellerStorefrontResponse["pagination"];
  }>(`/sellers/${encodeURIComponent(handle)}${qs ? `?${qs}` : ""}`);

  return {
    seller: normalizeSeller(raw.seller as Record<string, unknown>),

    products: raw.products.map((p) => normalizeProduct(p as Record<string, unknown>)),

    pagination: raw.pagination,
  };
}
