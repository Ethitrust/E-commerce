import type { NextFunction, Request, Response } from "express";

import { AppError } from "../errors.js";
import { verifyAccessToken } from "../lib/authTokens.js";
import type { Role } from "../models/User.js";

export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const raw = req.headers.authorization;
  const token = typeof raw === "string" && raw.startsWith("Bearer ") ? raw.slice(7).trim() : "";

  if (!token) {
    next(new AppError(401, "UNAUTHORIZED", "Missing Bearer token"));
    return;
  }

  try {
    const payload = verifyAccessToken(token);
    req.auth = {
      userId: payload.sub,
      role: payload.role as Role,
      ...(payload.sellerProfileId ? { sellerProfileId: payload.sellerProfileId } : {}),
    };
    next();
  } catch {
    next(new AppError(401, "UNAUTHORIZED", "Invalid or expired access token"));
  }
}
