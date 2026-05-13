/**
 * Published storefront listings exclude soft-archived seller products.
 * Use `{ $ne: true }` so legacy documents without `archived` remain visible.
 */
export const catalogPublishedListingFilter = {
  moderationStatus: "published" as const,
  archived: { $ne: true },
};
