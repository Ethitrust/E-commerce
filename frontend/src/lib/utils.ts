import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Default marketplace currency. ETB matches the backend model defaults and the
 * Ethitrust escrow integration. Centralised here so swapping the marketplace
 * currency is a one-line change.
 */
export const DEFAULT_CURRENCY = "ETB";

/**
 * Format a number as a price string in the marketplace currency.
 *
 * Renders as `Br 1,234.56` (ETB shorthand) by default. Pass `currency` to
 * override for orders that were created in a different currency (legacy USD
 * orders, for example).
 */
export function formatPrice(amount: number, currency: string = DEFAULT_CURRENCY): string {
  const safe = Number.isFinite(amount) ? amount : 0;
  if (currency === "ETB") {
    return `Br ${safe.toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    })}`;
  }
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(safe);
  } catch {
    return `${currency} ${safe.toLocaleString()}`;
  }
}
