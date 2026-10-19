# Lalima Beauty — Website

The customer website and admin dashboard for Lalima Beauty, a multi-branch salon in the Kathmandu valley. All data (services, stylists, availability, bookings, reviews) comes live from [`backend-api`](../backend-api/README.md).

**Stack:** Next.js 16 (App Router) · React 19 · Tailwind CSS v4 · TanStack Query · Zod · Playwright

## Quick start

Start the API first (see its README: `npm run db:local`, `npm run db:seed`, `npm run dev`), then:

```bash
cd beauty-salon-booking
npm install
cp .env.example .env.local   # API_URL defaults to http://localhost:5000/api
npm run dev                  # http://localhost:3000
```

Demo logins come from the API seed: `admin@lalima.test / Admin@12345` (admin) and `hello@example.com / password123` (customer).

## What's inside

| Area | Routes |
| :--- | :--- |
| Locations | `/locations` (branch list + live map), `/locations/[slug]` (map, hours, team, treatments, directions) |
| Marketing | `/` home (hero, categories, featured services, team, reviews, hours) · `/services` (filter + search) · `/services/[slug]` |
| Booking | `/book`: step-by-step wizard (branch → treatment → specialist → date & time → confirm). State lives in the URL, so refresh, back button and "log in to continue" all keep the selection. `/book/success` adds the visit to Google/Apple/Outlook calendars |
| Packages & rewards | `/packages` (monthly memberships: request online, pay at a branch), `/rewards` (loyalty tiers and rules) |
| Events | `/events`, `/events/request` (bridal, party, Teej/festival, photoshoot: request a quote, accept it in your account) |
| Shop | `/products`, `/products/[slug]` (recommended by our professionals), `/bag` (reserve for pickup at a branch) |
| Account | `/login`, `/signup`, `/account` (upcoming/past bookings, events, orders, loyalty card, package usage, profile) |
| Admin | `/admin` dashboard · `/admin/bookings` · `/admin/services` · `/admin/staff` (profiles, branch, services, working hours) · `/admin/branches` · `/admin/packages` · `/admin/events` · `/admin/products` · `/admin/customers` (loyalty) |

## How it talks to the API

- Server components read public catalog data directly from `API_URL` (`lib/server/api.ts`) with short caching.
- The browser never sees tokens. Login/signup go through `/api/session/*`, which stores the API's tokens in **httpOnly cookies**. All other browser calls go through `/api/backend/*` (`app/api/backend/[...path]/route.ts`), which attaches the access token and refreshes it automatically.
- `proxy.ts` redirects signed-out visitors away from `/account` and `/admin`, and non-admins away from `/admin`. The API enforces roles on every request regardless.

## Customising

- Brand name, address, phone and social links: `lib/site.ts`
- Colours, fonts, radii, shadows: design tokens in `app/globals.css`
- Service photos live in `public/images` (credits in `public/images/CREDITS.md`); set any service or branch image in the admin.
- Branches, services, prices (NPR), stylists and opening hours are managed in the admin dashboard; nothing is hard-coded.

## Tests

End-to-end tests run against a live site and API with seed data:

```bash
npx playwright install chromium   # once
npm test                          # PLAYWRIGHT_BASE_URL=http://localhost:3001 to target another port
```

They cover browsing and filtering services, the full guest → sign-up → book → cancel flow, auth guards and the admin dashboard, on desktop and mobile viewports. Tests create throwaway accounts, so re-run `npm run db:seed` in `backend-api` afterwards for a clean demo.
