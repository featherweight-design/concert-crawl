-- Partial unique index on event_reports supporting the admin Mark Sold Out /
-- Mark Available endpoints (issue #618).
--
-- Two concerns, one index:
--
-- 1. Defense-in-depth against the check-then-insert race in the Mark Sold Out
--    handler: two concurrent admin POSTs could both observe "no active report"
--    and both insert, producing duplicate active promoted sold-out reports.
--    Realistic concurrency in admin is one operator, so the race is mostly
--    theoretical — but the DB constraint makes idempotency robust regardless,
--    and the handler now catches the unique-violation case and returns the
--    existing row.
--
-- 2. Supporting index for the isSoldOut EXISTS subquery in
--    GET /v1/admin/events. The list endpoint computes
--      EXISTS (SELECT 1 FROM event_reports r
--              WHERE r.event_id = events.id
--                AND r.status = 'sold-out'
--                AND r.resolved_at IS NOT NULL
--                AND r.resolution = 'promoted')
--    per row, up to a 500-row page. Without an index this becomes a seq scan
--    of event_reports per outer row as the table grows. A partial index on
--    event_id with the same predicate lets Postgres satisfy EXISTS via a
--    single index lookup. The unique index covers both purposes.
--
-- Predicate-matched UNIQUE INDEX — only one active promoted sold-out report
-- per event, ever. Closed reports (resolution='rejected') or unresolved
-- reports (resolved_at IS NULL) don't participate in the constraint.

CREATE UNIQUE INDEX IF NOT EXISTS event_reports_one_active_sold_out_per_event_idx
  ON event_reports (event_id)
  WHERE status = 'sold-out'
    AND resolved_at IS NOT NULL
    AND resolution = 'promoted';
