import { Router } from "express";
import type { z } from "zod";

import { asyncHandler } from "../../middleware/asyncHandler.js";
import { authenticate } from "../../middleware/authenticate.js";
import { validateBody } from "../../middleware/validateBody.js";
import { checkoutFromPersistedCart } from "../../services/checkoutOrderService.js";
import { checkoutBodySchema } from "../../validators/checkoutSchemas.js";

const checkoutRouter = Router();

checkoutRouter.use(authenticate);

checkoutRouter.post(
  "/",
  validateBody(checkoutBodySchema),
  asyncHandler(async (req, res) => {
    const body = req.body as z.infer<typeof checkoutBodySchema>;
    const order = await checkoutFromPersistedCart(req.auth!.userId, body);
    res.status(201).json({ order });
  }),
);

export default checkoutRouter;
