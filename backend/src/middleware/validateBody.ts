import type { NextFunction, Request, RequestHandler, Response } from "express";
import type { ZodSchema } from "zod";

import { AppError } from "../errors.js";

export function validateBody<Schema extends ZodSchema>(schema: Schema): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      next(new AppError(400, "VALIDATION_ERROR", "Invalid request body", result.error.flatten()));
      return;
    }
    req.body = result.data as Request["body"];
    next();
  };
}
