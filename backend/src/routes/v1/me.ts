import { Router } from "express";
import type { z } from "zod";

import { asyncHandler } from "../../middleware/asyncHandler.js";
import { authenticate } from "../../middleware/authenticate.js";
import { validateBody } from "../../middleware/validateBody.js";
import { AppError } from "../../errors.js";
import { getCartForUser, replaceCartForUser } from "../../services/buyerCartService.js";
import { getOrderDetailForBuyer, listOrdersForBuyer } from "../../services/checkoutOrderService.js";
import { recordRecentForUser, getRecentIdsForUser } from "../../services/buyerRecentService.js";
import { getWishlistForUser, setWishlistItem } from "../../services/buyerWishlistService.js";
import {
  meCartPutSchema,
  meWishlistPutSchema,
  parseMeProductParam,
} from "../../validators/meSchemas.js";

const meRouter = Router();

meRouter.use(authenticate);

meRouter.get(
  "/cart",
  asyncHandler(async (req, res) => {
    const items = await getCartForUser(req.auth!.userId);
    res.status(200).json({ items });
  }),
);

meRouter.put(
  "/cart",
  validateBody(meCartPutSchema),
  asyncHandler(async (req, res) => {
    const body = req.body as z.infer<typeof meCartPutSchema>;
    const items = await replaceCartForUser(req.auth!.userId, body);
    res.status(200).json({ items });
  }),
);

meRouter.get(
  "/wishlist",
  asyncHandler(async (req, res) => {
    const products = await getWishlistForUser(req.auth!.userId);
    res.status(200).json({ products });
  }),
);

meRouter.put(
  "/wishlist/:productId",
  validateBody(meWishlistPutSchema),
  asyncHandler(async (req, res) => {
    const productId = parseMeProductParam(req.params.productId);
    if (!productId) {
      throw new AppError(400, "VALIDATION_ERROR", "Invalid product id");
    }
    const body = req.body as z.infer<typeof meWishlistPutSchema>;
    await setWishlistItem(req.auth!.userId, productId, body.add);
    res.status(204).send();
  }),
);

meRouter.get(
  "/recent",
  asyncHandler(async (req, res) => {
    const productIds = await getRecentIdsForUser(req.auth!.userId);
    res.status(200).json({ productIds });
  }),
);

meRouter.post(
  "/recent/:productId",
  asyncHandler(async (req, res) => {
    const productId = parseMeProductParam(req.params.productId);
    if (!productId) {
      throw new AppError(400, "VALIDATION_ERROR", "Invalid product id");
    }
    await recordRecentForUser(req.auth!.userId, productId);
    res.status(204).send();
  }),
);

meRouter.get(
  "/orders",
  asyncHandler(async (req, res) => {
    const orders = await listOrdersForBuyer(req.auth!.userId);
    res.status(200).json({ orders });
  }),
);

meRouter.get(
  "/orders/:orderNumber",
  asyncHandler(async (req, res) => {
    const orderNumber = req.params.orderNumber?.trim();
    if (!orderNumber || orderNumber.length > 120) {
      throw new AppError(400, "VALIDATION_ERROR", "Invalid order number");
    }

    const order = await getOrderDetailForBuyer(req.auth!.userId, orderNumber);
    if (!order) {
      throw new AppError(404, "NOT_FOUND", "Order not found");
    }
    res.status(200).json({ order });
  }),
);

export default meRouter;
