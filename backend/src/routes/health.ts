import { Router } from "express";

import { pingMongo } from "../db.js";

export const healthRouter = Router();

/**
 * Liveness / readiness probe.
 * Returns 200 with db: "up" when Mongo responds to ping; 503 when the driver or ping fails.
 */
healthRouter.get("/health", async (_req, res) => {
  const dbOk = await pingMongo();
  if (dbOk) {
    res.status(200).json({ status: "ok", db: "up" });
    return;
  }
  res.status(503).json({ status: "degraded", db: "down" });
});
