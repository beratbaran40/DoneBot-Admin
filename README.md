# DoneBot Admin

Operations panel for [DoneBot](https://github.com/beratbaran40/DoneBot). Reads live from the production
database through the backend's `/admin` endpoints, so its numbers are current — unlike Play Console
(1–2 day lag) and Firebase Analytics (sampled, opt-out-able).

Works in a desktop browser and on a phone; installable as a PWA.

## What it shows

| Screen | Contents |
|---|---|
| **Overview** | DAU/WAU/MAU, stickiness, rolling retention, 30-day trends, users, tasks, DoneBot usage, groups, moderation backlog |
| **Users** | Search, filter, sort; per-account detail with suspend / sign-out-everywhere / delete |
| **Moderation** | The chat and group-content report queues, with a viewer for reported photos |
| **Ops** | Health, kill switches, DoneBot cost, recent errors, integration status, links to Play Console / Crashlytics / Neon / GCP / Render |
| **Audit** | Every administrative write: who, what, when, from where |

Installs, crash-free rate and store ratings are deliberately **not** here — they are not available in
real time from anywhere, so the Ops screen links out instead of showing a stale copy next to live data.

## Running locally

```bash
cp .env.example .env.local     # then edit if your backend is not on :8080
npm install
npm run dev                    # http://localhost:5173
```

The backend must be running and must know about you:

```bash
# in ToDoBackend
ADMIN_ALLOWED_EMAILS=you@example.com ADMIN_CORS_ORIGINS=http://localhost:5173 ./gradlew bootRun
```

Reaching the panel needs **all three** of: `users.role = 'ADMIN'`, `users.status = 'ACTIVE'`, and your
email on `ADMIN_ALLOWED_EMAILS`. The role is a database column — there is no API that grants it, on
purpose:

```sql
UPDATE users SET role = 'ADMIN' WHERE email = 'you@example.com';
```

## Signing in

**Google is the primary path** and needs no backend work: the Android app already requests its ID token
with the *web* OAuth client as `serverClientId`, and the server validates on audience alone — so a token
minted in a browser by that same client verifies identically.

One external step is required once per origin: add the panel's URL to that web client's **Authorized
JavaScript origins** in the Google Cloud console (`http://localhost:5173` for dev, the deployed URL for
production). Without it the button renders but the popup fails.

**Email + password is the break-glass path**, for the day a Google-side misconfiguration would otherwise
lock you out of your own panel. Note that a Google-created account has no password and cannot use it —
`/auth/forgot-password` refuses social-only accounts by design — so the fallback needs its own account
registered with a password.

## Deploying

Vercel, static build. Environment variables:

| Variable | Value |
|---|---|
| `VITE_API_BASE_URL` | `https://donebot-backend.onrender.com` |
| `VITE_GOOGLE_CLIENT_ID` | the web OAuth client id (see `.env.example`) |

And on Render, for the backend:

| Variable | Value |
|---|---|
| `ADMIN_ALLOWED_EMAILS` | your email — **blank denies everyone**, which is the intended failure direction |
| `ADMIN_CORS_ORIGINS` | the deployed panel origin, exactly |

`vercel.json` ships the SPA rewrite plus a strict CSP. The CSP allows `https://accounts.google.com` in
`script-src` and `frame-src` because Google Identity Services needs it; tightening those two breaks
sign-in silently.

Vercel gives preview deployments a fresh origin per commit, which the fixed CORS allowlist will reject.
That is the intended trade — a `*.vercel.app` wildcard would let any Vercel project call the API.

## Design notes

- **Numbers say how old they are.** Every data screen shows the server's own `generatedAt` and the cache
  age. The overview is cached 60s server-side; auto-refresh is off by default, because a dashboard left
  open on a second monitor polling continuously keeps a serverless Postgres awake around the clock.
- **`null` is not `0`.** Metrics that genuinely could not be measured yet render as "not measured yet".
  Task completions were unmeasurable before the completion timestamp shipped, and a confident zero there
  would read as "nobody finished anything".
- **Charts are small multiples, never a shared axis.** The series differ by an order of magnitude; one
  plot would need two y-scales, which lets whoever picks the scales decide which line looks like it
  wins.
- **The palette was computed, not chosen.** Both the light and dark series colours were run through a
  contrast/colour-vision validator against their own surface. Dark is a separate selection rather than
  an inversion — the light steps fail the contrast floor on a near-black background.
- **Metadata only.** No screen shows a task title, a journal entry or a chat transcript. Support
  questions are answerable from counts, dates and device registrations. The one exception is moderation,
  where the content being displayed is content a user explicitly submitted for review.
