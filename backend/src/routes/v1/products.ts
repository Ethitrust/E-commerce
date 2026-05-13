import type { z } from "zod";

import { Router } from "express";

import { AppError } from "../../errors.js";
import { asyncHandler } from "../../middleware/asyncHandler.js";
import { validateQuery } from "../../middleware/validateQuery.js";
import { getProductPublishedBySlug, listProducts } from "../../services/catalogProductService.js";
import { productsListQuerySchema } from "../../validators/catalogQuerySchemas.js";

const productsRouter = Router();

productsRouter.get(
  "/",
  validateQuery(productsListQuerySchema),
  asyncHandler(async (req, res) => {
    const q = req.validatedQuery as z.infer<typeof productsListQuerySchema>;
    res.json(await listProducts(q));
  }),
);

productsRouter.get(
  "/:slug",
  asyncHandler(async (req, res) => {
    const slug = decodeURIComponent(req.params.slug ?? "");
    const product = await getProductPublishedBySlug(slug);
    if (!product) {
      throw new AppError(404, "NOT_FOUND", "Product not found");
    }
    res.json(product);
  }),
);

export default productsRouter;
