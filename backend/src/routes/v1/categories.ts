import { Router } from "express";
import type { z } from "zod";

import { AppError } from "../../errors.js";
import { asyncHandler } from "../../middleware/asyncHandler.js";
import { validateQuery } from "../../middleware/validateQuery.js";
import { getCategoryDetail, listCategories } from "../../services/catalogCategoryService.js";
import { categorySlugDetailQuerySchema } from "../../validators/catalogQuerySchemas.js";

const categoriesRouter = Router();

categoriesRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    res.json(await listCategories());
  }),
);

categoriesRouter.get(
  "/:slug",
  validateQuery(categorySlugDetailQuerySchema),
  asyncHandler(async (req, res) => {
    const q = req.validatedQuery as z.infer<typeof categorySlugDetailQuerySchema>;

    const slug = decodeURIComponent(req.params.slug ?? "");
    const out = await getCategoryDetail(slug, q);

    if (!out.category) {
      throw new AppError(404, "NOT_FOUND", "Category not found");
    }

    res.json(out);
  }),
);

export default categoriesRouter;
