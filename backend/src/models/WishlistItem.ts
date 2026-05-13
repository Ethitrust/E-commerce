import { Schema, Types, model, type InferSchemaType } from "mongoose";

const wishlistItemSchema = new Schema(
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
  },
  { timestamps: true },
);

wishlistItemSchema.index({ userId: 1, productId: 1 }, { unique: true });

export type WishlistItemDocument = InferSchemaType<typeof wishlistItemSchema> & { _id: Types.ObjectId };

export const WishlistItem = model("WishlistItem", wishlistItemSchema, "wishlist_items");
