import { z } from "zod";

import { ROLE_VALUES } from "../models/User.js";

const handlePattern = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/;

export const registerSchema = z
  .object({
    name: z.string().min(1).max(120),
    email: z.string().email(),
    password: z.string().min(8).max(200),
    becomeSeller: z.boolean().optional(),
    sellerHandle: z
      .string()
      .min(2)
      .max(64)
      .regex(handlePattern, "sellerHandle must be lowercase letters, numbers, hyphens")
      .optional(),
  })
  .strict()
  .superRefine((data, ctx) => {
    if (data.sellerHandle && !data.becomeSeller) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "sellerHandle requires becomeSeller to be true",
        path: ["sellerHandle"],
      });
    }
  });

export const loginSchema = z
  .object({
    email: z.string().email(),
    password: z.string().min(1).max(200),
  })
  .strict();