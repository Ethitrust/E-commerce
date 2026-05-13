import type { RequestHandler } from "express";
import multer, { MulterError } from "multer";

import { AppError } from "../errors.js";

export const sellerListingImageMulter = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter(_req, file, cb) {
    const allowed = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
    if (!allowed.has(file.mimetype)) {
      cb(new Error("INVALID_IMAGE_TYPE"));
      return;
    }
    cb(null, true);
  },
});

export const sellerListingUploadSingle: RequestHandler = (req, res, next) => {
  sellerListingImageMulter.single("image")(req, res, (err: unknown) => {
    if (!err) {
      next();
      return;
    }
    if (err instanceof MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        next(new AppError(413, "FILE_TOO_LARGE", "Image must be 5 MB or smaller."));
      } else {
        next(new AppError(400, "UPLOAD_ERROR", err.message));
      }
      return;
    }
    if (err instanceof Error && err.message === "INVALID_IMAGE_TYPE") {
      next(new AppError(400, "INVALID_IMAGE_TYPE", "Use JPEG, PNG, WebP, or GIF."));
      return;
    }
    next(err);
  });
};
