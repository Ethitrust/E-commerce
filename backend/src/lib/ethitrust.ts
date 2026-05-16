/**
 * Thin wrapper around `@ethitrust/sdk`.
 *
 * Construction is lazy: when `ETHITRUST_API_KEY` is unset, callers see a
 * disabled client and `isEthitrustEnabled()` returns `false`. Checkout treats
 * "disabled" as a clean no-op so that local development works without
 * network access to Ethitrust.
 *
 * Errors from the SDK are re-thrown as `AppError` instances with stable codes
 * so that the existing error middleware can serialise them consistently.
 */
import {
  EthitrustApiError,
  EthitrustAuthError,
  EthitrustClient,
  EthitrustNetworkError,
  EthitrustNotFoundError,
  EthitrustRateLimitError,
  EthitrustValidationError,
} from "@ethitrust/sdk";

import { env } from "../config/env.js";
import { AppError } from "../errors.js";

let cachedClient: EthitrustClient | null = null;

export function isEthitrustEnabled(): boolean {
  return Boolean(env.ETHITRUST_API_KEY);
}

export function getEthitrustClient(): EthitrustClient {
  if (!env.ETHITRUST_API_KEY) {
    throw new AppError(
      503,
      "ESCROW_UNAVAILABLE",
      "Ethitrust integration is not configured (set ETHITRUST_API_KEY)",
    );
  }
  if (!cachedClient) {
    cachedClient = new EthitrustClient({
      apiKey: env.ETHITRUST_API_KEY,
      baseUrl: env.ETHITRUST_BASE_URL,
      timeoutMs: 15_000,
      maxRetries: 2,
    });
  }
  return cachedClient;
}

/** Maps any SDK exception to an `AppError`. The original error is exposed via `details`. */
export function wrapEthitrustError(err: unknown, fallbackMessage: string): AppError {
  if (err instanceof AppError) return err;

  if (err instanceof EthitrustValidationError) {
    return new AppError(
      422,
      "ESCROW_VALIDATION",
      err.message || "Ethitrust rejected the escrow payload",
      { errors: err.errors },
    );
  }
  if (err instanceof EthitrustAuthError) {
    return new AppError(
      502,
      "ESCROW_AUTH",
      "Ethitrust rejected the API key — check ETHITRUST_API_KEY",
    );
  }
  if (err instanceof EthitrustRateLimitError) {
    return new AppError(503, "ESCROW_RATE_LIMITED", "Ethitrust is rate-limiting requests", {
      retryAfter: err.retryAfter,
    });
  }
  if (err instanceof EthitrustNotFoundError) {
    return new AppError(404, "ESCROW_NOT_FOUND", err.message || "Escrow not found");
  }
  if (err instanceof EthitrustNetworkError) {
    return new AppError(503, "ESCROW_NETWORK", "Could not reach Ethitrust", {
      cause: String(err.message ?? err),
    });
  }
  if (err instanceof EthitrustApiError) {
    return new AppError(502, "ESCROW_API", err.message || fallbackMessage, {
      status: err.status,
      body: err.body,
    });
  }

  return new AppError(500, "ESCROW_UNKNOWN", fallbackMessage, {
    cause: String((err as Error)?.message ?? err),
  });
}

export type WhoPaysFees = "buyer" | "seller" | "split";

export type CreateSellerEscrowInput = {
  inviteeEmail: string;
  title: string;
  amount: number;
  currency: string;
  whoPaysFees: WhoPaysFees;
  idempotencyKey: string;
};

export type CreatedSellerEscrow = {
  escrowId: string;
  escrowStatus: string;
};

/**
 * Creates a single org-escrow on behalf of a seller's portion of an order.
 *
 * The buyer is the invitee (they will fund the escrow). The amount is the
 * seller's line-item subtotal in the order's currency. Idempotency keys are
 * derived from `<orderNumber>:<sellerId>` so that any safe retry collapses.
 */
export async function createOrgEscrow(input: CreateSellerEscrowInput): Promise<CreatedSellerEscrow> {
  const client = getEthitrustClient();
  try {
    const escrow = await client.orgEscrows.create(
      {
        invitee_email: input.inviteeEmail,
        title: input.title,
        amount: input.amount,
        currency: input.currency,
        escrow_type: "onetime",
        who_pays_fees: input.whoPaysFees,
      },
      { idempotencyKey: input.idempotencyKey },
    );

    // SDK return shape: { escrow_id, status, ... } — be defensive about field names.
    const raw = escrow as unknown as {
      escrow_id?: string;
      id?: string;
      status?: string;
      escrow_status?: string;
    };

    const escrowId = raw.escrow_id ?? raw.id;
    if (!escrowId) {
      throw new AppError(
        502,
        "ESCROW_MALFORMED",
        "Ethitrust did not return an escrow id",
        escrow,
      );
    }

    return {
      escrowId,
      escrowStatus: raw.status ?? raw.escrow_status ?? "pending",
    };
  } catch (err) {
    throw wrapEthitrustError(err, "Failed to create Ethitrust escrow");
  }
}

/** Resend the invitation email for an existing escrow. */
export async function resendOrgEscrowInvitation(escrowId: string): Promise<void> {
  const client = getEthitrustClient();
  try {
    await client.orgEscrows.resendInvitation(escrowId);
  } catch (err) {
    throw wrapEthitrustError(err, "Failed to resend Ethitrust invitation");
  }
}
