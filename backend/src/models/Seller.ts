import { Schema, Types, model, type InferSchemaType } from "mongoose";

const sellerStatsSchema = new Schema(
  {
    rating: { type: Number, default: 0 },
    reviews: { type: Number, default: 0 },
    sales: { type: Number, default: 0 },
  },
  { _id: false },
);

const SELLER_STATUS = ["pending", "approved", "suspended"] as const;

const sellerSchema = new Schema(
  {
    ownerUserId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    handle: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    avatar: { type: String, default: "" },
    banner: { type: String, default: "" },
    bio: { type: String, default: "" },
    location: { type: String, default: "" },
    verified: { type: Boolean, default: false },
    joinedYear: { type: String, default: () => String(new Date().getFullYear()) },
    stats: { type: sellerStatsSchema, default: () => ({}) },
    status: {
      type: String,
      enum: SELLER_STATUS,
      default: "pending",
    },
  },
  { timestamps: true },
);

export type SellerDocument = InferSchemaType<typeof sellerSchema> & { _id: Types.ObjectId };

export const Seller = model("Seller", sellerSchema);
