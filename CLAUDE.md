# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev
```

Dev server on port 5200 (also registered in `.claude/launch.json` as `HealthCheck`, so `preview_start {name: "HealthCheck"}` works).

```bash
npm run build
```

There is no test suite and no linter. Verification is done by running the app.

Deployment is Vercel (`.vercel/project.json` → project `health-check`). The Supabase Edge Function deploys separately:

```bash
supabase functions deploy send-reservation-notification --no-verify-jwt
```

Required env vars in `.env.local`: `VITE_SUPABASE_URL`, `VITE_SUPABASE_KEY`.

## Language conventions

The app is a Japanese clinic system. UI strings, code comments, and git commit messages are all in Japanese. Match this — new comments and commit messages should be Japanese.

## Architecture

Vite + React 18 + Tailwind v4 SPA, Supabase for auth/DB/Storage/Realtime. No router, no state library.

`src/main.jsx` → `src/App.jsx` → `HealthCheck.jsx` (root, ~5200 lines). **`HealthCheck.jsx` holds essentially all application state and all data access.** Everything else is extracted leaf code:

- `lib/healthCheckConfig.js` — pure domain config: purposes, item presets, fee tables, holidays, billing labels
- `lib/kenshinUtils.js` — pure formatters: blood reference ranges, wareki (Japanese era) dates, `kenshinInitialState`
- `lib/backup.js` — Supabase Storage backup/restore, uses raw `fetch` against the REST API (not the JS client)
- `components/*.jsx` — presentational print/preview views, props-only, no data fetching

### Two-pane UI

- `leftTab`: `'reservation'` (booking form, `formData`) | `'result'` (exam results, `kenshinData`)
- `rightTab`: `'calendar'` | `'preview'` (record sheet) | `'kenshin'` (health certificate)
- `calendarViewMode`: `'calendar'` | `'list'`

`formData` and `kenshinData` are two independent flat state objects, camelCase in JS, converted by hand to snake_case DB rows at save time.

### Supabase tables

The DB is **shared with a separate inventory system** — don't assume every table belongs to this app.

| Table | Role |
|---|---|
| `health_reserv` | reservations (this app's main table; one wide row per booking, `item_*` boolean columns per exam item) |
| `health_data` | exam results / health certificate data (`k_*` prefixed columns; upserted on `k_id,k_date`) |
| `patients` | patient master, auto-synced on reservation save when a patient ID is present |
| `health_companies` | company/organization master (`name_key` = normalized lowercase name, unique) |
| `invent_staff` | staff list — **owned by the inventory system**, read-only here |
| `reservations` | endoscopy bookings — **owned by the inventory system**, read-only, shown in the today's-reservations modal |

`health_reserv` rows older than 3 years are auto-deleted at startup (`deleteOldReservations`).

### The purpose (健診目的) system — the core domain concept

`formData.purpose` drives almost everything: which exam items are checked, the fee, whether blood pressure is measured once or twice, which auto-notes are written into `others`, and which billing label appears. This logic lives in `lib/healthCheckConfig.js`.

Adding or changing a purpose usually means touching several coordinated places:

1. `GENERAL_PURPOSES` / `SPECIAL_PURPOSES` / `INSURANCE_REVIEW_PURPOSES` (the first two are in `HealthCheck.jsx`, the third in the config) — controls where it appears in the purpose modal
2. `getItemsForPurpose()` — the default checked items
3. `calculateReservationFee()` / `calcKuritasFee()` / `ZERO_FEE_PURPOSES` — fee behavior
4. `BP_TWO_MEASURE_LOCKED_PURPOSES` — locks 血圧2回
5. `getCompanyBillingLabel()` — replaces the payment-type selector with a fixed billing label
6. `BLOOD_NOTE_REFERENCE_PURPOSES` and the auto-note effect in `HealthCheck.jsx` — text auto-inserted into the `others` field

The auto-note effect rewrites `formData.others` on purpose/item change; it strips its own previously generated lines (`stripKuritasBloodNotes`, plus an explicit list of known note constants) and re-appends them, preserving manually typed lines. When adding a new auto-note constant, add it to that strip list too, or it will duplicate.

### Adding a reservation field

`HEALTH_RESERV_SAVE_COLUMNS` in `HealthCheck.jsx` is an explicit allowlist; `sanitizeHealthReservRecord` drops anything not in it before insert/update. A new field silently fails to persist unless added there. It also needs a DB column — see migrations below.

### Migrations

There is no migration tool. Migrations are standalone `supabase_*.sql` files at the repo root, run by hand in the Supabase SQL Editor, and kept as a record. Follow the existing `add column if not exists` style and add a new file rather than editing an old one. `supabase_rls_audit.sql` is a read-only helper for checking RLS state.

### Printing

Printing is CSS-driven, not a separate render path. `printMode` (`''` | `'companyList'` | `'specificHealthRoster'`) toggles a class on the root div, and one large inline `<style>` block at the end of `HealthCheck.jsx` (~line 4938) contains all `@media print` rules. Page size/orientation is interpolated from `printMode`. Print targets are addressed by element id — `#printable` (record sheet), `#kenshin-printable` (certificate), `#attachment-sheet` — and everything else is hidden via `.print-hide` / class-scoped rules. `afterprint` resets `printMode`.

Print layout is fine-tuned in millimeters against real A4 output; changes here are easy to break and hard to verify in the browser preview alone.

### Backup

`lib/backup.js` snapshots `patients`, `health_reserv`, `health_data` (in FK-safe order) to the `backups/healthcheck/` Storage bucket. A `backupDirty` ref is set on any mutation and on Realtime `health_reserv` changes; a 3-minute interval in `HealthCheck.jsx` runs a backup when dirty, with `skipIfUnchanged` comparing against the latest stored payload. One file per day is kept, 30 files total. Restore supports full-replace or upsert-merge.

### Reservation email notifications

Never triggered from the front end. A Supabase Database Webhook on `health_reserv` INSERT/UPDATE calls `supabase/functions/send-reservation-notification`, which authenticates via the `x-health-reservation-secret` header (not JWT) and sends through Resend. It skips UPDATEs where `updated_at` is unchanged, so bulk maintenance edits don't spam. Failures are recorded only in `health_reservation_notification_log` and are invisible in the UI. Setup steps are in `supabase_reservation_notification_setup.md`.

## Maintenance gotchas

- `HOLIDAYS` in `lib/healthCheckConfig.js` is a hardcoded set through 2027. `HOLIDAYS_COVERAGE_END` drives a startup warning — update both together.
- The version string is hardcoded in the header JSX of `HealthCheck.jsx` (`ver.2026.07.13`), not read from `package.json`.
- Company names are matched by `getCompanyNameKey` (full-width space → half-width, whitespace collapsed, lowercased). Free-typed company names are rejected on save; users must pick from the master or use 団体名なし.
