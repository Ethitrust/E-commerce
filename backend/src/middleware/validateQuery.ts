import type { NextFunction, Request, RequestHandler, Response } from "express";
import type { ZodSchema } from "zod";

import { AppError } from "../errors.js";

export function validateQuery<Schema extends ZodSchema>(schema: Schema): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      next(new AppError(400, "VALIDATION_ERROR", "Invalid query parameters", result.error.flatten()));
      return;
    }
    req.validatedQuery = result.data;
    next();
  };
}
