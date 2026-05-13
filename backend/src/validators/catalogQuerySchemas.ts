import { z } from "zod";

const objectIdString = z
  .string()
  .length(24)
  .regex(/^[a-f0-9]{24}$/iu)
  .optional();

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const categorySlugDetailQuerySchema = paginationQuerySchema;

export const productsListQuerySchema = paginationQuerySchema.extend({
  q: z.string().max(200).optional(),
  category: z.string().max(64).optional(),
  sellerId: objectIdString,
  sort: z
    .enum(["relevance", "price-asc", "price-desc", "rating", "newest"])
    .default("newest"),
});

export const sellersListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export const sellerDetailQuerySchema = paginationQuerySchema;
