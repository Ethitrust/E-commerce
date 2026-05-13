import { fetchJsonAuthed } from "@/lib/api/client";

export type OrderLineItemDTO = {
  productId: string;
  sellerId: string;
  title: string;
  slug: string;
  unitPrice: number;
  quantity: number;
  image: string;
};

export type OrderShippingAddressDTO = {
  name: string;
  email: string;
  line1: string;
  city: string;
  postalCode: string;
  country: string;
};

export type OrderSummaryDTO = {
  orderNumber: string;
  status: string;
  currency: string;
  subtotal: number;
  shipping: number;
  total: number;
  paymentMethod: string;
  shippingAddress: OrderShippingAddressDTO;
  lineItems: OrderLineItemDTO[];
  createdAt: string;
  updatedAt: string;
};

export async function fetchMyOrders(): Promise<{ orders: OrderSummaryDTO[] }> {
  return fetchJsonAuthed<{ orders: OrderSummaryDTO[] }>("/me/orders");
}

export async function fetchMyOrder(orderNumber: string): Promise<{ order: OrderSummaryDTO }> {
  return fetchJsonAuthed<{ order: OrderSummaryDTO }>(
    `/me/orders/${encodeURIComponent(orderNumber)}`,
  );
}
