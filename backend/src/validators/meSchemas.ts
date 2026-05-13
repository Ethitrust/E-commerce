import { Types } from "mongoose";
import { z } from "zod";

/** Cart replace body */
export const meCartPutSchema = z.object({
  items: z.array(
    z.object({
      productId: z
        .string()
        .length(24)
        .regex(/^[a-f0-9]{24}$/iu),
      quantity: z.coerce.number().int().min(1).max(999),
    }),
  ),
});

export type MeCartPutInput = z.infer<typeof meCartPutSchema>;

export const meWishlistPutSchema = z.object({
  add: z.boolean(),
});

export type MeWishlistPutInput = z.infer<typeof meWishlistPutSchema>;

export function parseMeProductParam(productIdRaw: string | undefined): Types.ObjectId | null {
  const raw = decodeURIComponent(productIdRaw ?? "").trim();
  if (!/^[a-f0-9]{24}$/iu.test(raw)) {
    return null;
  }
  try {
    return new Types.ObjectId(raw);
  } catch {
    return null;
  }
}
