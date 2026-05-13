import { randomUUID } from "node:crypto";

import jwt, { type JwtPayload, type SignOptions } from "jsonwebtoken";

import { env } from "../config/env.js";
import { RefreshSession } from "../models/RefreshSession.js";
import type { UserDocument } from "../models/User.js";
import type { Types } from "mongoose";

interface AccessJwtPayload extends JwtPayload {
  sub: string;
  role: UserDocument["role"];
  sellerProfileId?: string;
  typ: "access";
}

interface RefreshJwtPayload extends JwtPayload {
  typ: "refresh";
}

/** Used for httpOnly cookie `maxAge` (derived from JWT `exp`). */
export function millisUntilJwtExpiryIssued(token: string): number {
  const decoded = jwt.decode(token) as JwtPayload | null;
  if (!decoded?.exp) {
    return 0;
  }
  const msRemaining = decoded.exp * 1000 - Date.now();
  return Math.max(msRemaining, 0);
}

const signAccessOpts = (): SignOptions => ({
  expiresIn: env.JWT_ACCESS_EXPIRES as SignOptions["expiresIn"],
  algorithm: "HS256",
});

const signRefreshOpts = (jwtid: string): SignOptions => ({
  expiresIn: env.JWT_REFRESH_EXPIRES as SignOptions["expiresIn"],
  jwtid,
});

export function signAccessToken(user: UserDocument): string {
  const payload = {
    sub: user._id.toString(),
    role: user.role,
    ...(user.sellerProfileId
      ? { sellerProfileId: (user.sellerProfileId as Types.ObjectId).toString() }
      : {}),
    typ: "access" as const,
  };

  return jwt.sign(payload, env.JWT_ACCESS_SECRET, signAccessOpts());
}

/** Creates a persisted refresh JWT and DB row so logout can revoke. */
export async function createRefreshCredentials(userId: Types.ObjectId | string): Promise<{
  refreshToken: string;
  maxAgeMs: number;
}> {
  const jti = randomUUID();
  const refreshToken = jwt.sign(
    { typ: "refresh" as const },
    env.JWT_REFRESH_SECRET,
    signRefreshOpts(jti),
  );

  const decoded = jwt.decode(refreshToken) as JwtPayload | null;
  if (!decoded?.exp) {
    throw new Error("Refresh token missing exp");
  }

  await RefreshSession.create({
    userId,
    jti,
    expiresAt: new Date(decoded.exp * 1000),
  });

  return { refreshToken, maxAgeMs: millisUntilJwtExpiryIssued(refreshToken) };
}

export function verifyAccessToken(token: string): AccessJwtPayload {
  const payload = jwt.verify(token, env.JWT_ACCESS_SECRET, {
    algorithms: ["HS256"],
  }) as AccessJwtPayload;

  if (payload.typ !== "access" || typeof payload.sub !== "string" || typeof payload.role !== "string") {
    throw new Error("Invalid access payload");
  }
  return payload;
}

export async function consumeAndRotateRefresh(
  refreshToken: string,
): Promise<{ userId: string; newRefreshToken: string; refreshMaxAgeMs: number }> {
  let payload: RefreshJwtPayload;
  try {
    payload = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET, {
      algorithms: ["HS256"],
    }) as RefreshJwtPayload;
  } catch {
    throw new Error("REFRESH_INVALID");
  }

  if (payload.typ !== "refresh") {
    throw new Error("REFRESH_INVALID");
  }

  const jti = typeof payload.jti === "string" ? payload.jti : undefined;
  if (!jti) {
    throw new Error("REFRESH_INVALID");
  }

  const existing = await RefreshSession.findOneAndDelete({ jti });
  if (!existing) {
    throw new Error("REFRESH_REVOKED");
  }

  const next = await createRefreshCredentials(existing.userId);
  return {
    userId: existing.userId.toString(),
    newRefreshToken: next.refreshToken,
    refreshMaxAgeMs: next.maxAgeMs,
  };
}

/** Removes server-side session if JWT decodes successfully; clears cookie separately. */
export async function revokeRefreshToken(refreshToken: string): Promise<void> {
  try {
    const payload = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET, {
      algorithms: ["HS256"],
    }) as RefreshJwtPayload;
    const jti = typeof payload.jti === "string" ? payload.jti : undefined;
    if (jti) {
      await RefreshSession.deleteOne({ jti });
    }
  } catch {
    // Treat as already logged out
  }
}

export function toAuthUserJson(user: UserDocument) {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
    avatar: user.avatar,
  };
}
