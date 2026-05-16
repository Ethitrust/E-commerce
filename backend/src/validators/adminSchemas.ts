import { z } from "zod";

export const adminSellerPatchSchema = z
  .object({
    status: z.enum(["pending", "approved", "suspended"]).optional(),
    verified: z.boolean().optional(),
    whoPaysFees: z.enum(["buyer", "seller", "split"]).optional(),
  })
  .strict()
  .refine(
    (body) =>
      body.status !== undefined ||
      body.verified !== undefined ||
      body.whoPaysFees !== undefined,
    {
      message: "At least one field is required",
      path: ["body"],
    },
  );

export type AdminSellerPatchInput = z.infer<typeof adminSellerPatchSchema>;

export const adminProductPatchSchema = z
  .object({
    moderationStatus: z.enum(["published", "rejected", "draft"]),
  })
  .strict();

export type AdminProductPatchInput = z.infer<typeof adminProductPatchSchema>;

export const adminSellersListQuerySchema = z
  .object({
    status: z.enum(["pending", "approved", "suspended", "all"]).optional().default("all"),
    page: z.coerce.number().int().min(1).optional().default(1),
    limit: z.coerce.number().int().min(1).max(100).optional().default(50),
  })
  .strict();

export type AdminSellersListQuery = z.infer<typeof adminSellersListQuerySchema>;

export const adminProductsListQuerySchema = z
  .object({
    moderation: z
      .enum(["pending", "draft", "published", "rejected", "all"])
      .optional()
      .default("pending"),
    page: z.coerce.number().int().min(1).optional().default(1),
    limit: z.coerce.number().int().min(1).max(100).optional().default(50),
  })
  .strict();

export type AdminProductsListQuery = z.infer<typeof adminProductsListQuerySchema>;
