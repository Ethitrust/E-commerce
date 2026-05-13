import type { z } from "zod";

import { Router } from "express";

import { AppError } from "../../errors.js";
import { asyncHandler } from "../../middleware/asyncHandler.js";
import { validateQuery } from "../../middleware/validateQuery.js";
import { getSellerApprovedByHandle, listApprovedSellers } from "../../services/catalogSellerService.js";
import { sellerDetailQuerySchema, sellersListQuerySchema } from "../../validators/catalogQuerySchemas.js";

const sellersRouter = Router();

sellersRouter.get(
  "/",
  validateQuery(sellersListQuerySchema),
  asyncHandler(async (req, res) => {
    const q = req.validatedQuery as z.infer<typeof sellersListQuerySchema>;
    res.json(await listApprovedSellers(q));
  }),
);

sellersRouter.get(
  "/:handle",
  validateQuery(sellerDetailQuerySchema),
  asyncHandler(async (req, res) => {
    const pq = req.validatedQuery as z.infer<typeof sellerDetailQuerySchema>;

    const handle = decodeURIComponent(req.params.handle ?? "");
    const out = await getSellerApprovedByHandle(handle, pq);

    if (!out.seller) {
      throw new AppError(404, "NOT_FOUND", "Seller not found");
    }

    res.json(out);
  }),
);

export default sellersRouter;
