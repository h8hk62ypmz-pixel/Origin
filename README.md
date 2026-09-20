# DriveSA Instruct

South Australia driving-lesson booking: a shared live calendar, instant pay, and licence document upload (learner, provisional, full SA, interstate, or international).

## Features

- **Shared calendar** — open lesson times across Adelaide metro instructors; booked slots disappear for everyone
- **Instant booking** — pick a time, enter details, attach a licence photo/PDF, pay in AUD
- **Licence attachments** — learner (L), P1/P2, full SA, interstate, and international / overseas
- **Payments** — demo checkout works locally; set `STRIPE_SECRET_KEY` on Netlify for live Stripe Checkout
- **Netlify Functions + Blobs** — bookings and licence files stored with strong consistency; localStorage fallback when the API is offline

## Quick start

```bash
npm install
npm run dev
```

Open the URL Vite prints (usually http://localhost:5173). The Netlify Vite plugin serves `/api/*` functions in dev.

## Deploy on Netlify

1. Connect this repo and deploy (build: `npm run build`, publish: `dist`).
2. Optional: set `STRIPE_SECRET_KEY` for live card payments.
3. Licence PDFs/images land in the `drivesa-licences` Blob store; booking records in `drivesa-bookings`.

## iOS app (latest)

Native iOS build via **Capacitor 8**, deployment target **iOS 18+**.

```bash
npm run build:ios   # web build + sync into ios/
npm run open:ios    # opens Xcode (Mac required)
```

See [`ios/README.md`](ios/README.md). Optional: `VITE_API_BASE=https://your-netlify-site.netlify.app` so the phone uses your live API.

## Admin pricing & approvals

1. Open **Admin** (`/admin`), PIN default `drivesa`.
2. **Pending approval** — confirm or reject paid lesson blocks. Pending times stay held (not bookable) until you confirm.
3. Edit **default lesson prices** or one-off slot prices for open times only.

On Netlify, set `DRIVE_SA_ADMIN_PIN` to your own secret.

## Stack

Vite + React + TypeScript · React Router · Capacitor iOS · Netlify Functions · Netlify Blobs · date-fns

## Local tip

The Netlify Vite plugin emulates Functions + Blobs in `npm run dev`. Edge Functions emulation is disabled (not used by this app).
