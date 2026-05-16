# Backend specification for Nexus marketplace (frontend)

This document describes what a **Node.js + MongoDB** API must provide so the current frontend can move off `mock-data` and client-only auth/cart. Shapes below align with `src/lib/mock-data.ts` and `src/store/use-app-store.ts`.

---

## 1. Suggested server stack (Node.js)

| Layer | Recommendation | Notes |
|-------|----------------|-------|
| Runtime | Node 20+ LTS | Matches typical Vercel/Atlas deployments. |
| Framework | **Express** or **Fastify** | Pick one; Fastify tends to have faster JSON validation. |
| ODM | **Mongoose** | Schema validation, indexes, middleware hooks. |
| Validation | **Zod** (shared types optional) or Fastify schema | Mirror frontend `zod` usage where helpful. |
| Auth | **JWT** access + **httpOnly** refresh cookie (or short-lived access only for SPA) | Passwords with **bcrypt** (or **argon2**). |
| Env | `dotenv` + strict validation | Never commit secrets. |

CORS: allow your frontend origin(s). For TanStack Start on Cloudflare, confirm how the browser calls the API (same domain reverse proxy vs separate `api.` host).

---

## 2. Database schema / models (MongoDB collections)

Use **ObjectId** for primary keys in the database; expose **`id` as string** in JSON for the frontend (map `_id` → `id`). Slugs and handles must be **unique** where noted.

### 2.1 `users`

Represents a login account. Roles: `buyer` | `seller` | `admin` (see `Role` in mock-data).

| Field | Type | Notes |
|-------|------|--------|
| `_id` | ObjectId | |
| `email` | string | Unique, normalized lowercase. |
| `passwordHash` | string | Never returned in API responses. |
| `name` | string | Display name. |
| `avatar` | string | URL (or later: blob/storage key). |
| `role` | string enum | `buyer`, `seller`, `admin`. |
| `sellerProfileId` | ObjectId ref `sellers` | Optional; set when user owns a shop. |
| `createdAt`, `updatedAt` | Date | |

**Indexes:** unique `email`; optional `sellerProfileId`.

### 2.2 `sellers`

Public shop profile (maps to `Seller`).

| Field | Type | Notes |
|-------|------|--------|
| `_id` | ObjectId | Use as `id` in API; mock uses `s1` style — seed can use fixed strings only in fixtures, production uses ObjectIds. |
| `ownerUserId` | ObjectId ref `users` | The seller account. |
| `name` | string | |
| `handle` | string | Unique slug for `/sellers/$handle`. |
| `avatar`, `banner` | string | URLs. |
| `bio` | string | |
| `location` | string | |
| `verified` | boolean | Admin can toggle. |
| `joinedYear` | string or number | Mock uses `"2019"`; could store `joinedAt` Date instead and format in UI. |
| `stats` | embedded | `rating`, `reviews`, `sales`, … — denormalized for speed; update via jobs or aggregates. |
| `status` | string | e.g. `pending`, `approved`, `suspended` — powers admin “pending approvals”. |

**Indexes:** unique `handle`; `ownerUserId`; `status`.

### 2.3 `categories`

Maps to `Category` (`slug`, `name`, `icon`, `count`).

| Field | Type | Notes |
|-------|------|--------|
| `slug` | string | Unique; used in routes `/categories/$slug`. |
| `name` | string | |
| `icon` | string | Lucide icon name from frontend (e.g. `Smartphone`). |
| `productCount` | number | Denormalized; maintain on product create/delete or batch recompute. |

**Indexes:** unique `slug`.

### 2.4 `products`

Maps to `Product`.

| Field | Type | Notes |
|-------|------|--------|
| `title` | string | |
| `slug` | string | Unique; used in `/products/$slug`. |
| `price` | number | Minor units optional later (cents). |
| `originalPrice` | number? | |
| `currency` | string | e.g. `USD`. |
| `rating` | number | Denormalized aggregate. |
| `reviews` | number | Count of reviews. |
| `sold` | number | |
| `stock` | number | |
| `image` | string | Primary image URL. |
| `gallery` | string[] | |
| `categorySlug` | string | Ref to `categories.slug`. |
| `sellerId` | ObjectId ref `sellers` | |
| `shipping` | string | Display string or derive from rules later. |
| `badge` | string enum? | `new`, `hot`, `deal`, `bid`. |
| `bidCount`, `bidEndsAt` | number?, string/Date? | Auction fields; mock uses display string for timer. |
| `description` | string | |
| `specs` | `{ label, value }[]` | |
| `tags` | string[] | |
| `moderationStatus` | string | `draft`, `pending`, `published`, `rejected` — admin “Approve / Flag”. |

**Indexes:** unique `slug`; `sellerId` + `moderationStatus`; `categorySlug`; text index on `title` + `description` for search (or Atlas Search later).

### 2.5 `orders`

Buyer checkout (today checkout is UI-only). Suggested model:

| Field | Type | Notes |
|-------|------|--------|
| `orderNumber` | string | Human-readable e.g. `NX-100482`; unique. |
| `buyerUserId` | ObjectId ref `users` | |
| `status` | string | Align with UI: `Processing`, `Shipped`, `Delivered`, etc. |
| `currency` | string | |
| `subtotal`, `shipping`, `total` | number | |
| `shippingAddress` | embedded | name, email, line1, city, postalCode, country… |
| `paymentMethod` | string | `card`, `paypal`, `apple_pay` — no PCI data stored in v1. |
| `lineItems` | array | `productId`, `title`, `slug`, `unitPrice`, `quantity`, `image` snapshot. |
| `sellerIds` | ObjectId[] | Denormalized for seller portal filters. |
| `createdAt`, `updatedAt` | Date | |

**Indexes:** `buyerUserId` + `createdAt`; `orderNumber` unique; `sellerIds`.

### 2.6 `cart_items` (optional persistence)

If cart should survive devices when logged in:

| Field | Type | Notes |
|-------|------|--------|
| `userId` | ObjectId | |
| `productId` | ObjectId | |
| `quantity` | number | |

**Indexes:** compound unique `userId` + `productId`.

### 2.7 `wishlist_items`

| Field | Type | Notes |
|-------|------|--------|
| `userId` | ObjectId | |
| `productId` | ObjectId | |

**Indexes:** compound unique `userId` + `productId`.

### 2.8 `recent_views`

| Field | Type | Notes |
|-------|------|--------|
| `userId` | ObjectId | |
| `productId` | ObjectId | |
| `viewedAt` | Date | |

**Indexes:** `userId` + `viewedAt` (TTL optional if capped list maintained in app logic).

### 2.9 `contact_messages` (optional)

For the `/contact` form:

| Field | Type | Notes |
|-------|------|--------|
| `name`, `email`, `message` | string | |
| `createdAt` | Date | |

### 2.10 `reviews` (future-ready)

If you denormalize `rating` / `reviews` on `products`, add a `reviews` collection later (`userId`, `productId`, `rating`, `text`, `createdAt`) and update aggregates on write.

---

## 3. REST API surface (routes)

Base path example: `/api/v1`. All JSON; errors as `{ "error": { "code", "message", "details?" } }`.

### 3.1 Auth

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/auth/register` | — | Body: `name`, `email`, `password`, optional `role` or `becomeSeller` flag. Creates `user` (+ `seller` stub if needed). |
| POST | `/auth/login` | — | Returns access token (+ sets refresh cookie if used). |
| POST | `/auth/logout` | refresh cookie | Clear refresh token / session. |
| POST | `/auth/refresh` | refresh cookie or body | New access token. |
| GET | `/auth/me` | Bearer | Returns safe `AuthUser` shape: `id`, `name`, `email`, `role`, `avatar`. |

Frontend today expects `switchRole` only in demo mode — in production, **role changes** should be admin-only or onboarding flows, not arbitrary client toggles.

### 3.2 Public catalog

| Method | Path | Description |
|--------|------|-------------|
| GET | `/categories` | List categories (with counts). |
| GET | `/categories/:slug` | Category detail + pagination params. |
| GET | `/products` | Query: `q`, `category`, `sellerId`, `page`, `limit`, `sort`. |
| GET | `/products/:slug` | Single product (404 if not `published`). |
| GET | `/sellers` | List / featured sellers. |
| GET | `/sellers/:handle` | Seller by handle + listings. |

### 3.3 Buyer (authenticated)

| Method | Path | Description |
|--------|------|-------------|
| GET/PUT | `/me/cart` | Sync cart lines with `productId`, `quantity` (server validates stock). |
| GET | `/me/wishlist` | List product ids or hydrated products. |
| PUT | `/me/wishlist/:productId` | Add/remove toggle or POST delete. |
| GET | `/me/recent` | Recent product ids (optional). |
| POST | `/me/recent/:productId` | Record view. |
| GET | `/me/orders` | Order history for `/orders`. |
| GET | `/me/orders/:orderNumber` | Detail. |
| POST | `/checkout` | Validate cart, create `order`, decrement `stock`, return order summary. Payment remains stub until PSP integration. |

### 3.4 Seller (role: seller)

Scoped to `sellerProfileId` linked to the user.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/seller/dashboard/stats` | Revenue, orders, conversion — match `/seller` widgets. |
| GET | `/seller/products` | Own products. |
| POST | `/seller/products` | Create (`draft` / `pending`). |
| PATCH | `/seller/products/:id` | Update. |
| DELETE | `/seller/products/:id` | Soft-delete or archive. |
| GET | `/seller/orders` | Orders containing this seller’s line items. |

### 3.5 Admin (role: admin)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/admin/overview` | Aggregates: GMV, orders, active users, disputes placeholder. |
| GET | `/admin/users` | Paginated users. |
| PATCH | `/admin/users/:id` | Role, suspend. |
| GET | `/admin/sellers` | Filter `pending` approvals. |
| PATCH | `/admin/sellers/:id` | Approve, verify, suspend. |
| GET | `/admin/products` | Moderation queue. |
| PATCH | `/admin/products/:id` | Approve, reject, flag. |
| POST | `/admin/reports` | Stub for “Generate report”. |

### 3.6 Contact

| Method | Path | Description |
|--------|------|-------------|
| POST | `/contact` | Store `contact_messages`; optional rate limit. |

---

## 4. Controllers (responsibilities)

Keep controllers thin: parse/validate input, call services, map DB docs to DTOs matching frontend types.

| Controller | Responsibility |
|------------|----------------|
| `authController` | Register, login, refresh, logout, `me`; issue JWT; map user → `AuthUser`. |
| `categoryController` | List/detail categories; computed `count` / `productCount`. |
| `productController` | CRUD (public read vs seller write); search/filter; slug resolution; hide non-published from public. |
| `sellerController` | Public seller pages; admin approval paths may live under `adminController`. |
| `cartController` | Get/merge cart, validate products and stock. |
| `wishlistController` | Get/put/delete wishlist entries. |
| `orderController` | List/detail for buyer; create from checkout; status updates (admin/seller workflows later). |
| `checkoutController` | Transactional order creation: lock stock, create order, clear server cart. |
| `sellerDashboardController` | Stats + seller-scoped lists. |
| `adminController` | Moderation and platform metrics. |
| `contactController` | Persist contact form. |

**Services layer (recommended):** `ProductService`, `OrderService`, `AuthService` hold Mongoose calls and business rules so controllers stay small.

---

## 5. Middlewares

| Middleware | Purpose |
|------------|---------|
| Request logger | `morgan` or `pino-http`; correlation id. |
| JSON body parser | Framework built-in; size limits. |
| CORS | Allowlisted origins + credentials if cookies. |
| Rate limiting | `express-rate-limit` on `/auth`, `/contact`, `/checkout`. |
| Error handler | Central map of errors → HTTP status; no stack in production. |
| `authenticate` | Verify JWT; attach `req.user` (`id`, `role`, `sellerProfileId`). |
| `requireRole(...roles)` | 403 if role not allowed. |
| `validateBody` / `validateQuery` | Zod or schema validation. |
| Mongo session (optional) | For checkout transactional consistency across multiple writes. |

---

## 6. Auth (concrete behavior)

1. **Register:** validate email/password strength; hash password; create `user` with default role `buyer` unless business rules say otherwise.
2. **Login:** verify hash; issue **access JWT** (short TTL, e.g. 15m) and optionally **refresh token** (longer, stored hashed in DB or rotation table).
3. **Protected routes:** `Authorization: Bearer <accessToken>`.
4. **Authorization:**  
   - Buyer routes: any authenticated user.  
   - Seller routes: `role === seller` and `sellerProfileId` matches resource owner.  
   - Admin routes: `role === admin`.
5. **Password change / reset:** Phase 2 (email tokens).
6. **Frontend migration:** replace `demoUsers` / `login(demoUsers[role])` with API calls; remove `switchRole` in production or gate behind `import.meta.env.DEV`.

---

## 7. Seed script

**Goal:** Populate MongoDB so API responses resemble `src/lib/mock-data.ts` (categories, sellers, products) and optional demo users.

**Suggested approach:**

- `npm run seed` → connect via `MONGODB_URI`, `deleteMany` in dev only (or use a dedicated `seed` database), then `insertMany`.
- **Users:** one buyer, one seller (linked to first seller shop), one admin — bcrypt known dev passwords; document them in `.env.example` only as placeholders.
- **Sellers:** same handles as mock (`apexgear`, …) for URL parity.
- **Categories:** normalize icon names as in mock.
- **Products:** generate slugs from titles; set `moderationStatus: published` for storefront.
- **Orders:** a few sample orders for the buyer user for `/orders`.

**Idempotency:** prefer upsert by `handle` / `slug` / `email` so seed can rerun safely in dev.

---

## 8. Phase-by-phase build plan

### Phase 0 — Project skeleton (0.5–1 day)

- Initialize Node app; configure env, logging, CORS, Mongo connection.
- Health route `GET /health` (DB ping).
- Global error middleware.

### Phase 1 — Auth + users (1–2 days)

- `users` model; register/login; JWT; `GET /auth/me`.
- Seed admin + buyer + seller accounts.
- **Middleware:** `authenticate`, `requireRole`.

### Phase 2 — Catalog read models (1–2 days)

- `categories`, `sellers`, `products` schemas + indexes.
- Public routes: categories list/detail, products list/detail, sellers by handle.
- Seed catalog from mock equivalents; wire frontend reads (replace imports from `mock-data` gradually).

### Phase 3 — Buyer persistence (1–2 days)

- `cart_items`, `wishlist_items`, `recent_views` + routes under `/me/*`.
- Frontend: sync Zustand with API on login (merge local cart optional).

### Phase 4 — Checkout + orders (2–3 days)

- `orders` model; `POST /checkout` with stock checks; `GET /me/orders`.
- Replace hardcoded orders in `orders.tsx` with API.
- Idempotency key on checkout optional (header) to prevent double submit.

### Phase 5 — Seller portal API (2–3 days)

- Seller-scoped product CRUD; moderation workflow (`pending` → admin).
- Seller orders list derived from line items.

### Phase 6 — Admin API (2 days)

- Approval endpoints for sellers/products; dashboard aggregates (Mongo aggregation pipelines or cached nightly stats).
- Align with `/admin` UI actions (Approve, Flag, Review).

### Phase 7 — Hardening (ongoing)

- Rate limits, audit logs for admin actions, input sanitization, image upload strategy (S3/Blob), payment provider webhooks, email for auth/orders, and monitoring.

---

## 9. Frontend touchpoints checklist

When the API exists, update the frontend to:

- [ ] Call `/auth/*` from `login.tsx` and `register.tsx`; remove demo password copy where real auth applies.
- [ ] Load products/categories/sellers from API in routes: `/`, `/products`, `/categories`, `/sellers/$handle`, `/products/$slug`.
- [ ] Persist wishlist/cart/recent for logged-in users; keep local persistence for guests or prompt login at checkout.
- [ ] `checkout.tsx` → `POST /checkout`; pass shipping payload; handle errors (out of stock).
- [ ] `orders.tsx` → `GET /me/orders`.
- [ ] `admin.tsx` / `seller.tsx` → wire buttons to PATCH/POST endpoints.
- [ ] `contact.tsx` → `POST /contact`.

---

## 10. Environment variables (reference)

```env
NODE_ENV=development
PORT=4000
MONGODB_URI=mongodb+srv://...
JWT_ACCESS_SECRET=...
JWT_REFRESH_SECRET=...
JWT_ACCESS_EXPIRES=15m
JWT_REFRESH_EXPIRES=7d
CORS_ORIGIN=http://localhost:5173
```

Adjust names to your framework conventions; keep secrets out of the repo.

---

## Ethitrust escrow integration

The backend integrates with [`@ethitrust/sdk`](https://www.npmjs.com/package/@ethitrust/sdk) to protect every checkout with one org-escrow per distinct seller on the order.

### Configuration

| Variable | Purpose |
|---|---|
| `ETHITRUST_API_KEY` | When set, escrow creation is enabled. When unset, checkout silently skips the escrow step. |
| `ETHITRUST_BASE_URL` | Defaults to `https://api.ethitrust.me`. |
| `ETHITRUST_WEBHOOK_SECRET` | Optional. Used to HMAC-verify `X-Signature` on inbound webhooks. |
| `ETHITRUST_DEFAULT_WHO_PAYS_FEES` | Fallback when a seller has no `whoPaysFees` override. One of `buyer` / `seller` / `split`. |

### Checkout flow

`POST /api/v1/checkout` opens a MongoDB transaction. After writing the `Order` document but before clearing the cart it:

1. Groups the order's line items by `sellerId` and computes the per-seller subtotal.
2. Loads each `Seller` doc (single round-trip) to read `whoPaysFees` + `name`.
3. For each group calls `client.orgEscrows.create({ invitee_email: shippingAddress.email, title, amount, currency: order.currency, escrow_type: 'onetime', who_pays_fees })` with idempotency key `"${orderNumber}:${sellerId}"`.
4. Persists `{ sellerId, escrowId, escrowStatus, inviteeEmail, amount, currency, whoPaysFees }` to `orders.sellerEscrows[]`.

If any SDK call throws the transaction rolls back — stock decrement and cart clearance are reverted and the buyer sees an error.

### Order schema additions

`orders` documents now carry a `sellerEscrows` sub-array (one entry per distinct seller on the order). A sparse unique index on `sellerEscrows.escrowId` powers fast webhook lookups.

### Webhook

`POST /api/v1/webhooks/ethitrust` — **public**, no auth header. The route is mounted *before* `express.json` so the raw `Buffer` is available for HMAC verification. The handler updates the matching `sellerEscrows.$.escrowStatus` + `lastEventAt`. Unknown `escrow_id` values are logged and acknowledged with `204` to prevent retry storms.

### Seller-facing endpoints

`POST /api/v1/seller/orders/:orderNumber/escrow/resend` — resends the buyer's escrow invitation for that seller's escrow on that order. Authorisation is performed by matching the calling seller's `sellerProfileId` against `sellerEscrows.sellerId`.

### Currency

The marketplace is denominated in ETB. Run `npm run migrate:currency-etb` once after deploying to upgrade legacy USD rows. Numeric values are not converted — that's an explicit choice; add an FX step if required.

---

*Derived from `frontend/src/lib/mock-data.ts`, `frontend/src/store/use-app-store.ts`, and marketplace/seller/admin route behavior as of the spec authoring date.*
