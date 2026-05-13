import { Router } from "express";

import { env } from "../../config/env.js";
import { authenticate } from "../../middleware/authenticate.js";
import { asyncHandler } from "../../middleware/asyncHandler.js";
import { validateBody } from "../../middleware/validateBody.js";
import {
  getAuthUserById,
  loginUser,
  logoutUser,
  refreshAccess,
  registerUser,
} from "../../services/authService.js";
import { loginSchema, registerSchema } from "../../validators/authSchemas.js";

export const authRouter = Router();

authRouter.post(
  "/register",
  validateBody(registerSchema),
  asyncHandler(async (req, res) => {
    const out = await registerUser(res, req.body);
    res.status(201).json(out);
  }),
);

authRouter.post(
  "/login",
  validateBody(loginSchema),
  asyncHandler(async (req, res) => {
    const out = await loginUser(res, req.body.email, req.body.password);
    res.status(200).json(out);
  }),
);

authRouter.post(
  "/refresh",
  asyncHandler(async (req, res) => {
    const refreshToken = req.cookies[env.REFRESH_COOKIE_NAME];
    const out = await refreshAccess(res, refreshToken);
    res.status(200).json(out);
  }),
);

authRouter.post(
  "/logout",
  asyncHandler(async (req, res) => {
    await logoutUser(res, req.cookies[env.REFRESH_COOKIE_NAME]);
    res.status(200).json({ ok: true });
  }),
);

authRouter.get(
  "/me",
  authenticate,
  asyncHandler(async (req, res) => {
    const user = await getAuthUserById(req.auth!.userId);
    res.status(200).json(user);
  }),
);
