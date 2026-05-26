# Gap Report — Phase 8.5 DB + API

Design files checked:

- `design/design_handoff_phase8_5_corroboration/dispute-surfaces.jsx`
- `design/design_handoff_phase8_5_corroboration/report-flow.jsx`

## IMPLEMENTED (18)

- Migration 0029: `submission_confirms.method` column with CHECK constraint [packages/db/migrations/0029_phase_8_5_corroboration.sql]
- Migration 0029: `price_submissions.note` varchar(280) [packages/db/migrations/0029_phase_8_5_corroboration.sql]
- Migration 0029: `event_reports` table with all columns [packages/db/migrations/0029_phase_8_5_corroboration.sql]
- Migration 0029: `event_report_confirms` table with unique constraint [packages/db/migrations/0029_phase_8_5_corroboration.sql]
- Drizzle schema: `submissionConfirms.method` column [packages/db/src/schema/submission-confirms.ts]
- Drizzle schema: `priceSubmissions.note` column [packages/db/src/schema/prices.ts]
- Drizzle schema: `eventReports` table [packages/db/src/schema/event-reports.ts]
- Drizzle schema: `eventReportConfirms` table [packages/db/src/schema/event-report-confirms.ts]
- `ER_POLICY` constants (confirmsRequired=2, confirmsRequiredImminentCancelled=3, imminentThresholdDays=7) [packages/types/src/index.ts]
- POST `/v1/events/:id/price-submissions/:submissionId/confirm` with method enum [apps/api/src/routes/price-submission-confirms.ts]
- Auto-promote to `corroborated` when confirms >= SP_POLICY.confirmsRequired [apps/api/src/routes/price-submission-confirms.ts]
- `note` field + `moderateNote()` content moderation on price submission POST [apps/api/src/routes/price-submissions.ts + apps/api/src/lib/moderate-note.ts]
- `disputedSubmissionId` validation on price submission POST [apps/api/src/routes/price-submissions.ts]
- POST `/v1/events/:id/reports` [apps/api/src/routes/event-reports.ts]
- GET `/v1/events/:id/reports` with confirmsNeeded, isReporter, userHasConfirmed enrichment [apps/api/src/routes/event-reports.ts]
- POST `/v1/events/:id/reports/:reportId/confirm` with auto-promote via ER_POLICY [apps/api/src/routes/event-reports.ts]
- DELETE `/v1/events/:id/reports/:reportId` (withdraw) [apps/api/src/routes/event-reports.ts]
- PATCH `/v1/admin/events/reports/:reportId/resolve` with audit log [apps/api/src/routes/admin/events.ts]

## GAPS (0)

None identified. All spec requirements are implemented.

## DEFERRED (2)

- `sold-out` report auto-promotion updating event status — the `events.status` enum only supports `upcoming`, `cancelled`, `postponed`. `sold-out` is not an EventStatus. The confirm and admin resolve endpoints skip status propagation for `sold-out` reports (only `cancelled`/`postponed` are mapped). This is intentional: sold-out is tracked as a pending price-block state in the UI, separate from the event lifecycle status column. A follow-up can add a `soldOut` boolean or `priceStatus` column to events if needed.

- Design mapping note (not a gap): `dispute-surfaces.jsx` shows 4 `VerifyOption` items mapping to 3 schema `method` values — `box-office-saw` and `box-office-bought` both send `method='box-office'`. This is correct by design as noted in the JSX comment; the UI handles the box-office-bought flow client-side (opens a gold-tier submit modal after the confirm posts).
