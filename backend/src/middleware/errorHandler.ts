import type { NextFunction, Request, Response } from "express";

import { AppError } from "../errors.js";
import { env } from "../config/env.js";

/**
 * Maps uncaught errors to HTTP responses.
 * Shape: `{ "error": { "code", "message", "details?" } }` (BACKEND_SPEC §3).
 * Stack traces are never sent when NODE_ENV is production.
 */
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  let statusCode = 500;
  let code = "INTERNAL_ERROR";
  let message = env.NODE_ENV === "production" ? "Something went wrong" : "Internal Server Error";

  if (err instanceof AppError) {
    statusCode = err.statusCode;
    code = err.code;
    message = err.message;
  } else if (env.NODE_ENV !== "production" && err instanceof Error) {
    message = err.message;
  }

  const payload: { code: string; message: string; details?: unknown } = { code, message };

  if (err instanceof AppError && err.details !== undefined) {
    payload.details = err.details;
  } else if (env.NODE_ENV !== "production" && err instanceof Error && !(err instanceof AppError)) {
    payload.details = err.stack ?? err.name;
  }

  res.status(statusCode).json({ error: payload });
}
