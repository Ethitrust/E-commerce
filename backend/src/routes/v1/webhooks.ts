/**
 * Inbound Ethitrust webhook receiver.
 *
 * Mounted at `POST /api/v1/webhooks/ethitrust`. The request is parsed as a raw
 * `Buffer` (instead of the global JSON parser) so that the HMAC signature in
 * `X-Signature` can be verified against the exact bytes Ethitrust sent.
 *
 * When `ETHITRUST_WEBHOOK_SECRET` is unset the signature check is skipped and
 * we trust the network (useful for local development with a tunnel). Either
 * way the body is shape-checked with Zod and an unknown `escrow_id` is a 204
 * — Ethitrust treats 2xx as "ack, don't retry".
 */
import { createHmac, timingSafeEqual } from "node:crypto";

import express, { Router } from "express";
import type { Request } from "express";
import { z } from "zod";

import { env } from "../../config/env.js";
import { asyncHandler } from "../../middleware/asyncHandler.js";
import { Order } from "../../models/Order.js";

const webhooksRouter = Router();

const webhookPayloadSchema = z
  .object({
    // Ethitrust's exact field naming may vary; be permissive and pick the first one present.
    escrow_id: z.string().min(1).optional(),
    id: z.string().min(1).optional(),
    event_type: z.string().min(1).optional(),
    type: z.string().min(1).optional(),
    status: z.string().min(1).optional(),
    escrow_status: z.string().min(1).optional(),
    occurred_at: z.string().optional(),
    timestamp: z.string().optional(),
  })
  .passthrough();

function verifySignature(raw: Buffer, signatureHeader: string | undefined): boolean {
  if (!env.ETHITRUST_WEBHOOK_SECRET) return true;
  if (!signatureHeader) return false;

  const expected = createHmac("sha256", env.ETHITRUST_WEBHOOK_SECRET).update(raw).digest("hex");

  // Some providers prefix with `sha256=` — strip if present.
  const provided = signatureHeader.replace(/^sha256=/i, "").trim();
  if (provided.length !== expected.length) return false;

  try {
    return timingSafeEqual(Buffer.from(provided, "hex"), Buffer.from(expected, "hex"));
  } catch {
    return false;
  }
}

webhooksRouter.post(
  "/ethitrust",
  // Raw buffer so we can both verify HMAC and JSON-parse ourselves.
  express.raw({ type: "*/*", limit: "256kb" }),
  asyncHandler(async (req: Request, res) => {
    const raw = req.body as Buffer;

    const sig = req.header("X-Signature") ?? req.header("x-signature") ?? undefined;
    if (!verifySignature(raw, sig)) {
      res.status(401).json({ error: { code: "INVALID_SIGNATURE", message: "Bad signature" } });
      return;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw.toString("utf8") || "{}");
    } catch {
      res
        .status(400)
        .json({ error: { code: "INVALID_JSON", message: "Body must be valid JSON" } });
      return;
    }

    const result = webhookPayloadSchema.safeParse(parsed);
    if (!result.success) {
      res
        .status(400)
        .json({ error: { code: "INVALID_PAYLOAD", message: "Webhook payload rejected" } });
      return;
    }

    const body = result.data;
    const escrowId = body.escrow_id ?? body.id;
    const status = body.status ?? body.escrow_status;

    if (!escrowId) {
      // Nothing to update — ack so Ethitrust doesn't retry forever.
      res.status(204).end();
      return;
    }

    const now = new Date();
    const update: Record<string, unknown> = {
      "sellerEscrows.$.lastEventAt": now,
    };
    if (status) {
      update["sellerEscrows.$.escrowStatus"] = status;
    }

    const result2 = await Order.updateOne(
      { "sellerEscrows.escrowId": escrowId },
      { $set: update },
    ).exec();

    if (result2.matchedCount === 0) {
      // Unknown escrow id — still ack so Ethitrust doesn't retry.
      req.log?.warn({ escrowId }, "Ethitrust webhook for unknown escrow id");
    }

    res.status(200).json({ received: true });
  }),
);

export default webhooksRouter;
