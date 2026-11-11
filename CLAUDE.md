# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

Use Node.js 24.22.1 or a newer 24.x patch/minor release (`package.json` engines: `^24.22.1`). Vercel also selects the 24.x line from this declaration; verify its actual patch version in build logs after deployment. On another PC, update Node.js before running `npm ci`.

```bash
npm run dev
```

Dev server on port 5200 (also registered in `.claude/launch.json` as `HealthCheck`, so `preview_start {name: "HealthCheck"}` works).

Vite 7.3.7 is pinned with a committed lockfile. Dev and preview servers bind to `127.0.0.1`; keep them local. Check dependency advisories with `npm audit` before dependency updates, then run the build, reservation-capacity tests, and browser/print smoke checks.

```bash
npm run build
```

There is no linter. Run `npm run test:reservation-capacity` for the focused reservation-capacity SQL regression tests (PGlite, no production connection), and verify UI changes by running the app.

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
| `health_reservation_closed_dates` | date-specific booking settings: null `max_reservations` = closed, positive integer = capacity; no row = unlimited |
| `health_data` | exam results / health certificate data (`k_*` prefixed columns; upserted on `k_id,k_date`) |
| `patients` | patient master, auto-synced on reservation save when a patient ID is present |
| `health_companies` | company/organization master (`name_key` = normalized lowercase name, unique) |
| `health_reservation_audit_logs` | immutable reservation INSERT/UPDATE/DELETE history; read in Patient Management only through a security-definer RPC |
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

`lib/backup.js` snapshots `health_reserv`, `health_data`, and `health_reservation_closed_dates` to `backups/healthcheck/` in Storage. The shared `patients` table is excluded. Startup backup and maintenance begin after the first calendar month finishes loading. A `backupDirty` ref is set on mutations and on Realtime `health_reserv` changes; a 3-minute interval in `HealthCheck.jsx` runs a backup when dirty. With `skipIfUnchanged` (auto backups only), it skips without reading any table if any PC's latest Storage backup is newer than 6 hours (dirty) or 24 hours (not dirty); the dirty record is kept so the change is backed up once the interval passes. One file per day is kept, 7 files total. Restore supports full-replace or upsert-merge.

### Calendar startup

The initial reservation query covers the current month only. Pending reservations, day capacity settings, companies, and staff are fetched independently. Other calendar months are fetched as they enter the scroll area, with a month cache scoped to the current user and company filter. Unloaded months are labeled and cannot be used to start a new booking. Realtime changes and reservation mutations invalidate cached months; only the displayed months or the save destination are immediately fetched. The company list keeps its existing range and cache, and certificate completion keys are fetched for the list or today's reservations when needed.

### Reservation email notifications

Never triggered from the front end. A Supabase Database Webhook on `health_reserv` INSERT/UPDATE/DELETE calls `supabase/functions/send-reservation-notification`, which authenticates via the `x-health-reservation-secret` header (not JWT) and sends through Resend. It skips UPDATEs where `updated_at` is unchanged, so bulk maintenance edits don't spam. DELETE notifications are limited to reservation-form deletes with a selected staff member; automatic pruning and maintenance deletes stay silent. Failures are recorded only in `health_reservation_notification_log` and are invisible in the UI. Setup steps are in `supabase_reservation_notification_setup.md`.

### Reservation audit log viewer

Patient Management contains Backup and Reservation Audit Log tabs. The client never selects `health_reservation_audit_logs` directly; `get_health_reservation_audit_logs` is a read-only security-definer RPC that requires an authenticated session. Keep the table grants revoked and apply `supabase_add_health_reservation_audit_view.sql` when setting up a new environment.

### Reservation daily capacity

`supabase_health_reservation_capacity.sql` extends the existing closure table and trigger. Do not treat every row in `health_reservation_closed_dates` as a closure: a positive `max_reservations` allows bookings up to that count. The authenticated `get_health_reservation_date_limits` RPC returns only dates, limits, and all-company counts. Calendar/company filters never change the capacity count. The database serializes new bookings, date moves, and settings changes using the existing date advisory-lock key; same-date edits remain allowed even when full or closed. Before this SQL is installed, the client falls back to the original closure query and disables capacity selection. Settings remain in the existing backup table. See `supabase_health_reservation_capacity_setup.md` for setup and real-environment checks.

### Search modal full lists

Reservation and saved-certificate search modals show unfiltered records only after an empty/whitespace Enter or an explicit `すべて表示` click. `lib/usePagedRecords.js` loads 100 rows at a time plus one lookahead row, ordered by exam date descending (nulls last), then ID descending. `さらに表示` reaches the remaining records without an automatic full-table download. Certificate deletion removes the loaded row and adjusts the next offset. Closing/reopening resets full-list mode; nonempty input retains the existing filtered search behavior.

### Undated reservations

Normal reservation saves require a date. Only `handleSave({ hold: true })` may save `date = null`, including a new reservation or changes to an existing pending reservation. `getReservationSaveError` is shared by the click handler and the final save function; pending saves still require the patient name, selected staff, valid company selection, and municipality address where applicable. Existing reservations continue through the audited update RPC with a selected actor. Preserve the original saved date and pending start timestamp when editing a pending reservation; confirming a date clears pending metadata and runs the normal closure/capacity checks.

The pending list also offers a restore button only when `pending_original_date` is present. It requires a selected actor and a fresh read of the saved pending state, then checks the target date through the shared `getReservationDateError` helper. It sends only date, weekday, recalculated age, and cleared pending metadata through the existing audit RPC, never unrelated form contents or a full stale reservation snapshot. The database trigger remains the final capacity check. On success, refresh the pending/calendar/list views and mark backups dirty; on failure, keep the pending row and show its action error above the list.

Every pending row also has a delete icon. Require patient-name confirmation and a selected deletion actor, re-read the saved pending state before deletion, and use the existing audit RPC with `DELETE`. Pending restore and delete share an in-flight guard and disable each other's controls. On successful deletion, remove the row, invalidate list caches, mark backups dirty, and clear the reservation form only if it was editing that exact reservation. Never reset another patient's unsaved input or delete the patient master/health certificate from this action. Failures stay in the pending list as action errors.

## Maintenance gotchas

- `HOLIDAYS` in `lib/healthCheckConfig.js` is a hardcoded set through 2027. `HOLIDAYS_COVERAGE_END` drives a startup warning — update both together.
- The version string is hardcoded in the header JSX of `HealthCheck.jsx` (`ver.2026.07.13`), not read from `package.json`.
- Company names are matched by `getCompanyNameKey` (full-width space → half-width, whitespace collapsed, lowercased). Free-typed company names are rejected on save; users must pick from the master or use 団体名なし.
