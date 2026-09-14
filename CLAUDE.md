# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Next.js dev server on http://localhost:3000
npm run build    # production build (output: 'standalone' — see next.config.mjs)
npm run start     # serve the production build
npm run lint     # ESLint (flat config, eslint.config.mjs, extends next core-web-vitals + TS)
```

There is no test suite. `npm run lint` is the only automated check.

## Architecture

Next.js 16 App Router + React 19 + Tailwind v4 + TypeScript. It is a read-mostly
device telemetry dashboard with two ingest/display paths that are merged at read
time:

- **`app/api/upload/route.ts`** — POST endpoint that Android devices call directly.
  Each payload is keyed by `device:${uuid}` in **Vercel KV** (`@vercel/kv`) and
  merged over the existing record with a fresh `lastSeen`. This is the only writer.
- **`app/api/data/route.ts`** — the read path. It fetches a **canonical upstream
  source** (`DEVICE_DATA_SOURCE_URL`, defaulting to a hosted `/api/jp-devices`
  Firestore-backed endpoint), normalizes each device into a flat shape via
  `normalizeCanonicalDevice`, and merges that with the KV records. The canonical
  source is authoritative for its fields; KV fills in devices/fields it doesn't have.
- **`app/devices/page.tsx`** / **`app/page.tsx`** — the dashboard UI that renders
  the merged device list.

Key implication: a device can appear from either the canonical Firestore source or
from a direct KV upload. When changing the device shape, update both
`normalizeCanonicalDevice` (canonical → flat) and the `upload` merge, or the two
sources will drift.

### Android telemetry client

`android-telemetry/` holds Kotlin snippets (not a build target here) meant to be
copied into an Android app: `TelemetryApplication.kt` schedules a WorkManager job
(`DeviceTelemetryWorker.kt`) that POSTs `{uuid, model, android_version, battery,
timestamp}` to `/api/upload` every 30 min. See `android-telemetry/README.md`.

## Environment

- `KV_*` — Vercel KV connection vars, consumed implicitly by `@vercel/kv`.
- `DEVICE_DATA_SOURCE_URL` — overrides the canonical device source in `api/data`.

## Deployment

Vercel (Next.js). `output: 'standalone'` is set so the build can also run as a
self-contained Node server outside Vercel.
