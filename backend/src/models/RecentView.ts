import { Schema, Types, model, type InferSchemaType } from "mongoose";

const recentViewSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    productId: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    viewedAt: { type: Date, required: true, default: () => new Date() },
  },
  { timestamps: true },
);

recentViewSchema.index({ userId: 1, productId: 1 }, { unique: true });
recentViewSchema.index({ userId: 1, viewedAt: -1 });

export type RecentViewDocument = InferSchemaType<typeof recentViewSchema> & { _id: Types.ObjectId };

export const RecentView = model("RecentView", recentViewSchema, "recent_views");
