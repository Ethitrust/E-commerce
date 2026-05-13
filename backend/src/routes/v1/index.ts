import { Router } from "express";

import adminRouter from "./admin.js";
import { authRouter } from "./auth.js";
import categoriesRouter from "./categories.js";
import checkoutRouter from "./checkout.js";
import meRouter from "./me.js";
import productsRouter from "./products.js";
import sellerRouter from "./seller.js";
import sellersRouter from "./sellers.js";

export const apiV1Router = Router();

apiV1Router.use("/admin", adminRouter);
apiV1Router.use("/auth", authRouter);
apiV1Router.use("/categories", categoriesRouter);
apiV1Router.use("/checkout", checkoutRouter);
apiV1Router.use("/me", meRouter);
apiV1Router.use("/products", productsRouter);
apiV1Router.use("/seller", sellerRouter);
apiV1Router.use("/sellers", sellersRouter);