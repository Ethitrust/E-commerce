import { config as loadDotenv } from "dotenv";
import { z } from "zod";

loadDotenv();

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  MONGODB_URI: z.string().min(1, "MONGODB_URI is required"),
  CORS_ORIGIN: z.string().default("http://localhost:8080"),
  JWT_ACCESS_SECRET: z
    .string()
    .min(16, "JWT_ACCESS_SECRET must be at least 16 characters"),
  JWT_REFRESH_SECRET: z
    .string()
    .min(16, "JWT_REFRESH_SECRET must be at least 16 characters"),
  JWT_ACCESS_EXPIRES: z.string().default("15m"),
  JWT_REFRESH_EXPIRES: z.string().default("7d"),
  /** httpOnly refresh cookie name */
  REFRESH_COOKIE_NAME: z.string().default("refresh"),
  /** Required to run `npm run seed` (plain text; keep out of production deploys) */
  DEV_SEED_PASSWORD: z.string().min(8).optional(),

  /** Optional — seller listing uploads (`POST /seller/uploads/image`). All three required when uploads are enabled. */
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),

  /**
   * Ethitrust org-escrows integration. When ETHITRUST_API_KEY is set, every checkout
   * creates one escrow per distinct seller on the order. If unset, checkout still works
   * but skips escrow creation (logged as a warning).
   */
  ETHITRUST_API_KEY: z.string().optional(),
  ETHITRUST_BASE_URL: z.string().default("https://api.ethitrust.me"),
  /** Optional shared secret used to verify inbound `X-Signature` on the webhook endpoint. */
  ETHITRUST_WEBHOOK_SECRET: z.string().optional(),
  /** Used when a seller has no `whoPaysFees` override set. */
  ETHITRUST_DEFAULT_WHO_PAYS_FEES: z.enum(["buyer", "seller", "split"]).default("split"),
});

function loadEnv(): z.infer<typeof envSchema> {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.error("Invalid environment variables:");
    console.error(result.error.flatten().fieldErrors);
    process.exit(1);
  }
  return result.data;
}

export const env = loadEnv();
