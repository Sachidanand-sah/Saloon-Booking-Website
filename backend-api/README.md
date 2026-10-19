# Lalima Beauty — Booking API

REST API for the salon website and mobile app: accounts, service catalog, stylists, real-time availability, bookings and the admin dashboard.

**Stack:** Node.js · TypeScript · Express 5 · Prisma · PostgreSQL · Zod · JWT · Vitest

## Quick start

```bash
cd backend-api
npm install
cp .env.example .env        # already points at the local database below

npm run db:local            # terminal 1: starts PostgreSQL on :5433 (no Docker needed)
npx prisma migrate dev      # terminal 2: create tables
npm run db:seed             # demo services, stylists, bookings and reviews
npm run dev                 # API on http://localhost:5000
```

Prefer Docker? `docker compose up -d` starts the same database on port 5433 instead of `npm run db:local`.

### Demo logins (seed data)

| Role     | Email                   | Password      |
| :------- | :---------------------- | :------------ |
| Admin    | `admin@lalima.test` | `Admin@12345` |
| Stylist  | `sunita@lalima.test`   | `Staff@12345` |
| Customer | `hello@example.com`     | `password123` |

## Scripts

| Command              | What it does                                         |
| :------------------- | :--------------------------------------------------- |
| `npm run dev`        | Start the API with auto-reload                       |
| `npm run build`      | Compile to `dist/`                                   |
| `npm start`          | Run the compiled build                               |
| `npm test`           | Unit + API tests (uses a separate `salon_test` database) |
| `npm run db:local`   | Run an embedded PostgreSQL server                    |
| `npm run db:migrate` | Create/apply migrations in development               |
| `npm run db:deploy`  | Apply migrations in production                       |
| `npm run db:seed`    | Replace all data with demo data (**development only**) |

## Configuration

All settings live in `.env` (see [.env.example](.env.example)). The important ones:

- `SALON_TIMEZONE`: opening hours and booking dates are interpreted in this zone (default `Asia/Kathmandu`).
- `SLOT_STEP_MINS`, `MIN_LEAD_MINS`, `BOOKING_WINDOW_DAYS`: how far apart start times are, how soon a customer can book, and how far ahead.
- `CURRENCY`: `NPR` by default; prices are shown as "Rs. 1,500".
- `AUTH_RATE_LIMIT`: login/signup attempts per visitor IP per 15 minutes.
- `CANCEL_CUTOFF_MINS`: customers can cancel or reschedule up to this long before their appointment.
- `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET`: **must** be changed in production. The server refuses to start with the example values.

## API overview

All endpoints are under `/api`. Authenticated routes need `Authorization: Bearer <accessToken>`.
Errors always look like `{ "code": "SLOT_UNAVAILABLE", "message": "…", "details"?: [...] }`.

### Auth
| Method | Path                    | Notes |
| :----- | :---------------------- | :---- |
| POST   | `/auth/signup`          | `{ name, email, password (8+), phone? }` → `{ user, accessToken, refreshToken }` |
| POST   | `/auth/login`           | `{ email, password }` → same shape |
| POST   | `/auth/refresh`         | `{ refreshToken }` → new token pair (old refresh token is revoked) |
| POST   | `/auth/logout`          | `{ refreshToken }` |
| GET    | `/auth/me`              | Current user |
| PATCH  | `/auth/me`              | `{ name?, phone? }` |
| POST   | `/auth/change-password` | `{ currentPassword, newPassword }`, which also signs out other devices |

### Catalog (public)
| Method | Path                 | Notes |
| :----- | :------------------- | :---- |
| GET    | `/salon`             | Time zone, currency, opening hours, booking rules |
| GET    | `/categories`        | With active service counts |
| GET    | `/services`          | `?category=hair&q=colour&featured=true`; includes rating |
| GET    | `/services/:idOrSlug`| With the stylists who perform it |
| GET    | `/locations`         | Active branches with address, coordinates, team size, services and opening hours |
| GET    | `/locations/:idOrSlug` | One branch with its team and services |
| GET    | `/staff`             | `?serviceId=&locationId=` to filter |
| GET    | `/staff/:id`         | Profile, services and weekly hours |
| GET    | `/reviews`           | `?limit=&serviceId=`; latest reviews for testimonials |
| GET    | `/availability`      | `?serviceId&date=YYYY-MM-DD&staffId?&locationId?` → `slots: [{ startAt, endAt, staffIds }]` |

### Bookings (signed in)
| Method | Path                       | Notes |
| :----- | :------------------------- | :---- |
| POST   | `/bookings`                | `{ serviceId, startAt (ISO), staffId?, locationId?, notes? }`. Without `staffId` the least-busy free stylist is assigned |
| GET    | `/bookings`                | `?scope=upcoming\|past\|all`, the caller's bookings |
| GET    | `/bookings/:id`            | |
| POST   | `/bookings/:id/cancel`     | |
| POST   | `/bookings/:id/reschedule` | `{ startAt, staffId? }` |
| POST   | `/bookings/:id/review`     | `{ rating 1–5, comment? }`, completed visits only |
| GET    | `/bookings/schedule`       | Stylists: their day (`?date=`) |

### Admin (role `ADMIN`)
`GET /admin/stats` · `GET /admin/bookings` (filters: `from, to, status, staffId, q, page`) · `PATCH /admin/bookings/:id` (`{ status }`) ·
`GET|POST /admin/services`, `PATCH|DELETE /admin/services/:id` · `POST /admin/categories`, `PATCH /admin/categories/:id` ·
`GET|POST /admin/locations`, `PATCH|DELETE /admin/locations/:id` ·
`GET|POST /admin/staff`, `PATCH /admin/staff/:id`, `PUT /admin/staff/:id/hours`, `PUT /admin/staff/:id/services` · `GET /admin/customers`

## How double-booking is prevented

1. `/availability` only offers start times that fit inside a stylist's working hours and don't overlap their existing bookings.
2. `POST /bookings` re-runs the same check for the requested time.
3. A PostgreSQL exclusion constraint (`booking_no_overlap`) rejects overlapping active bookings for the same stylist even if two requests arrive at the same instant. The API turns that into a `409 SLOT_UNAVAILABLE`.

## Project layout

```
src/
  app.ts                 Express app (middleware + routers)
  index.ts               Server entry point
  config/env.ts          Validated environment settings
  lib/                   Prisma client, tokens, errors, serializers
  middleware/            Auth guards, validation, error handler
  modules/
    auth/ catalog/ availability/ bookings/ reviews/ admin/
prisma/                  Schema, migrations, seed
tests/                   Vitest unit + API tests
```
