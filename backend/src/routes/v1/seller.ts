import { Router } from "express";
import type { z } from "zod";

import { asyncHandler } from "../../middleware/asyncHandler.js";
import { authenticate } from "../../middleware/authenticate.js";
import { requireRole } from "../../middleware/requireRole.js";
import { requireSellerContext } from "../../middleware/requireSellerContext.js";
import { validateBody } from "../../middleware/validateBody.js";
import { AppError } from "../../errors.js";
import { resendOrgEscrowInvitation } from "../../lib/ethitrust.js";
import { Order } from "../../models/Order.js";
import { Types } from "mongoose";
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

/**
 * Resend the Ethitrust escrow invitation email for a single seller's escrow on
 * a single order. Authorises by checking that the order has a matching escrow
 * for the calling seller.
 */
sellerRouter.post(
  "/orders/:orderNumber/escrow/resend",
  asyncHandler(async (req, res) => {
    const sellerProfileId = req.auth!.sellerProfileId!;
    const orderNumber = req.params.orderNumber?.trim();
    if (!orderNumber || orderNumber.length > 120) {
      throw new AppError(400, "VALIDATION_ERROR", "Invalid order number");
    }

    const sellerOid = new Types.ObjectId(sellerProfileId);
    const order = await Order.findOne({
      orderNumber,
      "sellerEscrows.sellerId": sellerOid,
    })
      .lean()
      .exec();

    if (!order) {
      throw new AppError(404, "NOT_FOUND", "No escrow found for this seller on this order");
    }

    const escrows =
      (order.sellerEscrows as Array<{ sellerId: Types.ObjectId; escrowId: string }> | undefined) ??
      [];
    const match = escrows.find(
      (e) => (e.sellerId as Types.ObjectId).toHexString() === sellerOid.toHexString(),
    );

    if (!match) {
      throw new AppError(404, "NOT_FOUND", "No escrow found for this seller on this order");
    }

    await resendOrgEscrowInvitation(match.escrowId);

    res.status(200).json({ escrowId: match.escrowId, resent: true });
  }),
);

export default sellerRouter;
