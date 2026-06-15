# AGENTS.md

## Cursor Cloud specific instructions

### What this app is
- Client-side **Next.js 15 (App Router)** app for **"Malcriados Burger"** ordering, configured for static export (`output: 'export'` in `next.config.mjs`).
- Backend is **live Firebase** (Auth + Firestore) accessed directly from the browser via the `firebase` web SDK in `src/lib/firebase/`. There is no local API/server backend.
- The root `README.md` is partly outdated: it describes an older SQLite/POS "Plan AI" backend with `/api/*` routes. Those routes do not exist in the current code — ignore that section; the real backend is Firebase.

### Config / secrets
- Firebase config is read from `NEXT_PUBLIC_FIREBASE_*` env vars (see `src/lib/firebase/config.ts`). These are injected as Cloud Agent secrets, so `npm run dev`/`npm run build` pick them up automatically. No `.env` file is required.
- `apphosting.yaml` lists additional production secrets (ADMIN_*, MERCADOPAGO_*, RESEND_*); they are only needed for Firebase App Hosting deploys / seed scripts, not for local dev.

### Running / building / linting
- Dev server: `npm run dev` (serves on `0.0.0.0:3000`).
- Build: `npm run build` (Next static export to `out/`).
- Lint: `npm run lint`. There are pre-existing lint findings (1 error in `dbsetup.js`, plus a few warnings); the build ignores ESLint via `eslint.ignoreDuringBuilds` in `next.config.mjs`, so lint failures do not block builds.
- There is no automated test suite.

### Important gotcha (hydration / 404 chunks)
- Do **not** run `npm run build` while `npm run dev` is running. `next build` overwrites the shared `.next` directory, which makes the running dev server return **404 for `/_next/static/chunks/main-app.js` and `polyfills.js`**. When that happens the page renders but never hydrates, so React form handlers don't attach and forms fall back to a native GET submit (e.g. registration silently does nothing / `GET /register/?`).
- Fix: stop the dev server, `rm -rf .next`, then restart `npm run dev`. Run build only when dev is stopped.

### Hello-world / smoke check
- Register a client at `/register/` (password policy: min 10 chars, upper, lower, digit, symbol; phone is a 10-digit Mexican number). On success it creates a Firebase Auth user + a `profiles/{uid}` Firestore doc and redirects to `/inicio/` (the client menu). Admins land on `/`.
