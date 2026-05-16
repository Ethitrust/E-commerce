import { Schema, Types, model, type InferSchemaType } from "mongoose";

const PAYMENT_METHODS = ["card", "paypal", "apple_pay"] as const;
export type OrderPaymentMethod = (typeof PAYMENT_METHODS)[number];

const ORDER_STATUSES = ["Processing", "Shipped", "Delivered"] as const;
export type OrderStatusUi = (typeof ORDER_STATUSES)[number];

const shippingAddressSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    line1: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true },
    postalCode: { type: String, required: true, trim: true },
    country: { type: String, required: true, trim: true, default: "US" },
  },
  { _id: false },
);

const orderLineSchema = new Schema(
  {
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    sellerId: { type: Schema.Types.ObjectId, ref: "Seller", required: true },
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, trim: true, lowercase: true },
    unitPrice: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1 },
    image: { type: String, required: true },
  },
  { _id: false },
);

/** One Ethitrust org-escrow per distinct seller on the order. */
const orderSellerEscrowSchema = new Schema(
  {
    sellerId: { type: Schema.Types.ObjectId, ref: "Seller", required: true, index: true },
    escrowId: { type: String, required: true, trim: true },
    escrowStatus: { type: String, required: true, trim: true, default: "pending" },
    inviteeEmail: { type: String, required: true, trim: true, lowercase: true },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, required: true, trim: true },
    whoPaysFees: {
      type: String,
      enum: ["buyer", "seller", "split"],
      required: true,
      default: "split",
    },
    lastEventAt: { type: Date, default: null },
  },
  { _id: false, timestamps: true },
);

const orderSchema = new Schema(
  {
    orderNumber: { type: String, required: true, unique: true, trim: true, index: true },
    buyerUserId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    status: {
      type: String,
      enum: ORDER_STATUSES,
      required: true,
      default: "Processing" satisfies OrderStatusUi,
    },
    currency: { type: String, required: true, default: "ETB", trim: true },
    subtotal: { type: Number, required: true, min: 0 },
    shipping: { type: Number, required: true, min: 0 },
    total: { type: Number, required: true, min: 0 },
    shippingAddress: { type: shippingAddressSchema, required: true },
    paymentMethod: { type: String, enum: PAYMENT_METHODS, required: true },
    lineItems: { type: [orderLineSchema], required: true, default: [] },
    sellerIds: [{ type: Schema.Types.ObjectId, ref: "Seller", index: true }],
    /** Ethitrust escrows — one per seller. Empty if Ethitrust integration is disabled. */
    sellerEscrows: { type: [orderSellerEscrowSchema], default: [] },
  },
  { timestamps: true },
);

orderSchema.index({ buyerUserId: 1, createdAt: -1 });
orderSchema.index({ sellerIds: 1 });
// Fast webhook lookup. Sparse so legacy orders without escrows don't conflict.
orderSchema.index({ "sellerEscrows.escrowId": 1 }, { sparse: true });

export type OrderDocument = InferSchemaType<typeof orderSchema> & {
  _id: Types.ObjectId;
  buyerUserId: Types.ObjectId;
  lineItems: Array<InferSchemaType<typeof orderLineSchema>>;
};

export const Order = model("Order", orderSchema, "orders");
