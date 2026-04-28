# Change Detection — Design Spec

**Date:** 2026-04-28
**Branch:** `feat/phase-3-change-detection`
**Status:** Approved

---

## Overview

Add two-layer change detection to `crawlVenue()` to eliminate redundant LLM calls and unnecessary DB writes when venue pages and event listings haven't changed.

**Layer 1 — Page-level hash:** If the full page HTML (minus scripts/styles) is identical to the last successful crawl, skip the crawl entirely. No extraction, no LLM, no DB writes.

**Layer 2 — Event-level hash:** If the page has changed, proceed with extraction. Before upserting, compare each event's content hash against the stored hash. Skip DB writes for unchanged non-verified events. Fire an admin alert when a verified event's content changes.

---

## PR Structure (Option B — two PRs)

### PR 3b-schema — Schema changes only

Independently deployable. Contains no logic changes.

1. **Migration:** Add `pageHash text` column to `crawl_runs`
2. **Migration:** Drop `rawHtml` column from `events` (sourceHash is the right change-detection primitive; storing full HTML per event is expensive and unused)
3. **Drizzle schema:** Update `crawl-runs.ts` and `events.ts` to match

### PR 3c-logic — Change detection logic

All behavior changes in `crawl.ts`. Depends on PR 3b-schema being deployed.

---

## Data Model

### `crawl_runs.pageHash` (new)

- Type: `text`, nullable
- Populated on every successful crawl (not on robots-blocked or fetch-error runs)
- Used to determine whether extraction should proceed on the next crawl

### `events.sourceHash` (existing column, now populated)

- Type: `text`, nullable
- SHA-256 of `title + artist + date + doorsTime + showTime`
- Written on insert and updated on upsert when content changes
- Used to detect whether a specific event's key fields have changed between crawls

### `events.rawHtml` (dropped)

- Removed. `sourceHash` is the right primitive for change detection; `rawHtml` is expensive to store and is not read anywhere.

---

## Crawl Flow (updated)

```
fetchPage()
  └─ compute pageHash (SHA-256 of HTML with <script>/<style> stripped)
  └─ query last successful crawl_run for venue
      ├─ pageHash matches → insert crawl_run (status: success, eventsFound: 0, eventsInserted: 0)
      │                      log crawl.skipped, return early
      │
      └─ pageHash differs (or no prior run) → proceed to extraction
           ├─ extractJsonLd() → events found → use structured_data strategy (no LLM)
           └─ extractJsonLd() → empty → extractWithLlm() → LLM called (cost incurred)

  For each extracted event:
    └─ compute sourceHash = SHA-256(title + artist + date + doorsTime + showTime)

  Query existing verified events for venue (pre-upsert)
    └─ for each where sourceHash differs and verified=true → insert admin_alert notification

  Filter events to upsert:
    └─ new events (no existing row) → insert
    └─ sourceHash changed → upsert
    └─ sourceHash unchanged + non-verified → skip DB write

  insert crawl_run with pageHash, eventsFound, eventsInserted
  update venue.lastCrawledAt, consecutiveFailures
```

---

## LLM Cost Model

The LLM is called only when **both** are true:

1. Page hash differs from last successful crawl (page has changed)
2. No JSON-LD structured data found on the page

| Page hash        | JSON-LD found | LLM called?               |
| ---------------- | ------------- | ------------------------- |
| Matches last run | —             | No (skipped entirely)     |
| Differs          | Yes           | No (structured data used) |
| Differs          | No            | **Yes**                   |

The event-level sourceHash check affects DB write efficiency only — it does not reduce LLM calls. The LLM is already invoked before event hashes are compared.

---

## Upsert Set Fix

Current `onConflictDoUpdate` set is missing fields. Updated set:

**Added:** `doorsTime`, `showTime`, `sourceHash`
**Kept out:** `verified` — admin approvals are sticky and must not be overwritten by re-crawls

---

## Verified-Event Change Notification

When a `verified=true` event's `sourceHash` changes on re-crawl:

- Insert an `admin_alert` notification (type: `admin_alert`, category: `crawl.verified_event_changed`)
- Body: `"Verified event may have changed: {title} at {venue} on {date}"`
- The event is still upserted — the notification is for human review, not a block

Field-level diff (showing exactly which fields changed) is deferred to a future PR when the product moves toward public launch. For beta, the notification is sufficient to surface changes for admin review.

---

## Hashing Implementation

- Algorithm: SHA-256 via Node.js `crypto` module (built-in, no dependency)
- Page hash: `crypto.createHash('sha256').update(strippedHtml).digest('hex')`
- Strip before hashing: remove all `<script>...</script>` and `<style>...</style>` blocks (regex)
- Event hash: concatenate fields with a delimiter (`|`) before hashing to avoid collisions across field boundaries

```ts
// Event hash field order is fixed — changing it invalidates all stored hashes
sourceHash = sha256(
  `${title}|${artist}|${date}|${doorsTime ?? ''}|${showTime ?? ''}`,
)
```

---

## Error Handling

- Hash computation is synchronous and cannot throw
- Pre-upsert verified-event query is inside the existing `try/catch` — failure falls through to `crawl.failed` path
- Page-level skip still inserts a `crawl_run` row (audit trail is always complete)
- If `pageHash` query fails (DB error), fail open: proceed with extraction rather than skipping

---

## Testing

**Unit tests (`packages/crawler-core`):**

- Hash utility: deterministic output, consistent field ordering, delimiter collision resistance

**Integration tests:**

- `crawlVenue()` returns early with `eventsFound: 0` when pageHash matches
- `crawlVenue()` proceeds to extraction when pageHash differs
- Unchanged non-verified events are not written to DB
- Verified event with changed sourceHash triggers admin alert
- New events (no existing row) are always inserted
