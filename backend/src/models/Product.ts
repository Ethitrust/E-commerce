import { Schema, Types, model, type InferSchemaType } from "mongoose";

const specEntrySchema = new Schema(
  {
    label: { type: String, required: true },
    value: { type: String, required: true },
  },
  { _id: false },
);

const PRODUCT_BADGES = ["new", "hot", "deal", "bid"] as const;
const MODERATION_STATUS = ["draft", "pending", "published", "rejected"] as const;

const productSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    price: { type: Number, required: true, min: 0 },
    originalPrice: { type: Number, min: 0 },
    currency: { type: String, required: true, default: "ETB", trim: true },
    rating: { type: Number, required: true, default: 0, min: 0 },
    reviews: { type: Number, required: true, default: 0, min: 0 },
    sold: { type: Number, required: true, default: 0, min: 0 },
    stock: { type: Number, required: true, default: 0, min: 0 },
    image: { type: String, required: true },
    gallery: [{ type: String }],
    categorySlug: { type: String, required: true, index: true, lowercase: true, trim: true },
    sellerId: {
      type: Schema.Types.ObjectId,
      ref: "Seller",
      required: true,
      index: true,
    },
    // Prefer default over `required: true`; explicit `shipping: undefined` in create() can skip defaults otherwise.
    shipping: { type: String, trim: true, default: "" },
    badge: { type: String, enum: PRODUCT_BADGES },
    bidCount: { type: Number, min: 0 },
    bidEndsAt: { type: String, trim: true },
    description: { type: String, required: true, default: "" },
    specs: { type: [specEntrySchema], default: [] },
    tags: [{ type: String }],
    moderationStatus: {
      type: String,
      enum: MODERATION_STATUS,
      required: true,
      default: "draft",
      index: true,
    },
    archived: { type: Boolean, required: true, default: false, index: true },
  },
  { timestamps: true },
);

productSchema.index({ sellerId: 1, moderationStatus: 1 });

export type ProductDocument = InferSchemaType<typeof productSchema> & { _id: Types.ObjectId };

export const Product = model("Product", productSchema);
