# Price Transparency v2 — Known Gaps

**Date:** 2026-05-08
**Status:** Open
**Source:** Spec review against implementation (session 2026-05-08)

Gaps identified by comparing `docs/superpowers/specs/2026-05-06-price-transparency-design.md`
against the current implementation in PR #32 + PR #37.

---

## Deferred (intentional, not bugs)

| Gap                                                   | Reason                                                                        |
| ----------------------------------------------------- | ----------------------------------------------------------------------------- |
| Pipeline not triggered nightly or on new event create | No valuable price data from crawls yet; re-evaluate pre-launch                |
| Cred indicator on user profiles                       | Being handled in Phase 8b design pass                                         |
| Coverage trend (last 30 days)                         | Single snapshot sufficient for beta; API schema change is trivial when needed |
| Majority-rule dispute at 5+ submissions               | Unlikely to occur in private beta; leave as manual admin action               |

---

## Open — fix before beta opens

### 1. Stale auto-marking never runs

**Spec:** "any submission older than 30 days past the event date is auto-marked stale"

**Reality:** The `stale` enum value exists but nothing sets it automatically. Old community-submitted prices persist as `corroborated` indefinitely, surfacing misleading prices to users for past or distant-future shows.

**Fix:** Add a lightweight SQL update to the nightly crawl run (or a standalone cron) that marks submissions stale:

```sql
UPDATE price_submissions
SET status = 'stale', updated_at = now()
WHERE status IN ('pending', 'corroborated')
  AND event_id IN (
    SELECT id FROM events WHERE date < now() - interval '30 days'
  );
```

---

### 2. WatchAffordance button is a dead UI element

**Spec:** Price-drop alerts are listed as a Non-Goal (future feature).

**Reality:** `PriceDisplay.tsx` renders a "Yell if it drops" button that toggles local React state only — no API call, no persistence, no notification pathway. It creates a false user expectation.

**Fix:** Remove the button until the backend exists. Leave a `// TODO: price-drop alerts (post-beta)` comment if needed.

---

## Open — admin UI (review in progress)

The admin prices page (`/admin/prices`) currently shows only:

- 4 stat cards (total tracked, with prices %, no price %, recent hits %)
- Events table (event, venue/date, min, max, source, last retrieval, status)

Three views specified in the spec have API endpoints but no UI:

| View                  | API endpoint                                                                  | What's missing                                                                                    |
| --------------------- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Pipeline Health       | `GET /v1/admin/prices/health`                                                 | Per-source × per-venue success rate table; disable action for auto-flagged sources                |
| Retrieval Log         | `GET /v1/admin/prices/log`                                                    | Filterable table: last 100 attempts by source + outcome                                           |
| Community Submissions | `GET /v1/admin/prices/submissions` + `PATCH /v1/admin/prices/submissions/:id` | Moderation queue with corroboration counts, dispute flags, and bulk approve/dispute/stale actions |

The **Community Submissions** gap is the most pressing: once beta users submit prices there is no way to review or moderate them from the admin panel.

The "disable source" action (for auto-flagged 30-day miss streaks) also has no endpoint — the health endpoint flags them but `PATCH /v1/admin/prices/sources/:source/disable` or equivalent does not exist.
