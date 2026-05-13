/**
 * Integration smoke: registers a disposable user via supertest, exercises refresh/logout,
 * optionally logs in seed buyer when DEV_SEED_PASSWORD is set (`npm run seed` first).
 */
import assert from "node:assert/strict";

import { Types } from "mongoose";
import request from "supertest";

import { createApp } from "../app.js";
import { env } from "../config/env.js";
import { connectMongo, disconnectMongo } from "../db.js";
import { RefreshSession } from "../models/RefreshSession.js";
import { Seller } from "../models/Seller.js";
import { User } from "../models/User.js";

async function main() {
  await connectMongo();
  const app = createApp();
  const agent = request.agent(app);

  const stamp = Date.now();
  const sellerHandle = `smoke-shop-${stamp}`;
  const rawEmail = `SmokeBot+${stamp}@Example.COM`;
  const email = rawEmail.toLowerCase();
  const plainPassword = "smoke-password-ok";

  let res = await agent
    .post("/api/v1/auth/register")
    .send({
      name: "Smoke User",
      email: rawEmail,
      password: plainPassword,
      becomeSeller: true,
      sellerHandle,
    })
    .expect(201);

  assert.ok(res.body.accessToken, "accessToken");
  assert.equal(res.body.user.email, email);
  assert.equal(res.body.user.role, "seller");
  const disposableUserId = res.body.user.id as string;

  res = await agent
    .get("/api/v1/auth/me")
    .set("Authorization", `Bearer ${res.body.accessToken}`)
    .expect(200);

  assert.equal(res.body.email, email);
  assert.equal(res.body.role, "seller");

  res = await agent.post("/api/v1/auth/refresh").expect(200);
  assert.ok(res.body.accessToken, "refresh accessToken");

  res = await agent
    .get("/api/v1/auth/me")
    .set("Authorization", `Bearer ${res.body.accessToken}`)
    .expect(200);

  assert.equal(res.body.email, email);

  await agent.post("/api/v1/auth/logout").expect(200);
  await agent.post("/api/v1/auth/refresh").expect(401);

  res = await agent
    .post("/api/v1/auth/login")
    .send({ email, password: "wrong-password" })
    .expect(401);

  assert.equal(res.body?.error?.code, "INVALID_CREDENTIALS");

  await RefreshSession.deleteMany({
    userId: new Types.ObjectId(disposableUserId),
  }).exec();
  await User.deleteOne({ _id: disposableUserId }).exec();
  await Seller.deleteOne({ handle: sellerHandle }).exec();

  const seedPw = env.DEV_SEED_PASSWORD ?? process.env.DEV_SEED_PASSWORD;

  if (seedPw && seedPw.length >= 8) {
    const seeded = request.agent(app);
    res = await seeded
      .post("/api/v1/auth/login")
      .send({ email: "alex@nexus.market", password: seedPw })
      .expect(200);

    assert.equal(res.body.user.role, "buyer");
    await seeded.post("/api/v1/auth/logout").expect(200);
    console.log("smoke-auth OK — disposable user auth + seeded buyer login verified.");
    return;
  }

  console.log(
    `smoke-auth OK — disposable user auth verified (skipped seeded login; add DEV_SEED_PASSWORD and npm run seed to cover).`,
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await disconnectMongo();
  });
