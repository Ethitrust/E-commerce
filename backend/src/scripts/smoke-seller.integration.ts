/**
 * Integration smoke for Phase 5 /seller endpoints. Requires Mongo + at least one category (`npm run seed`).
 */
import assert from "node:assert/strict";

import { Types } from "mongoose";
import request from "supertest";

import { createApp } from "../app.js";
import { connectMongo, disconnectMongo } from "../db.js";
import { Category } from "../models/Category.js";
import { Product } from "../models/Product.js";
import { RefreshSession } from "../models/RefreshSession.js";
import { Seller } from "../models/Seller.js";
import { User } from "../models/User.js";

async function main() {
  await connectMongo();
  const app = createApp();

  const cat = await Category.findOne().select("slug").lean().exec();
  if (!cat?.slug) {
    console.error(`smoke-seller skipped — no category in DB (run "npm run seed" first).`);
    return;
  }

  const stamp = Date.now();
  const email = `smoke-seller-${stamp}@example.test`;
  const password = "smoke-seller-password-ok-99";
  const sellerHandle = `smoke-shop-${stamp}`;

  let res = await request(app)
    .post("/api/v1/auth/register")
    .send({
      name: "Smoke Seller",
      email,
      password,
      becomeSeller: true,
      sellerHandle,
    })
    .expect(201);

  const accessToken = res.body.accessToken as string;
  const userId = res.body.user.id as string;
  assert.ok(accessToken);
  assert.equal(res.body.user.role, "seller");

  const auth = { Authorization: `Bearer ${accessToken}` };
  const slug = `smoke-prod-${stamp}`;

  let productMongoId = "";

  try {
    await request(app).get("/api/v1/seller/products").set(auth).expect(200);

    await request(app).get("/api/v1/seller/dashboard/stats").set(auth).expect(200);

    res = await request(app)
      .post("/api/v1/seller/products")
      .set(auth)
      .send({
        title: `Smoke product ${stamp}`,
        slug,
        price: 9.99,
        categorySlug: cat.slug,
        image: "https://via.placeholder.com/400",
        stock: 10,
      })
      .expect(201);

    productMongoId = res.body.product.id as string;
    assert.ok(productMongoId);

    res = await request(app).get("/api/v1/seller/products").set(auth).expect(200);
    assert.ok(Array.isArray(res.body.products));
    assert.ok(res.body.products.some((p: { slug: string }) => p.slug === slug));

    await request(app)
      .patch(`/api/v1/seller/products/${encodeURIComponent(productMongoId)}`)
      .set(auth)
      .send({ stock: 5 })
      .expect(200);

    await request(app)
      .delete(`/api/v1/seller/products/${encodeURIComponent(productMongoId)}`)
      .set(auth)
      .expect(204);

    await request(app).get("/api/v1/seller/orders").set(auth).expect(200);

    res = await request(app).get("/api/v1/seller/products").set(auth).expect(200);
    assert.ok(Array.isArray(res.body.products));
    assert.ok(!res.body.products.some((p: { slug: string }) => p.slug === slug));

    console.log("smoke-seller OK — seller products + dashboard + archive verified.");
  } finally {
    const oid = new Types.ObjectId(userId);
    await Product.deleteMany({ slug }).exec();
    if (/^[a-f0-9]{24}$/iu.test(productMongoId)) {
      await Product.deleteOne({ _id: new Types.ObjectId(productMongoId) }).exec();
    }
    await RefreshSession.deleteMany({ userId: oid }).exec();
    await User.deleteOne({ _id: oid }).exec();
    await Seller.deleteMany({ ownerUserId: oid }).exec();
    await Seller.deleteMany({ handle: sellerHandle }).exec();
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
