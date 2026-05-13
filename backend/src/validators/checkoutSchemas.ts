import { z } from "zod";

export const PAYMENT_METHODS = ["card", "paypal", "apple_pay"] as const;

export const shippingAddressSchema = z
  .object({
    name: z.string().min(1).max(160).trim(),
    email: z.string().email(),
    line1: z.string().min(1).max(200).trim(),
    city: z.string().min(1).max(120).trim(),
    postalCode: z.string().min(2).max(32).trim(),
    country: z.string().min(2).max(80).trim().optional().default("US"),
  })
  .strict();

export const checkoutBodySchema = z
  .object({
    shippingAddress: shippingAddressSchema,
    paymentMethod: z.enum(PAYMENT_METHODS),
  })
  .strict();

export type CheckoutBodyInput = z.infer<typeof checkoutBodySchema>;
