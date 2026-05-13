import type { z } from "zod";

import type { Role } from "../models/User.js";
import type {
  categorySlugDetailQuerySchema,
  productsListQuerySchema,
  sellerDetailQuerySchema,
  sellersListQuerySchema,
} from "../validators/catalogQuerySchemas.js";

declare global {
  namespace Express {
    interface AuthContext {
      userId: string;
      role: Role;
      sellerProfileId?: string;
    }
    interface Request {
      auth?: AuthContext;
      validatedQuery?:
        | z.infer<typeof categorySlugDetailQuerySchema>
        | z.infer<typeof productsListQuerySchema>
        | z.infer<typeof sellersListQuerySchema>
        | z.infer<typeof sellerDetailQuerySchema>;
    }
  }
}

export {};
