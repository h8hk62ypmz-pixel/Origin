# DriveSA Instruct — iOS (Capacitor)

Native iOS shell for the DriveSA web app, targeting **iOS 18+** on the latest Xcode.

## Requirements (Mac)

- macOS with **Xcode 16+** (latest Xcode recommended for current iOS SDK)
- CocoaPods optional (Capacitor 8 uses Swift Package Manager)

## Build & open

From the repo root:

```bash
npm install
# Optional: point the app at your deployed Netlify site for live bookings/API
# export VITE_API_BASE=https://your-site.netlify.app

npm run build:ios
npm run open:ios
```

In Xcode:

1. Select an **iPhone simulator** on the latest iOS runtime (or a physical device)
2. Set your **Team** under Signing & Capabilities
3. Press **Run** (⌘R)

Without `VITE_API_BASE`, the app runs in **demo mode** (localStorage bookings) — fine for UI review. With `VITE_API_BASE` set to your Netlify URL, calendar, payments, licence uploads, and admin pricing hit the live backend.

## Features on iOS

- Shared lesson calendar & instant booking
- Camera / photo library for licence attachment
- Admin pricing (`/admin`, PIN `drivesa` by default)
- Portrait iPhone layout; brand splash (#1B2A24)

## Bundle ID

`au.com.drivesa.instruct` · version `1.1`
