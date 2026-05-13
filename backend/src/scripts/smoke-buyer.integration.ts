/**
 * Integration smoke for Phase 3 /me endpoints. Requires Mongo + at least one published product (`npm run seed`).
 */
import assert from "node:assert/strict";

import { Types } from "mongoose";
import request from "supertest";

import { createApp } from "../app.js";
import { connectMongo, disconnectMongo } from "../db.js";
import { CartItem } from "../models/CartItem.js";
import { Product } from "../models/Product.js";
import { RecentView } from "../models/RecentView.js";
import { RefreshSession } from "../models/RefreshSession.js";
import { User } from "../models/User.js";
import { WishlistItem } from "../models/WishlistItem.js";

async function main() {
  await connectMongo();
  const app = createApp();

  const prod = await Product.findOne({ moderationStatus: "published" }).select("_id").lean().exec();
  if (!prod) {
    console.error(`smoke-buyer skipped — no published product in DB (run "npm run seed" first).`);
    return;
  }
  const productIdHex = prod._id.toString();

  const stamp = Date.now();
  const email = `smoke-buyer-${stamp}@example.test`;
  const password = "smoke-buyer-password-ok-99";

  let res = await request(app)
    .post("/api/v1/auth/register")
    .send({ name: "Smoke Buyer", email, password, becomeSeller: false })
    .expect(201);

  const accessToken = res.body.accessToken as string;
  const userId = res.body.user.id as string;
  assert.ok(accessToken, "accessToken");

  const auth = { Authorization: `Bearer ${accessToken}` };

  try {
    res = await request(app)
      .put("/api/v1/me/cart")
      .set(auth)
      .send({ items: [{ productId: productIdHex, quantity: 2 }] })
      .expect(200);
    assert.ok(Array.isArray(res.body.items));
    const line = res.body.items.find((x: { productId: string }) => x.productId === productIdHex);
    assert.equal(line.quantity, 2);

    res = await request(app).get("/api/v1/me/cart").set(auth).expect(200);
    assert.equal(
      res.body.items.find((x: { productId: string }) => x.productId === productIdHex).quantity,
      2,
    );

    await request(app).put(`/api/v1/me/wishlist/${productIdHex}`).set(auth).send({ add: true }).expect(204);

    res = await request(app).get("/api/v1/me/wishlist").set(auth).expect(200);
    assert.ok(Array.isArray(res.body.products));
    assert.ok(res.body.products.some((p: { id: string }) => p.id === productIdHex));

    await request(app).post(`/api/v1/me/recent/${productIdHex}`).set(auth).expect(204);

    res = await request(app).get("/api/v1/me/recent").set(auth).expect(200);
    assert.ok(Array.isArray(res.body.productIds));
    assert.ok(res.body.productIds.includes(productIdHex));

    await request(app).put(`/api/v1/me/wishlist/${productIdHex}`).set(auth).send({ add: false }).expect(204);

    res = await request(app).put("/api/v1/me/cart").set(auth).send({ items: [] }).expect(200);
    assert.ok(Array.isArray(res.body.items));
    assert.equal(res.body.items.length, 0);

    console.log("smoke-buyer OK — /me cart, wishlist, recent verified.");
  } finally {
    const oid = new Types.ObjectId(userId);
    await CartItem.deleteMany({ userId: oid }).exec();
    await WishlistItem.deleteMany({ userId: oid }).exec();
    await RecentView.deleteMany({ userId: oid }).exec();
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
