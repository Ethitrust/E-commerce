import { Router } from "express";
import type { z } from "zod";

import { asyncHandler } from "../../middleware/asyncHandler.js";
import { authenticate } from "../../middleware/authenticate.js";
import { requireRole } from "../../middleware/requireRole.js";
import { requireSellerContext } from "../../middleware/requireSellerContext.js";
import { validateBody } from "../../middleware/validateBody.js";
import { AppError } from "../../errors.js";
import { getSellerDashboardStats } from "../../services/sellerDashboardService.js";
import { listOrdersForSeller } from "../../services/sellerOrderService.js";
import {
  archiveSellerProduct,
  createSellerProduct,
  listSellerProducts,
  patchSellerProduct,
} from "../../services/sellerProductService.js";
import { uploadListingImageToCloudinary } from "../../services/cloudinaryListingUpload.js";
import { sellerListingUploadSingle } from "../../middleware/sellerListingImageUpload.js";
import { parseMeProductParam } from "../../validators/meSchemas.js";
import { sellerProductCreateSchema, sellerProductPatchSchema } from "../../validators/sellerProductSchemas.js";

const sellerRouter = Router();

sellerRouter.use(authenticate);
sellerRouter.use(requireRole("seller"));
sellerRouter.use(requireSellerContext);

sellerRouter.post(
  "/uploads/image",
  sellerListingUploadSingle,
  asyncHandler(async (req, res) => {
    const file = req.file;
    if (!file?.buffer?.length) {
      throw new AppError(400, "NO_FILE", 'Multipart body must include image field named "image".');
    }
    const uploaded = await uploadListingImageToCloudinary({
      buffer: file.buffer,
      mimetype: file.mimetype,
      originalName: file.originalname,
    });
    res.status(200).json({ url: uploaded.url });
  }),
);

sellerRouter.get(
  "/dashboard/stats",
  asyncHandler(async (req, res) => {
    const sellerProfileId = req.auth!.sellerProfileId!;
    const stats = await getSellerDashboardStats(sellerProfileId);
    res.status(200).json(stats);
  }),
);

sellerRouter.get(
  "/products",
  asyncHandler(async (req, res) => {
    const sellerProfileId = req.auth!.sellerProfileId!;
    const products = await listSellerProducts(sellerProfileId);
    res.status(200).json({ products });
  }),
);

sellerRouter.post(
  "/products",
  validateBody(sellerProductCreateSchema),
  asyncHandler(async (req, res) => {
    const sellerProfileId = req.auth!.sellerProfileId!;
    const body = req.body as z.infer<typeof sellerProductCreateSchema>;
    const product = await createSellerProduct(sellerProfileId, body);
    res.status(201).json({ product });
  }),
);

sellerRouter.patch(
  "/products/:productId",
  validateBody(sellerProductPatchSchema),
  asyncHandler(async (req, res) => {
    const productId = parseMeProductParam(req.params.productId);
    if (!productId) {
      throw new AppError(400, "VALIDATION_ERROR", "Invalid product id");
    }
    const sellerProfileId = req.auth!.sellerProfileId!;
    const body = req.body as z.infer<typeof sellerProductPatchSchema>;
    const product = await patchSellerProduct(sellerProfileId, productId, body);
    res.status(200).json({ product });
  }),
);

sellerRouter.delete(
  "/products/:productId",
  asyncHandler(async (req, res) => {
    const productId = parseMeProductParam(req.params.productId);
    if (!productId) {
      throw new AppError(400, "VALIDATION_ERROR", "Invalid product id");
    }
    const sellerProfileId = req.auth!.sellerProfileId!;
    await archiveSellerProduct(sellerProfileId, productId);
    res.status(204).send();
  }),
);

sellerRouter.get(
  "/orders",
  asyncHandler(async (req, res) => {
    const sellerProfileId = req.auth!.sellerProfileId!;
    const orders = await listOrdersForSeller(sellerProfileId);
    res.status(200).json({ orders });
  }),
);

export default sellerRouter;
