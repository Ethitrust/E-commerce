import type { RequestHandler } from "express";

import { AppError } from "../errors.js";

/** After `authenticate` + `requireRole("seller")`, require JWT `sellerProfileId`. */
export const requireSellerContext: RequestHandler = (req, _res, next) => {
  if (!req.auth) {
    next(new AppError(401, "UNAUTHORIZED", "Authentication required"));
    return;
  }
  const sid = req.auth.sellerProfileId?.trim();
  if (!sid) {
    next(new AppError(403, "SELLER_PROFILE_REQUIRED", "Seller shop profile not linked"));
    return;
  }
  next();
};
