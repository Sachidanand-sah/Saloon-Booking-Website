# Lalima Beauty — Mobile App

The customer app for iOS and Android: book appointments across all branches, manage bookings, use monthly packages and loyalty points, request event quotes, and reserve products recommended by our professionals. It uses the same API as the website ([`backend-api`](../backend-api/README.md)).

**Stack:** Expo SDK 54 · React Native 0.81 · TypeScript · React Navigation 7 · TanStack Query · expo-secure-store · expo-notifications

## Run it

1. Start the API (see its README) and, for photos, the website (`npm run dev` in `beauty-salon-booking`).
2. Point the app at your computer. A phone can't reach `localhost`, so use your LAN IP (run `ipconfig`):

   ```bash
   cd customer-mobile-app
   cp .env.example .env     # then edit the IP in both lines
   npm install
   npm start                # scan the QR code with Expo Go
   ```

   `npm run web` opens the same app in a browser, which is handy for a quick look.

Demo login: `hello@example.com` / `password123` (has an active package, loyalty points and a product order).

## What's inside

| Tab / screen | What it does |
| :--- | :--- |
| Welcome, Log in, Sign up | Branded onboarding; the session is kept in the device's secure storage |
| Home | Next appointment, points balance, categories, featured services, packages, bridal & events, recommended products, branches |
| Book | Branch, then treatment, specialist (skipped when only one), date and time (live availability), confirm with member discount and "use my points" |
| My bookings | Upcoming and past; reschedule, cancel, review, directions to the branch; optional reminder 2 hours before |
| Shop | Products recommended by our pros, bag, reserve to collect at a branch |
| Me | Rewards card and history, package usage, event requests and quotes, orders, profile, locations, contact |

## Project layout

```
App.tsx                  Providers (query client, auth, toasts), fonts, navigation
src/
  config.ts              API and site URLs (from .env), brand details
  theme.ts               Design tokens shared with the website
  api/                   Typed client (auto token refresh), query hooks, types
  auth/                  Session provider, secure storage
  components/            UI kit (ui.tsx), cards, toasts
  lib/                   Formatting, maps/directions, bag, reminders
  navigation/            Route types and the navigator
  screens/               auth/ home/ booking/ account/ explore/ shop/
__tests__/               Jest tests (jest-expo + Testing Library)
```

## Scripts

| Command | |
| :--- | :--- |
| `npm start` | Expo dev server (Expo Go / simulators) |
| `npm run web` | Run in a browser |
| `npm test` | Unit and component tests |
| `npm run typecheck` | TypeScript |
