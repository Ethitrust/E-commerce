import { randomBytes } from "node:crypto";

import type { ClientSession } from "mongoose";
import mongoose from "mongoose";
import type { Response } from "express";
import type { z } from "zod";

import { AppError } from "../errors.js";
import {
  consumeAndRotateRefresh,
  createRefreshCredentials,
  revokeRefreshToken,
  signAccessToken,
  toAuthUserJson,
} from "../lib/authTokens.js";
import { attachRefreshCookie, clearRefreshCookie } from "../lib/cookieAuth.js";
import { hashPassword, verifyPassword } from "../lib/passwords.js";
import { Seller } from "../models/Seller.js";
import { User } from "../models/User.js";
import { registerSchema } from "../validators/authSchemas.js";

function isDuplicateKey(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code: number }).code === 11000
  );
}

function duplicateIndexField(error: unknown): string | undefined {
  if (typeof error !== "object" || error === null) {
    return undefined;
  }
  const keyValue = "keyValue" in error ? (error as { keyValue?: Record<string, unknown> }).keyValue : undefined;
  if (keyValue && typeof keyValue === "object") {
    return Object.keys(keyValue)[0];
  }
  return undefined;
}

function slugBase(name: string, email: string): string {
  const fromName = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (fromName.length >= 2) {
    return fromName;
  }
  const localPart = email.split("@")[0] ?? "";
  const fallback = localPart
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);
  return fallback.length >= 2 ? fallback : "seller";
}

async function allocateSellerHandle(base: string, session: ClientSession): Promise<string> {
  let candidate = base.toLowerCase().trim().slice(0, 64) || "shop";
  for (let i = 0; i < 12; i++) {
    const exists = await Seller.findOne({ handle: candidate }).session(session).lean();
    if (!exists) {
      return candidate;
    }
    const suffix = randomBytes(2).toString("hex");
    candidate = `${candidate.replace(/-+$/u, "")}-${suffix}`.slice(0, 64);
  }
  throw new AppError(500, "HANDLE_ALLOCATION_FAILED", "Could not allocate a unique seller handle");
}

export async function registerUser(
  res: Response,
  body: z.infer<typeof registerSchema>,
): Promise<{ user: ReturnType<typeof toAuthUserJson>; accessToken: string }> {
  const email = body.email.toLowerCase().trim();
  const passwordHash = await hashPassword(body.password);
  const name = body.name.trim();

  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const inserted = await User.create(
        [
          {
            email,
            passwordHash,
            name,
            avatar: "",
            role: "buyer",
          },
        ],
        { session },
      );
      const user = inserted[0];
      if (!user) {
        throw new Error("USER_CREATE_EMPTY");
      }

      if (body.becomeSeller) {
        const baseHandle = body.sellerHandle ?? slugBase(name, email);
        const handle = await allocateSellerHandle(baseHandle, session);
        const sellers = await Seller.create(
          [
            {
              ownerUserId: user._id,
              name,
              handle,
              status: "pending",
            },
          ],
          { session },
        );
        const seller = sellers[0];
        if (!seller) {
          throw new Error("SELLER_CREATE_EMPTY");
        }
        user.role = "seller";
        user.sellerProfileId = seller._id;
        await user.save({ session });
      }
    });
  } catch (err) {
    if (isDuplicateKey(err)) {
      const field = duplicateIndexField(err);
      if (field === "handle") {
        throw new AppError(409, "HANDLE_IN_USE", "Seller handle already taken");
      }
      throw new AppError(409, "EMAIL_IN_USE", "Email already registered");
    }
    throw err;
  } finally {
    await session.endSession();
  }

  const freshUser = await User.findOne({ email });
  if (!freshUser) {
    throw new AppError(500, "REGISTRATION_INCOMPLETE", "User was not persisted");
  }

  const accessToken = signAccessToken(freshUser);
  const refresh = await createRefreshCredentials(freshUser._id);
  attachRefreshCookie(res, refresh.refreshToken, refresh.maxAgeMs);

  return { user: toAuthUserJson(freshUser), accessToken };
}

export async function loginUser(
  res: Response,
  emailRaw: string,
  password: string,
): Promise<{ user: ReturnType<typeof toAuthUserJson>; accessToken: string }> {
  const email = emailRaw.toLowerCase().trim();
  const user = await User.findOne({ email }).select("+passwordHash");

  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    throw new AppError(401, "INVALID_CREDENTIALS", "Invalid email or password");
  }

  const accessToken = signAccessToken(user);
  const refresh = await createRefreshCredentials(user._id);
  attachRefreshCookie(res, refresh.refreshToken, refresh.maxAgeMs);

  return { user: toAuthUserJson(user), accessToken };
}

export async function refreshAccess(res: Response, refreshToken: string | undefined) {
  if (!refreshToken || typeof refreshToken !== "string") {
    clearRefreshCookie(res);
    throw new AppError(401, "REFRESH_MISSING", "Refresh session missing");
  }

  let rotated;
  try {
    rotated = await consumeAndRotateRefresh(refreshToken);
  } catch {
    clearRefreshCookie(res);
    throw new AppError(401, "REFRESH_INVALID", "Invalid or expired refresh session");
  }

  const user = await User.findById(rotated.userId);
  if (!user) {
    clearRefreshCookie(res);
    throw new AppError(401, "REFRESH_INVALID", "Invalid or expired refresh session");
  }

  attachRefreshCookie(res, rotated.newRefreshToken, rotated.refreshMaxAgeMs);
  return { accessToken: signAccessToken(user) };
}

export async function logoutUser(res: Response, refreshToken: string | undefined): Promise<void> {
  if (refreshToken && typeof refreshToken === "string") {
    await revokeRefreshToken(refreshToken);
  }
  clearRefreshCookie(res);
}

export async function getAuthUserById(userId: string) {
  const user = await User.findById(userId);
  if (!user) {
    throw new AppError(404, "NOT_FOUND", "User not found");
  }
  return toAuthUserJson(user);
}
