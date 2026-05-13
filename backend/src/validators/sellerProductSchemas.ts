import { z } from "zod";

const slugPattern = /^[a-z0-9]+(-[a-z0-9]+)*$/;

const specEntrySchema = z
  .object({
    label: z.string().min(1).max(200),
    value: z.string().min(1).max(500),
  })
  .strict();

export const sellerProductCreateSchema = z
  .object({
    title: z.string().min(1).max(200).trim(),
    slug: z
      .string()
      .min(2)
      .max(160)
      .trim()
      .toLowerCase()
      .regex(slugPattern),
    price: z.coerce.number().min(0),
    currency: z.string().min(3).max(8).trim().optional().default("USD"),
    originalPrice: z.coerce.number().min(0).optional(),
    categorySlug: z.string().min(1).max(120).trim().toLowerCase(),
    image: z.string().min(1).max(2000),
    gallery: z.array(z.string().min(1).max(2000)).max(24).optional().default([]),
    stock: z.coerce.number().int().min(0).optional().default(0),
    shipping: z.string().max(240).trim().optional().default(""),
    badge: z.enum(["new", "hot", "deal", "bid"]).optional(),
    bidCount: z.coerce.number().int().min(0).optional(),
    bidEndsAt: z.string().trim().max(120).optional(),
    description: z.string().max(50_000).optional().default(""),
    specs: z.array(specEntrySchema).optional().default([]),
    tags: z.array(z.string().min(1).max(80)).optional().default([]),
  })
  .strict();

export type SellerProductCreateInput = z.infer<typeof sellerProductCreateSchema>;

export const sellerProductPatchSchema = z
  .object({
    title: z.string().min(1).max(200).trim().optional(),
    slug: z
      .string()
      .min(2)
      .max(160)
      .trim()
      .toLowerCase()
      .regex(slugPattern)
      .optional(),
    price: z.coerce.number().min(0).optional(),
    currency: z.string().min(3).max(8).trim().optional(),
    originalPrice: z.coerce.number().min(0).nullable().optional(),
    categorySlug: z.string().min(1).max(120).trim().toLowerCase().optional(),
    image: z.string().min(1).max(2000).optional(),
    gallery: z.array(z.string().min(1).max(2000)).max(24).optional(),
    stock: z.coerce.number().int().min(0).optional(),
    shipping: z.string().max(240).trim().optional(),
    badge: z.enum(["new", "hot", "deal", "bid"]).nullable().optional(),
    bidCount: z.coerce.number().int().min(0).nullable().optional(),
    bidEndsAt: z.string().trim().max(120).nullable().optional(),
    description: z.string().max(50_000).optional(),
    specs: z.array(specEntrySchema).optional(),
    tags: z.array(z.string().min(1).max(80)).optional(),
  })
  .strict()
  .refine((body) => Object.values(body).some((v) => v !== undefined), {
    message: "At least one field is required",
    path: ["body"],
  });

export type SellerProductPatchInput = z.infer<typeof sellerProductPatchSchema>;
