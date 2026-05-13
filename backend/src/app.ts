import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import pino from "pino";
import { pinoHttp } from "pino-http";

import { env } from "./config/env.js";
import { AppError } from "./errors.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { healthRouter } from "./routes/health.js";
import { apiV1Router } from "./routes/v1/index.js";

function parseCorsOrigins(raw: string): string[] | false {
  const list = raw
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);
  if (list.length === 0) {
    return false;
  }
  return list;
}

export function createApp() {
  const logger = pino({
    level: env.NODE_ENV === "production" ? "info" : "debug",
  });

  const app = express();
  app.use(pinoHttp({ logger }));

  app.use(express.json({ limit: "256kb" }));
  app.use(cookieParser());

  const corsOrigins = parseCorsOrigins(env.CORS_ORIGIN);
  app.use(
    cors({
      origin: corsOrigins,
      credentials: true,
    }),
  );

  app.use(healthRouter);

  app.use("/api/v1", apiV1Router);

  app.use((_req, _res, next) => {
    next(new AppError(404, "NOT_FOUND", "Route not found"));
  });

  app.use(errorHandler);

  return app;
}
