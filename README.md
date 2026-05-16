# Nexus

E-commerce marketplace monorepo: a **TanStack Start** storefront (`frontend`) and an **Express** API (`backend`) backed by **MongoDB**. Production deployments target a VPS via GitHub Actions and **PM2** (see workflow and `ecosystem.config.js`).

## Repository layout


| Directory  | Role                                                                             |
| ---------- | -------------------------------------------------------------------------------- |
| `frontend` | TanStack Router + TanStack Start, React 19, Vite, Tailwind CSS, Radix UI         |
| `backend`  | REST API (`/api/v1`), Mongoose, JWT auth, optional Cloudinary for seller uploads |


## Prerequisites

- **Node.js** — use **22.12+** for the frontend (see `frontend/package.json` `engines`). The backend declares `>=20`; matching the frontend version avoids surprises.
- **MongoDB** — connection string required for the API.
- Optional: **PM2** for process management on a server (`ecosystem.config.js` defines `nexus-backend` and `nexus-frontend`).

## Local development

### Backend

```bash
cd backend
cp .env.example .env   # edit values — see Backend environment variables below
npm install
npm run dev
```

Default API URL: `http://localhost:4000` (see `PORT`).

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Point the UI at your API with `VITE_API_BASE_URL` (defaults to `http://localhost:4000/api/v1`). Example:

```bash
# frontend/.env.local (or shell)
VITE_API_BASE_URL=http://localhost:4000/api/v1
```

Useful scripts: `npm run build`, `npm start` (runs the Nitro server output), `npm run lint`, `npm run format`.

## Backend environment variables

Defined and validated in `backend/src/config/env.ts`:


| Variable                                    | Notes                                  |
| ------------------------------------------- | -------------------------------------- |
| `MONGODB_URI`                               | Required                               |
| `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`   | Min 16 characters each                 |
| `PORT`                                      | Default `4000`                         |
| `CORS_ORIGIN`                               | Default `http://localhost:8080`        |
| `JWT_ACCESS_EXPIRES`, `JWT_REFRESH_EXPIRES` | Defaults `15m` / `7d`                  |
| `REFRESH_COOKIE_NAME`                       | Default `refresh`                      |
| `DEV_SEED_PASSWORD`                         | Optional; used by `npm run seed`       |
| `CLOUDINARY_*`                              | Optional trio for seller image uploads |
| `ETHITRUST_API_KEY`                         | Optional. Enables per-seller Ethitrust org-escrows during checkout. |
| `ETHITRUST_BASE_URL`                        | Default `https://api.ethitrust.me`     |
| `ETHITRUST_WEBHOOK_SECRET`                  | Optional shared secret for inbound webhook `X-Signature` HMAC verification |
| `ETHITRUST_DEFAULT_WHO_PAYS_FEES`           | `buyer` / `seller` / `split` — fallback when a seller has none configured |


## Ethitrust escrow integration

When `ETHITRUST_API_KEY` is set, every checkout creates **one org-escrow per distinct seller** on the order via [`@ethitrust/sdk`](https://www.npmjs.com/package/@ethitrust/sdk). The buyer's shipping email is the invitee (they receive the funding invitation), the per-seller subtotal is the amount, and the `who_pays_fees` value comes from the seller's `whoPaysFees` setting (managed by admins on `/admin/sellers`).

- **Currency:** the marketplace is denominated in **ETB**. Run `npm run migrate:currency-etb` once after deploying this version to rewrite any legacy `USD` rows on `products` and `orders`.
- **Webhooks:** Ethitrust should POST status updates to `POST /api/v1/webhooks/ethitrust`. The route is mounted before the global JSON parser so the raw body is HMAC-verified against `ETHITRUST_WEBHOOK_SECRET` (skipped when unset).
- **Resend invitation:** sellers can resend the buyer's escrow email from `/seller/orders` (proxied to `client.orgEscrows.resendInvitation(escrowId)`).
- **Idempotency:** each escrow is created with `idempotencyKey = "<orderNumber>:<sellerId>"` so the SDK's automatic retries collapse to a single Ethitrust escrow.

If `ETHITRUST_API_KEY` is unset, checkout still works and silently skips escrow creation (`sellerEscrows` stays empty on the order). This makes local development without a real Ethitrust key transparent.

## Testing and data

In `backend`, integration-style smoke scripts include `npm run test:auth`, `test:catalog`, `test:buyer`, `test:checkout`, `test:seller`, `test:admin`. Seed the database with `npm run seed` when `DEV_SEED_PASSWORD` is set.

More API detail lives in `backend/BACKEND_SPEC.md`.

## Deployment

- **CI/CD:** `.github/workflows/deploy.yml` — on push to `main`, SSH deploys to a VPS (`/var/www/nexus`), runs `npm install` / `npm run build` in `backend` and `frontend`, then restarts PM2 processes `nexus-backend` and `nexus-frontend`.
- **Secrets:** `VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY` in GitHub Actions.
- **Example reverse proxy:** `deploy/nginx-nexus-frontend.conf.example`.

Production ports in workflow fallbacks match `ecosystem.config.js`: backend **4000**, frontend **8080**.