/**
 * Smoke test for Phase 2 catalog endpoints. Inserts disposable category, seller, user, product;
 * verifies GET handlers; removes fixtures. Requires Mongo (same DB as npm run dev / seed).
 */
import assert from "node:assert/strict";

import request from "supertest";

import { createApp } from "../app.js";
import { connectMongo, disconnectMongo } from "../db.js";
import { hashPassword } from "../lib/passwords.js";
import { Category } from "../models/Category.js";
import { Product } from "../models/Product.js";
import { Seller } from "../models/Seller.js";
import { User } from "../models/User.js";

async function main() {
  await connectMongo();
  const stamp = Date.now();
  const email = `smoke-catalog-${stamp}@example.test`;
  const handle = `smoke-sell-${stamp}`;
  const catSlug = `smoke-cat-${stamp}`;
  const prodSlug = `smoke-prod-${stamp}`;

  try {
    const passwordHash = await hashPassword(`SmokeCatalog-${stamp}-pw-xxxxxxxx`);
    const user = await User.create({
      email,
      passwordHash,
      name: "Smoke Catalog Bot",
      role: "seller",
    });

    const seller = await Seller.create({
      ownerUserId: user._id,
      name: "Smoke Vendor",
      handle,
      avatar: "",
      banner: "",
      bio: "",
      location: "Testville",
      verified: false,
      joinedYear: "2026",
      stats: { rating: 4.2, reviews: 3, sales: 9 },
      status: "approved",
    });

    user.sellerProfileId = seller._id;
    await user.save();

    await Category.create({ slug: catSlug, name: "Smoke Category", icon: "box", productCount: 0 });

    await Product.create({
      title: "Smoke Catalog Widget",
      slug: prodSlug,
      price: 19.99,
      currency: "USD",
      rating: 4.5,
      reviews: 2,
      sold: 0,
      stock: 5,
      image: "https://example.com/widget.jpg",
      gallery: [],
      categorySlug: catSlug,
      sellerId: seller._id,
      shipping: "Free",
      description: "Disposable smoke-test listing.",
      specs: [],
      tags: [],
      moderationStatus: "published",
    });

    await Category.updateOne({ slug: catSlug }, { $set: { productCount: 1 } }).exec();

    const app = createApp();

    let res = await request(app).get("/api/v1/categories").expect(200);
    assert.ok(Array.isArray(res.body));
    assert.ok(res.body.some((c: { slug: string }) => c.slug === catSlug));

    res = await request(app).get("/api/v1/products").query({ limit: 5 }).expect(200);
    assert.ok(Array.isArray(res.body.items));

    res = await request(app).get(`/api/v1/products/${encodeURIComponent(prodSlug)}`).expect(200);
    assert.equal(res.body.slug, prodSlug);
    assert.ok(res.body.seller);
    assert.equal(res.body.seller.handle, handle);

    res = await request(app).get("/api/v1/sellers").expect(200);
    assert.ok(Array.isArray(res.body));
    assert.ok(res.body.some((s: { handle: string }) => s.handle === handle));

    res = await request(app).get(`/api/v1/sellers/${encodeURIComponent(handle)}`).expect(200);
    assert.equal(res.body.seller.handle, handle);
    assert.ok(Array.isArray(res.body.products));

    res = await request(app).get(`/api/v1/categories/${encodeURIComponent(catSlug)}`).expect(200);
    assert.equal(res.body.category.slug, catSlug);
    assert.ok(res.body.products.length >= 1);

    console.log("smoke-catalog OK — disposable catalog fixtures verified.");
  } finally {
    await Product.deleteMany({ slug: prodSlug }).exec();
    await Category.deleteMany({ slug: catSlug }).exec();
    await Seller.deleteMany({ handle }).exec();
    await User.deleteMany({ email }).exec();
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
