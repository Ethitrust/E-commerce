/**
 * Integration smoke for Phase 6 /admin endpoints. Requires Mongo, seed data, DEV_SEED_PASSWORD (admin login).
 */
import assert from "node:assert/strict";

import { Types } from "mongoose";
import request from "supertest";

import { createApp } from "../app.js";
import { env } from "../config/env.js";
import { connectMongo, disconnectMongo } from "../db.js";
import { Category } from "../models/Category.js";
import { Product } from "../models/Product.js";
import { RefreshSession } from "../models/RefreshSession.js";
import { Seller } from "../models/Seller.js";
import { User } from "../models/User.js";

async function main() {
  const seedPw = env.DEV_SEED_PASSWORD ?? process.env.DEV_SEED_PASSWORD;

  if (!seedPw || seedPw.length < 8) {
    console.log(
      `smoke-admin skipped — set DEV_SEED_PASSWORD (8+ chars) and run "npm run seed" to exercise admin API.`,
    );
    return;
  }

  await connectMongo();
  const app = createApp();

  const cat = await Category.findOne().select("slug").lean().exec();
  if (!cat?.slug) {
    console.error(`smoke-admin skipped — no category in DB (run "npm run seed" first).`);
    return;
  }

  const stamp = Date.now();
  const email = `smoke-admin-${stamp}@example.test`;
  const password = "smoke-admin-password-ok-99";
  const sellerHandle = `smoke-admin-shop-${stamp}`;

  let res = await request(app)
    .post("/api/v1/auth/register")
    .send({
      name: "Smoke AdminSeller",
      email,
      password,
      becomeSeller: true,
      sellerHandle,
    })
    .expect(201);

  const disposableAccessToken = res.body.accessToken as string;
  const userId = res.body.user.id as string;

  assert.equal(res.body.user.role, "seller");
  const sellerAuthHeader = { Authorization: `Bearer ${disposableAccessToken}` };

  res = await request(app)
    .post("/api/v1/auth/login")
    .send({ email: "jordan@nexus.market", password: seedPw })
    .expect(200);

  const adminAccessToken = res.body.accessToken as string;
  assert.equal(res.body.user.role, "admin");
  const adminAuthHeader = { Authorization: `Bearer ${adminAccessToken}` };

  const slug = `smoke-admin-prod-${stamp}`;
  let productMongoId = "";

  try {
    res = await request(app).get("/api/v1/admin/dashboard/stats").set(adminAuthHeader).expect(200);
    assert.ok(typeof res.body.usersTotal === "number");
    assert.ok(typeof res.body.gmvTotal === "number");
    assert.ok(Array.isArray(res.body.transactionsWeek));

    res = await request(app).get("/api/v1/admin/sellers").set(adminAuthHeader).expect(200);
    assert.ok(Array.isArray(res.body.sellers));

    await request(app).get("/api/v1/admin/products").set(adminAuthHeader).expect(200);

    res = await request(app).get(`/api/v1/admin/sellers?status=pending&limit=80`).set(adminAuthHeader).expect(200);

    const pendingSeller = (
      res.body.sellers as Array<{ id: string; handle: string; ownerEmail: string; status: string }>
    ).find((s) => s.handle === sellerHandle || s.ownerEmail === email.toLowerCase());
    assert.ok(pendingSeller, "pending disposable seller appears in admin list");
    assert.equal(pendingSeller?.status, "pending");

    res = await request(app)
      .patch(`/api/v1/admin/sellers/${encodeURIComponent(pendingSeller!.id)}`)
      .set(adminAuthHeader)
      .send({ status: "approved" })
      .expect(200);

    assert.equal(res.body.seller.status, "approved");

    res = await request(app)
      .post("/api/v1/seller/products")
      .set(sellerAuthHeader)
      .send({
        title: `Smoke admin product ${stamp}`,
        slug,
        price: 12.99,
        categorySlug: cat.slug,
        image: "https://via.placeholder.com/400",
        stock: 5,
      })
      .expect(201);

    productMongoId = res.body.product.id as string;
    assert.ok(productMongoId);
    assert.equal(res.body.product.moderationStatus, "pending");

    res = await request(app).get("/api/v1/admin/products").set(adminAuthHeader).expect(200);
    assert.ok(Array.isArray(res.body.products));

    await request(app)
      .patch(`/api/v1/admin/products/${encodeURIComponent(productMongoId)}`)
      .set(adminAuthHeader)
      .send({ moderationStatus: "published" })
      .expect(200);

    console.log(
      'smoke-admin OK — dashboard, seller approval, pending product moderation, and publish verified.',
    );
  } finally {
    const oid = new Types.ObjectId(userId);
    await RefreshSession.deleteMany({ userId: oid }).exec();
    await Product.deleteMany({ slug }).exec();
    if (/^[a-f0-9]{24}$/iu.test(productMongoId)) {
      await Product.deleteOne({ _id: new Types.ObjectId(productMongoId) }).exec();
    }
    await Seller.deleteMany({ ownerUserId: oid }).exec();
    await Seller.deleteMany({ handle: sellerHandle }).exec();
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
