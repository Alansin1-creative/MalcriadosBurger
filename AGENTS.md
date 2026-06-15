# AGENTS.md

## Cursor Cloud specific instructions

### What this project actually is
- This is a **Next.js 15 (App Router) static-export** web app for the "Malcriados Burger" restaurant: customer ordering + admin/POS, kitchen, tables, inventory, recipes, reports, OCR.
- `next.config.mjs` sets `output: 'export'`, so there are **no API routes and no server runtime**. All data access happens **client-side, directly against Firebase** (Auth + Cloud Firestore) via the `firebase` web SDK (`src/lib/firebase/*`, `src/contexts/AuthContext.tsx`).
- **`README.md` is stale.** It describes an older "Plan AI" product backed by SQLite + `/api/*` routes — that code no longer exists in `src/`. Ignore the README for setup. The `@supabase/*` and `better-sqlite3` dependencies are unused leftovers.
- Default Firebase project id: `malcriadosburger-958b8` (see `.firebaserc`).

### Required configuration to exercise the app
- Any auth/data action (login, register, place order, load menu, admin views) requires a live Firebase backend. The app reads the standard web config from env vars (consumed by `src/lib/firebase/config.ts`):
  - `NEXT_PUBLIC_FIREBASE_API_KEY`, `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`, `NEXT_PUBLIC_FIREBASE_PROJECT_ID`, `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`, `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`, `NEXT_PUBLIC_FIREBASE_APP_ID` (optionally `NEXT_PUBLIC_SITE_URL`).
- These are injected as VM environment variables (Secrets) and picked up by `next dev`. Without them the UI still renders and client-side form validation works, but Firebase calls fail (e.g. `auth/invalid-api-key`).
- The Firebase **web (browser) SDK does not honor `FIRESTORE_EMULATOR_HOST`/`FIREBASE_AUTH_EMULATOR_HOST`**, and `config.ts` has no emulator wiring, so the Local Emulator Suite cannot be used without code changes. Use a real Firebase project's web config.

### Commands (run from repo root, all standard — see `package.json`)
- Dev server: `npm run dev` → binds `0.0.0.0:3000` (use port **3000**; Cloud Agent public URL maps here).
- Build (static export to `out/`): `npm run build`.
- Lint: `npm run lint`. Note: there is a **pre-existing lint error** in `dbsetup.js` (`require()` import) and a few warnings; this does **not** block the build because `next.config.mjs` sets `eslint.ignoreDuringBuilds: true`.
- Optional seed data: `npm run seed:firestore` — requires `firebase-admin` service-account creds (`GOOGLE_APPLICATION_CREDENTIALS`) plus `ADMIN_EMAIL`/`ADMIN_PASSWORD`; creates an admin user + sample menu/tables/settings.

### Notes
- Node 22 works (README says 18+, Dockerfile pins 20).
- OCR (`tesseract.js`) runs entirely in the browser; language data is downloaded at runtime.
