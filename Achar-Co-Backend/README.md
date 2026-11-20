# Achar & Co. API and Admin Dashboard

This service adds a PostgreSQL-backed product catalogue and enquiry inbox to the existing static Achar & Co. website. It keeps WhatsApp as the checkout channel; it does not collect online payments.

## Included

- Express API with PostgreSQL storage and idempotent seeding from the current 17-product website catalogue.
- Admin sign-in with bcrypt password hashing and short-lived JWT sessions.
- Admin dashboard at `/admin` for publishing/pausing products, updating prices, and tracking enquiries.
- Public product API at `/api/products`, used by the frontend bridge.
- Contact enquiry API at `/api/enquiries`.
- CORS allow-list, security headers, request size limits, and rate limits for sign-in and contact submissions.

## Run locally

1. Install Node.js 20+ and PostgreSQL 14+.
2. Create a database named `achar_co`.
3. Copy `.env.example` to `.env`. Set `DATABASE_URL`, a unique `ADMIN_PASSWORD` (at least 12 characters), a random `JWT_SECRET` (at least 32 characters), and `FRONTEND_ORIGIN=http://localhost:3000`.
4. From the repository root, run:

```sh
npm install
npm start
```

The server creates its tables and seeds any missing catalogue products on startup. Open `http://localhost:4000/admin`. The frontend Vite site runs separately on port 3000.

## Connect the existing frontend

After deploying the API, set `apiBaseUrl` in the frontend's `config.js` to the API's HTTPS origin, without a trailing slash, for example `https://achar-api.example.com`. Set the backend's `FRONTEND_ORIGIN` to the exact deployed frontend origin. Then redeploy the frontend.

The frontend bridge will:

- Fetch active products from `GET /api/products` and update the public catalogue, product details, and combo choices.
- Send contact form submissions to `POST /api/enquiries`.
- Keep the existing WhatsApp links and cart checkout flow.

Until `apiBaseUrl` is configured, the website continues to use its current static catalogue. Product administration requires the backend and database to be deployed.

## Deploy

Deploy this folder as a Node web service (for example, Render, Railway, or a VPS) and attach a managed PostgreSQL database. Configure these environment variables in the host dashboard:

- `NODE_ENV=production`
- `DATABASE_URL` (managed database connection string)
- `DATABASE_SSL=true` if your database provider requires TLS
- `FRONTEND_ORIGIN` (exact website origin)
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD` (unique, at least 12 characters)
- `JWT_SECRET` (random, at least 32 characters)
- `PORT` (provided by most hosts)

The first admin account is created once, with a bcrypt password hash. Updating `ADMIN_PASSWORD` later does not overwrite an existing account; use a deliberate password-reset procedure before changing the login. Keep `.env` out of Git and never put secrets into frontend configuration.

## API outline

| Method | Route | Access | Purpose |
| --- | --- | --- | --- |
| GET | `/api/health` | Public | Health check |
| GET | `/api/products` | Public | Active catalogue |
| POST | `/api/enquiries` | Public, rate-limited | Save a contact enquiry |
| POST | `/api/auth/login` | Public, rate-limited | Issue admin session |
| GET | `/api/admin/products` | Admin | List all products |
| POST | `/api/admin/products` | Admin | Add a product |
| PATCH | `/api/admin/products/:id` | Admin | Edit or publish/pause a product |
| DELETE | `/api/admin/products/:id` | Admin | Remove a product |
| GET | `/api/admin/enquiries` | Admin | List/filter customer enquiries |
| PATCH | `/api/admin/enquiries/:id` | Admin | Update enquiry status |

Product changes show on the website after the next API fetch (the public response is cached for up to one minute).
