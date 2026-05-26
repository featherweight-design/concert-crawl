# Phase 8.5 DB + API

Issues: #563 (DB), #564 (corroboration API), #565 (event reports API)
Design: design/design_handoff_phase8_5_corroboration/

## Tasks

### DB (#563)
- [ ] 1. Migration + Drizzle schema: submission_confirms.method
- [ ] 2. Migration + Drizzle schema: price_submissions.note
- [ ] 3. Migration + Drizzle schema: event_reports table
- [ ] 4. Migration + Drizzle schema: event_report_confirms table
- [ ] 5. ER_POLICY in packages/types

### API — corroboration (#564)
- [ ] 6. POST confirm endpoint
- [ ] 7. note field + content moderation on submission POST
- [ ] 8. disputedSubmissionId on submission POST

### API — event reports (#565)
- [ ] 9. POST /events/:id/reports
- [ ] 10. GET /events/:id/reports
- [ ] 11. POST /events/:id/reports/:reportId/confirm
- [ ] 12. DELETE /events/:id/reports/:reportId
- [ ] 13. PATCH /admin/events/reports/:reportId/resolve
