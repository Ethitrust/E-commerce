import { fetchJsonAuthed } from "@/lib/api/client";
import type { OrderShippingAddressDTO, OrderSummaryDTO } from "@/lib/api/orders";

export type CheckoutPayload = {
  shippingAddress: OrderShippingAddressDTO;
  paymentMethod: "card" | "paypal" | "apple_pay";
};

export async function postCheckout(payload: CheckoutPayload): Promise<{ order: OrderSummaryDTO }> {
  return fetchJsonAuthed<{ order: OrderSummaryDTO }>("/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}
