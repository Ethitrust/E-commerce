import { v2 as cloudinary } from "cloudinary";

import { env } from "../config/env.js";
import { AppError } from "../errors.js";

const LISTING_FOLDER = "marketplace/listings";

let cloudinaryConfigured = false;

function ensureCloudinaryConfigured(): void {
  const cloud_name = env.CLOUDINARY_CLOUD_NAME?.trim();
  const api_key = env.CLOUDINARY_API_KEY?.trim();
  const api_secret = env.CLOUDINARY_API_SECRET?.trim();

  if (!cloud_name || !api_key || !api_secret) {
    throw new AppError(
      503,
      "CLOUDINARY_NOT_CONFIGURED",
      "Cloudinary credentials are missing. Add CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET to the server environment.",
    );
  }

  if (!cloudinaryConfigured) {
    cloudinary.config({ cloud_name, api_key, api_secret, secure: true });
    cloudinaryConfigured = true;
  }
}

/** Server-side listing image upload (API secret never sent to browsers). */
export async function uploadListingImageToCloudinary(payload: {
  buffer: Buffer;
  mimetype: string;
  originalName?: string;
}): Promise<{ url: string; publicId: string }> {
  ensureCloudinaryConfigured();

  return await new Promise((resolve, reject) => {
    const stem = safePublicIdStem(payload.originalName ?? "");
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: LISTING_FOLDER,
        resource_type: "image",
        ...(stem ? { public_id: stem } : { use_filename: true, unique_filename: true }),
        overwrite: false,
      },
      (error, result) => {
        if (error || !result?.secure_url) {
          reject(
            new AppError(
              502,
              "IMAGE_UPLOAD_FAILED",
              error instanceof Error ? error.message : "Cloudinary upload failed",
            ),
          );
          return;
        }
        resolve({
          url: result.secure_url,
          publicId: result.public_id,
        });
      },
    );

    stream.end(payload.buffer);
  });
}

function safePublicIdStem(originalName: string): string | undefined {
  const base =
    originalName.includes("/") || originalName.includes("\\")
      ? originalName.replace(/^.*[/\\]/u, "")
      : originalName;

  const withoutExt = base.replace(/\.[^.]+$/iu, "");
  const cleaned = withoutExt
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/gu, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/gu, "");

  if (!cleaned.length || cleaned.length > 120) {
    return undefined;
  }

  return cleaned;
}
