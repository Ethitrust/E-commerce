/**
 * Phase 4 checkout flow. Requires Mongo + published product + sufficient stock (`npm run seed`).
 */
import assert from "node:assert/strict";

import { Types } from "mongoose";
import request from "supertest";

import { createApp } from "../app.js";
import { connectMongo, disconnectMongo } from "../db.js";
import { CartItem } from "../models/CartItem.js";
import { Order } from "../models/Order.js";
import { Product } from "../models/Product.js";
import { RefreshSession } from "../models/RefreshSession.js";
import { User } from "../models/User.js";

async function main() {
  await connectMongo();
  const app = createApp();

  const prod = await Product.findOne({ moderationStatus: "published", stock: { $gte: 2 } })
    .select("_id stock")
    .lean()
    .exec();

  if (!prod) {
    console.error(
      `smoke-checkout skipped — no published product with stock≥2 in DB (run "npm run seed" first).`,
    );
    return;
  }
  const productIdHex = prod._id.toString();

  const stamp = Date.now();
  const email = `smoke-checkout-${stamp}@example.test`;
  const password = "smoke-checkout-password-ok-99";

  let res = await request(app)
    .post("/api/v1/auth/register")
    .send({ name: "Smoke Checkout", email, password, becomeSeller: false })
    .expect(201);

  const accessToken = res.body.accessToken as string;
  const userId = res.body.user.id as string;
  assert.ok(accessToken);

  const auth = { Authorization: `Bearer ${accessToken}` };

  try {
    await request(app)
      .put("/api/v1/me/cart")
      .set(auth)
      .send({ items: [{ productId: productIdHex, quantity: 1 }] })
      .expect(200);

    res = await request(app)
      .post("/api/v1/checkout")
      .set(auth)
      .send({
        shippingAddress: {
          name: "Test User",
          email: "buyer@example.test",
          line1: "1 Test St",
          city: "SF",
          postalCode: "94110",
          country: "US",
        },
        paymentMethod: "card",
      })
      .expect(201);

    const order = res.body.order as { orderNumber: string; total: number; lineItems: unknown[] };
    assert.ok(order.orderNumber?.startsWith("NX-"));
    assert.ok(Number.isFinite(order.total));
    assert.equal(order.lineItems.length, 1);

    res = await request(app).get("/api/v1/me/orders").set(auth).expect(200);
    assert.ok(Array.isArray(res.body.orders));
    assert.ok(res.body.orders.some((o: { orderNumber: string }) => o.orderNumber === order.orderNumber));

    res = await request(app)
      .get(`/api/v1/me/orders/${encodeURIComponent(order.orderNumber)}`)
      .set(auth)
      .expect(200);
    assert.equal(res.body.order.orderNumber, order.orderNumber);

    console.log("smoke-checkout OK — checkout + /me/orders verified.");
  } finally {
    const oid = new Types.ObjectId(userId);
    await Order.deleteMany({ buyerUserId: oid }).exec();
    await CartItem.deleteMany({ userId: oid }).exec();
    await RefreshSession.deleteMany({ userId: oid }).exec();
    await User.deleteOne({ _id: oid }).exec();
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await disconnectMongo();
  });
