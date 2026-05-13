import { Schema, Types, model, type InferSchemaType } from "mongoose";

export const ROLE_VALUES = ["buyer", "seller", "admin"] as const;

export type Role = (typeof ROLE_VALUES)[number];

const userSchema = new Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    passwordHash: {
      type: String,
      required: true,
      select: false,
    },
    name: { type: String, required: true, trim: true },
    avatar: { type: String, default: "" },
    role: {
      type: String,
      required: true,
      enum: ROLE_VALUES,
      default: "buyer",
    },
    sellerProfileId: {
      type: Schema.Types.ObjectId,
      ref: "Seller",
      default: undefined,
      index: false,
    },
  },
  { timestamps: true },
);

export type UserDocument = InferSchemaType<typeof userSchema> & { _id: Types.ObjectId };

export const User = model("User", userSchema);
