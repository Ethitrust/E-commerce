import { Router } from "express";
import type { z } from "zod";

import { asyncHandler } from "../../middleware/asyncHandler.js";
import { authenticate } from "../../middleware/authenticate.js";
import { requireRole } from "../../middleware/requireRole.js";
import { validateBody } from "../../middleware/validateBody.js";
import { validateQuery } from "../../middleware/validateQuery.js";
import { AppError } from "../../errors.js";
import { getAdminDashboardStats } from "../../services/adminDashboardService.js";
import { listProductsForModeration, patchProductModeration } from "../../services/adminProductService.js";
import { listSellersForAdmin, patchSellerByAdmin } from "../../services/adminSellerService.js";
import {
  adminProductPatchSchema,
  adminProductsListQuerySchema,
  adminSellerPatchSchema,
  adminSellersListQuerySchema,
} from "../../validators/adminSchemas.js";
import { parseMeProductParam } from "../../validators/meSchemas.js";

const adminRouter = Router();

adminRouter.use(authenticate);
adminRouter.use(requireRole("admin"));

adminRouter.get(
  "/dashboard/stats",
  asyncHandler(async (_req, res) => {
    const stats = await getAdminDashboardStats();
    res.status(200).json(stats);
  }),
);

adminRouter.get(
  "/sellers",
  validateQuery(adminSellersListQuerySchema),
  asyncHandler(async (req, res) => {
    const q = req.validatedQuery as z.infer<typeof adminSellersListQuerySchema>;
    const out = await listSellersForAdmin(q);
    res.status(200).json(out);
  }),
);

adminRouter.patch(
  "/sellers/:sellerId",
  validateBody(adminSellerPatchSchema),
  asyncHandler(async (req, res) => {
    const id = parseMeProductParam(req.params.sellerId);
    if (!id) {
      throw new AppError(400, "VALIDATION_ERROR", "Invalid seller id");
    }
    const body = req.body as z.infer<typeof adminSellerPatchSchema>;
    const seller = await patchSellerByAdmin(id, body);
    res.status(200).json({ seller });
  }),
);

adminRouter.get(
  "/products",
  validateQuery(adminProductsListQuerySchema),
  asyncHandler(async (req, res) => {
    const q = req.validatedQuery as z.infer<typeof adminProductsListQuerySchema>;
    const out = await listProductsForModeration(q);
    res.status(200).json(out);
  }),
);

adminRouter.patch(
  "/products/:productId",
  validateBody(adminProductPatchSchema),
  asyncHandler(async (req, res) => {
    const id = parseMeProductParam(req.params.productId);
    if (!id) {
      throw new AppError(400, "VALIDATION_ERROR", "Invalid product id");
    }
    const body = req.body as z.infer<typeof adminProductPatchSchema>;
    const product = await patchProductModeration(id, body);
    res.status(200).json({ product });
  }),
);

export default adminRouter;
