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

## Stack

Vite + React + TypeScript · React Router · Netlify Functions · Netlify Blobs · date-fns

## Local tip

The Netlify Vite plugin emulates Functions + Blobs in `npm run dev`. Edge Functions emulation is disabled (not used by this app).
