/**
 * Idempotent dev seed: Phase 1 demo users + Phase 2 catalog (categories, sellers, products).
 * Requires DEV_SEED_PASSWORD in `.env` (see `.env.example`).
 */
import { env } from "../config/env.js";
import { connectMongo, disconnectMongo } from "../db.js";
import { hashPassword } from "../lib/passwords.js";
import { Category } from "../models/Category.js";
import { Product } from "../models/Product.js";
import { Seller } from "../models/Seller.js";
import { User } from "../models/User.js";

import {
  buildProductSeeds,
  EXTRA_SELLER_FIXTURES,
  MOCK_CATEGORIES,
} from "./catalogSeedData.js";

async function main() {
  const seedPassword =
    env.NODE_ENV === "test" ? process.env.DEV_SEED_PASSWORD : env.DEV_SEED_PASSWORD;

  if (!seedPassword || seedPassword.length < 8) {
    console.error(
      "Add DEV_SEED_PASSWORD=<at least 8 characters> to backend/.env",
      '(copy from backend/.env.example). It is required for "npm run seed" only.',
    );
    process.exit(1);
  }

  await connectMongo();
  const passwordHash = await hashPassword(seedPassword);

  await User.findOneAndUpdate(
    { email: "alex@nexus.market" },
    {
      $set: {
        passwordHash,
        name: "Alex Rivera",
        avatar:
          "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80",
        role: "buyer",
      },
      $unset: { sellerProfileId: 1 },
    },
    { upsert: true, setDefaultsOnInsert: true },
  );

  await User.findOneAndUpdate(
    { email: "jordan@nexus.market" },
    {
      $set: {
        passwordHash,
        name: "Jordan Lee",
        avatar:
          "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80",
        role: "admin",
      },
      $unset: { sellerProfileId: 1 },
    },
    { upsert: true, setDefaultsOnInsert: true },
  );

  const sellerUser = await User.findOneAndUpdate(
    { email: "mira@apexgear.com" },
    {
      $set: {
        passwordHash,
        name: "Mira Chen",
        avatar:
          "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=200&q=80",
        role: "seller",
      },
      $unset: { sellerProfileId: 1 },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  if (!sellerUser) {
    throw new Error("Seller user upsert failed");
  }

  const shop = await Seller.findOneAndUpdate(
    { handle: "apexgear" },
    {
      $set: {
        ownerUserId: sellerUser._id,
        name: "Apex Gear",
        avatar:
          "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80",
        banner:
          "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1600&q=80",
        bio: "Curated electronics and audio gear from independent brands.",
        location: "Berlin, DE",
        verified: true,
        joinedYear: "2019",
        stats: { rating: 4.9, reviews: 2840, sales: 18420 },
        status: "approved",
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  sellerUser.sellerProfileId = shop._id;
  sellerUser.role = "seller";
  await sellerUser.save();

  for (const c of MOCK_CATEGORIES) {
    await Category.findOneAndUpdate(
      { slug: c.slug },
      {
        $set: { name: c.name, icon: c.icon },
        $setOnInsert: { slug: c.slug, productCount: 0 },
      },
      { upsert: true, setDefaultsOnInsert: true },
    );
  }

  for (const ex of EXTRA_SELLER_FIXTURES) {
    const seedSellerUser = await User.findOneAndUpdate(
      { email: ex.ownerEmail },
      {
        $set: {
          passwordHash,
          name: ex.ownerName,
          avatar: ex.avatar,
          role: "seller",
        },
        $unset: { sellerProfileId: 1 },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    if (!seedSellerUser) {
      throw new Error(`Upsert seller user failed: ${ex.ownerEmail}`);
    }

    const exShop = await Seller.findOneAndUpdate(
      { handle: ex.handle },
      {
        $set: {
          ownerUserId: seedSellerUser._id,
          name: ex.shopName,
          handle: ex.handle,
          avatar: ex.avatar,
          banner: ex.banner,
          bio: ex.bio,
          location: ex.location,
          verified: ex.verified,
          joinedYear: ex.joinedYear,
          stats: ex.stats,
          status: "approved",
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    seedSellerUser.sellerProfileId = exShop._id;
    seedSellerUser.role = "seller";
    await seedSellerUser.save();
  }

  const productSeeds = buildProductSeeds();
  for (const row of productSeeds) {
    const { sellerHandle: _sellerHandleIgnored, ...rest } = row;
    const sellerDoc = await Seller.findOne({ handle: row.sellerHandle }).exec();
    if (!sellerDoc) {
      throw new Error(`Seller not found for product seed: ${row.sellerHandle}`);
    }

    await Product.findOneAndUpdate(
      { slug: row.slug },
      {
        $set: {
          ...rest,
          sellerId: sellerDoc._id,
        },
      },
      { upsert: true, setDefaultsOnInsert: true },
    );
  }

  const categoryDocs = await Category.find({}).lean();
  for (const c of categoryDocs) {
    const n = await Product.countDocuments({
      categorySlug: c.slug,
      moderationStatus: "published",
    }).exec();
    await Category.updateOne({ _id: c._id }, { $set: { productCount: n } });
  }

  console.log(
    "Seed OK — users (buyer, admin, 4 seller accounts), 8 categories, 4 shops, 15 published products, category counts reconciled.",
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
