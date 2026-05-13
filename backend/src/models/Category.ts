import { Schema, Types, model, type InferSchemaType } from "mongoose";

const categorySchema = new Schema(
  {
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    icon: { type: String, required: true, trim: true },
    /** Denormalized count of published products in this category. */
    productCount: { type: Number, required: true, default: 0, min: 0 },
  },
  { timestamps: true },
);

export type CategoryDocument = InferSchemaType<typeof categorySchema> & { _id: Types.ObjectId };

export const Category = model("Category", categorySchema);
