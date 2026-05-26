# Phase 8.5 DB + API

Issues: #563 (DB), #564 (corroboration API), #565 (event reports API)
Design: design/design_handoff_phase8_5_corroboration/

## Tasks

### DB (#563)

- [x] 1. Migration + Drizzle schema: submission_confirms.method
- [x] 2. Migration + Drizzle schema: price_submissions.note
- [x] 3. Migration + Drizzle schema: event_reports table
- [x] 4. Migration + Drizzle schema: event_report_confirms table
- [x] 5. ER_POLICY in packages/types

### API — corroboration (#564)

- [x] 6. POST confirm endpoint
- [x] 7. note field + content moderation on submission POST
- [x] 8. disputedSubmissionId on submission POST

### API — event reports (#565)

- [x] 9. POST /events/:id/reports
- [x] 10. GET /events/:id/reports
- [x] 11. POST /events/:id/reports/:reportId/confirm
- [x] 12. DELETE /events/:id/reports/:reportId
- [x] 13. PATCH /admin/events/reports/:reportId/resolve
