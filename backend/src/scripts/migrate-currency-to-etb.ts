/**
 * One-off migration that rewrites every legacy `USD` currency on Product and
 * Order documents to `ETB`. Run once after deploying the Ethitrust + ETB
 * switch. Idempotent: running it again is a no-op.
 *
 *   npm run migrate:currency-etb
 *
 * The script intentionally does NOT recompute prices — numeric values are
 * untouched. If you previously stored USD amounts you'll need a separate FX
 * conversion job; this migration only updates the currency code.
 */
import { connectMongo, disconnectMongo } from "../db.js";
import { Order } from "../models/Order.js";
import { Product } from "../models/Product.js";

async function run(): Promise<void> {
  await connectMongo();

  console.info("[migrate] Updating Product.currency: USD -> ETB");
  const productRes = await Product.updateMany(
    { currency: "USD" },
    { $set: { currency: "ETB" } },
  ).exec();
  console.info(`[migrate]  ${productRes.modifiedCount} product(s) updated`);

  console.info("[migrate] Updating Order.currency: USD -> ETB");
  const orderRes = await Order.updateMany(
    { currency: "USD" },
    { $set: { currency: "ETB" } },
  ).exec();
  console.info(`[migrate]  ${orderRes.modifiedCount} order(s) updated`);

  await disconnectMongo();
}

run().catch((err) => {
  console.error("[migrate] failed", err);
  process.exitCode = 1;
});
