import { Schema, Types, model, type InferSchemaType } from "mongoose";

const cartItemSchema = new Schema(
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
    quantity: { type: Number, required: true, min: 1 },
  },
  { timestamps: true },
);

cartItemSchema.index({ userId: 1, productId: 1 }, { unique: true });

export type CartItemDocument = InferSchemaType<typeof cartItemSchema> & { _id: Types.ObjectId };

export const CartItem = model("CartItem", cartItemSchema, "cart_items");
