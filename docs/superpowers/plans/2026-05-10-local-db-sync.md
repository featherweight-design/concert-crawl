# Local DB Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make local development prod-like by syncing real staging data (venues, events, crawl runs) and generating representative synthetic user data (profiles, watching, price submissions, feedback).

**Architecture:** Query Render staging Postgres via Render MCP to generate `scripts/staging-snapshot.sql` containing INSERT statements for core tables. Expand `packages/db/seed.ts` with synthetic user-linked data that references the synced events. A convenience script `pnpm db:sync-local` applies the snapshot then runs the seed.

**Tech Stack:** PostgreSQL `format()` + Render MCP for snapshot generation; Drizzle ORM + tsx for seed expansion; Docker for local Postgres.

---

## File Map

| Action | Path | Purpose |
|--------|------|---------|
| Create | `scripts/staging-snapshot.sql` | Data-only SQL dump of staging core tables |
| Modify | `packages/db/seed.ts` | Add user-linked synthetic data + export new constants |
| Modify | `packages/db/src/seed.test.ts` | Add tests for new exported constants |
| Modify | `package.json` (root) | Add `db:sync-local` convenience script |
| Modify | `README.md` | Add seeding with staging data section |

---

## Task 1: Generate scripts/staging-snapshot.sql

**Files:**
- Create: `scripts/staging-snapshot.sql`

Use `mcp__render__query_render_postgres` with postgres ID `dpg-d7lni3reo5us73dp36d0-a`. Run each query below in order. Each query returns rows with an `insert_sql` column — collect all values and assemble the final file.

- [ ] **Step 1: Query venues**

```sql
SELECT format(
  'INSERT INTO venues (id,name,slug,website_url,city,timezone,active,verified,last_crawled_at,crawl_notes,crawl_delay_ms,robots_txt_allowed,robots_txt_checked_at,consecutive_failures,blocked_at,extraction_strategy,crawl_wait_until,contact_email,price_url,created_at,updated_at) VALUES (%L,%L,%L,%L,%L,%L,%L,%L,%L,%L,%L,%L,%L,%L,%L,%L,%L,%L,%L,%L,%L);',
  id,name,slug,website_url,city,timezone,
  active::text,verified::text,
  last_crawled_at,crawl_notes,crawl_delay_ms,
  robots_txt_allowed::text,robots_txt_checked_at,
  consecutive_failures,blocked_at,
  extraction_strategy::text,crawl_wait_until::text,
  contact_email,price_url,created_at,updated_at
) AS insert_sql
FROM venues ORDER BY created_at;
```

- [ ] **Step 2: Query events (≤50 per venue, most recent first)**

```sql
WITH ranked AS (
  SELECT *,
    ROW_NUMBER() OVER (PARTITION BY venue_id ORDER BY date DESC) AS rn
  FROM events
)
SELECT format(
  'INSERT INTO events (id,venue_id,title,artist,date,doors_time,show_time,ticket_url,ticket_price_min,ticket_price_max,price_source,description,image_url,genre,status,confidence_score,verified,setlist,source_url,source_hash,extraction_strategy,created_at,updated_at) VALUES (%L,%L,%L,%L,%L,%L,%L,%L,%L,%L,%L,%L,%L,%L,%L,%L,%L,%L,%L,%L,%L,%L,%L);',
  id,venue_id,title,artist,
  date::text,doors_time::text,show_time::text,
  ticket_url,ticket_price_min,ticket_price_max,
  price_source::text,description,image_url,
  genre::text,status::text,confidence_score,
  verified::text,setlist::text,
  source_url,source_hash,extraction_strategy,
  created_at,updated_at
) AS insert_sql
FROM ranked WHERE rn <= 50 ORDER BY venue_id, date DESC;
```

- [ ] **Step 3: Query crawl_runs (last 5 per venue)**

```sql
WITH ranked AS (
  SELECT *,
    ROW_NUMBER() OVER (PARTITION BY venue_id ORDER BY created_at DESC) AS rn
  FROM crawl_runs
)
SELECT format(
  'INSERT INTO crawl_runs (id,venue_id,status,http_status_code,robots_txt_blocked,extraction_strategy_used,events_found,events_inserted,error_message,page_hash,duration_ms,llm_cost_usd,events_updated,created_at) VALUES (%L,%L,%L,%L,%L,%L,%L,%L,%L,%L,%L,%L,%L,%L);',
  id,venue_id,status::text,http_status_code,
  robots_txt_blocked,extraction_strategy_used,
  events_found,events_inserted,error_message,
  page_hash,duration_ms,llm_cost_usd,events_updated,created_at
) AS insert_sql
FROM ranked WHERE rn <= 5 ORDER BY venue_id, created_at DESC;
```

- [ ] **Step 4: Query price_retrieval_log (last 10 per venue)**

```sql
WITH ranked AS (
  SELECT *,
    ROW_NUMBER() OVER (PARTITION BY venue_id ORDER BY attempted_at DESC) AS rn
  FROM price_retrieval_log
)
SELECT format(
  'INSERT INTO price_retrieval_log (id,event_id,venue_id,source,outcome,latency_ms,error_message,attempted_at) VALUES (%L,%L,%L,%L,%L,%L,%L,%L);',
  id,event_id,venue_id,
  source::text,outcome::text,
  latency_ms,error_message,attempted_at
) AS insert_sql
FROM ranked WHERE rn <= 10 ORDER BY venue_id, attempted_at DESC;
```

- [ ] **Step 5: Write scripts/staging-snapshot.sql**

Assemble the collected `insert_sql` strings into this structure:

```sql
-- Concert Crawl — staging snapshot
-- Source: concert-crawl-db-staging (Render)
-- Tables: venues, events (≤50/venue), crawl_runs (last 5/venue), price_retrieval_log (last 10/venue)
-- User-linked data is seeded separately via `pnpm db:seed`

BEGIN;

TRUNCATE submission_confirms, user_events, price_retrieval_log, crawl_runs, events, venues CASCADE;

-- VENUES ([N] rows)
[paste venue INSERT statements here, one per line]

-- EVENTS ([N] rows)
[paste event INSERT statements here, one per line]

-- CRAWL RUNS ([N] rows)
[paste crawl_runs INSERT statements here, one per line]

-- PRICE RETRIEVAL LOG ([N] rows)
[paste price_retrieval_log INSERT statements here, one per line]

COMMIT;
```

Replace `[N]` with the actual row counts. Verify a few rows look sensible (real venue names, real artist names, valid dates).

- [ ] **Step 6: Commit**

```bash
git add scripts/staging-snapshot.sql
git commit -m "feat(db): add staging snapshot SQL for local dev"
```

---

## Task 2: Add failing tests for new seed constants

**Files:**
- Modify: `packages/db/src/seed.test.ts`

The existing tests only cover `SEED_VENUES` (a static exported constant). We'll follow the same pattern: export new constants from `seed.ts`, test their shape here.

- [ ] **Step 1: Add failing tests to seed.test.ts**

Append to `packages/db/src/seed.test.ts`:

```typescript
import {
  FAKE_USER_PROFILES,
  FAKE_USER_ROLES,
  SEED_INVITE_CODES,
  SEED_FEEDBACK,
  SEED_NOTIFICATIONS,
} from '../seed.js'

describe('FAKE_USER_PROFILES', () => {
  it('has 5 entries', () => {
    expect(FAKE_USER_PROFILES).toHaveLength(5)
  })

  it('every profile has a userId and theme', () => {
    for (const profile of FAKE_USER_PROFILES) {
      expect(profile.userId).toBeTruthy()
      expect(profile.theme).toBeTruthy()
    }
  })

  it("hugh's profile has handle 'hugh' and theme 'electric'", () => {
    const hugh = FAKE_USER_PROFILES.find(
      (profile) => profile.userId === 'user_3CoSI01LtxRAvremTpL0yDfuEJ6',
    )
    expect(hugh).toBeDefined()
    expect(hugh?.handle).toBe('hugh')
    expect(hugh?.theme).toBe('electric')
  })
})

describe('FAKE_USER_ROLES', () => {
  it('has 5 entries', () => {
    expect(FAKE_USER_ROLES).toHaveLength(5)
  })

  it('every role has a priceCredScore', () => {
    for (const role of FAKE_USER_ROLES) {
      expect(typeof role.priceCredScore).toBe('number')
    }
  })

  it("hugh's role is admin with priceCredScore 15", () => {
    const hughRole = FAKE_USER_ROLES.find(
      (role) => role.userId === 'user_3CoSI01LtxRAvremTpL0yDfuEJ6',
    )
    expect(hughRole?.role).toBe('admin')
    expect(hughRole?.priceCredScore).toBe(15)
  })
})

describe('SEED_INVITE_CODES', () => {
  it('has 7 entries', () => {
    expect(SEED_INVITE_CODES).toHaveLength(7)
  })

  it('5 codes are unused and 2 have usedAt set', () => {
    const unused = SEED_INVITE_CODES.filter((code) => !code.usedAt)
    const used = SEED_INVITE_CODES.filter((code) => !!code.usedAt)
    expect(unused).toHaveLength(5)
    expect(used).toHaveLength(2)
  })

  it('every code string is unique', () => {
    const codes = SEED_INVITE_CODES.map((entry) => entry.code)
    expect(new Set(codes).size).toBe(codes.length)
  })
})

describe('SEED_FEEDBACK', () => {
  it('has 6 entries', () => {
    expect(SEED_FEEDBACK).toHaveLength(6)
  })

  it('has 2 bugs, 2 ideas, 2 praise entries', () => {
    const bugs = SEED_FEEDBACK.filter((fb) => fb.category === 'bug')
    const ideas = SEED_FEEDBACK.filter((fb) => fb.category === 'idea')
    const praise = SEED_FEEDBACK.filter((fb) => fb.category === 'praise')
    expect(bugs).toHaveLength(2)
    expect(ideas).toHaveLength(2)
    expect(praise).toHaveLength(2)
  })
})

describe('SEED_NOTIFICATIONS', () => {
  it('has 4 entries', () => {
    expect(SEED_NOTIFICATIONS).toHaveLength(4)
  })

  it('all are admin_alert type', () => {
    for (const notif of SEED_NOTIFICATIONS) {
      expect(notif.type).toBe('admin_alert')
    }
  })
})
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
cd packages/db && pnpm test
```

Expected: FAIL — `FAKE_USER_PROFILES`, `FAKE_USER_ROLES`, `SEED_INVITE_CODES`, `SEED_FEEDBACK`, `SEED_NOTIFICATIONS` not exported from `../seed.js`

- [ ] **Step 3: Commit failing tests**

```bash
git add packages/db/src/seed.test.ts
git commit -m "test(db): add failing tests for new seed constants"
```

---

## Task 3: Expand seed.ts with synthetic user data

**Files:**
- Modify: `packages/db/seed.ts`

- [ ] **Step 1: Update imports at top of seed.ts**

Replace the existing imports block with:

```typescript
import { desc, sql } from 'drizzle-orm'
import { db } from './src/client.js'
import {
  venues,
  events as eventsTable,
  priceRetrievalLog,
  userProfiles,
  userRoles,
  inviteCodes,
  userEvents,
  priceSubmissions,
  submissionConfirms,
  feedback,
  notifications,
  waitlistEntries,
  type NewVenue,
} from './src/schema/index.js'
```

- [ ] **Step 2: Add exported constants after SEED_VENUES**

Add the following constants after the `SEED_VENUES` declaration, before the `async function seed()` line:

```typescript
const FAKE_USER_IDS = {
  hugh: 'user_3CoSI01LtxRAvremTpL0yDfuEJ6',
  jess: 'user_fake_jess_0001',
  marco: 'user_fake_marco_0002',
  amy: 'user_fake_amy_0003',
  ghost: 'user_fake_ghost_0004',
} as const

export const FAKE_USER_PROFILES = [
  { userId: FAKE_USER_IDS.hugh, handle: 'hugh', theme: 'electric' as const, avatarColor: 'signal' as const, city: 'Denver' },
  { userId: FAKE_USER_IDS.jess, handle: 'jess_r', theme: 'pulse' as const, avatarColor: 'accent' as const, city: 'Denver' },
  { userId: FAKE_USER_IDS.marco, handle: 'marco_d', theme: 'forge' as const, avatarColor: 'warning' as const, city: 'Denver' },
  { userId: FAKE_USER_IDS.amy, handle: 'amy_k', theme: 'jade' as const, avatarColor: 'success' as const, city: 'Denver' },
  { userId: FAKE_USER_IDS.ghost, handle: null, theme: 'cedar' as const, avatarColor: null, city: null },
]

export const FAKE_USER_ROLES = [
  { userId: FAKE_USER_IDS.hugh, role: 'admin' as const, priceCredScore: 15, grantedBy: 'seed', permissions: [] as string[] },
  { userId: FAKE_USER_IDS.amy, role: 'sub_admin' as const, priceCredScore: 5, grantedBy: 'seed', permissions: [] as string[] },
  { userId: FAKE_USER_IDS.jess, role: 'user' as const, priceCredScore: 8, grantedBy: 'seed', permissions: [] as string[] },
  { userId: FAKE_USER_IDS.marco, role: 'user' as const, priceCredScore: 3, grantedBy: 'seed', permissions: [] as string[] },
  { userId: FAKE_USER_IDS.ghost, role: 'user' as const, priceCredScore: 0, grantedBy: 'seed', permissions: [] as string[] },
]

const now = new Date()

export const SEED_INVITE_CODES = [
  { code: 'BETA-OPEN-01', createdBy: FAKE_USER_IDS.hugh },
  { code: 'BETA-OPEN-02', createdBy: FAKE_USER_IDS.hugh },
  { code: 'BETA-OPEN-03', createdBy: FAKE_USER_IDS.hugh },
  { code: 'BETA-OPEN-04', createdBy: FAKE_USER_IDS.hugh },
  { code: 'BETA-OPEN-05', createdBy: FAKE_USER_IDS.hugh },
  {
    code: 'BETA-USED-J1',
    createdBy: FAKE_USER_IDS.hugh,
    usedBy: FAKE_USER_IDS.jess,
    usedAt: new Date(now.getTime() - 7 * 86_400_000),
  },
  {
    code: 'BETA-USED-M2',
    createdBy: FAKE_USER_IDS.hugh,
    usedBy: FAKE_USER_IDS.marco,
    usedAt: new Date(now.getTime() - 3 * 86_400_000),
  },
]

export const SEED_FEEDBACK = [
  { userId: FAKE_USER_IDS.jess, pageUrl: '/browse', category: 'bug' as const, message: 'Filter chips disappear on mobile when scrolled down.' },
  { userId: FAKE_USER_IDS.marco, pageUrl: '/browse', category: 'bug' as const, message: 'Calendar view shows wrong month when switching back from list view.' },
  { userId: FAKE_USER_IDS.hugh, pageUrl: '/admin/venues', category: 'idea' as const, message: 'Would be great to bulk-trigger crawls from the venues table.' },
  { userId: FAKE_USER_IDS.jess, pageUrl: '/browse', category: 'idea' as const, message: "Can we add a 'shows this weekend' quick filter?" },
  { userId: FAKE_USER_IDS.marco, pageUrl: '/', category: 'praise' as const, message: 'The generative art for each venue is such a nice touch.' },
  { userId: FAKE_USER_IDS.amy, pageUrl: '/admin', category: 'praise' as const, message: 'Admin crawl health view is super useful.' },
]

export const SEED_NOTIFICATIONS = [
  {
    userId: FAKE_USER_IDS.hugh,
    type: 'admin_alert' as const,
    category: 'crawl.failed',
    title: 'Crawl failed: Bluebird Theater',
    body: 'The crawler encountered a 403 error after 3 consecutive attempts. Venue has been paused.',
    actionUrl: '/admin/venues/bluebird-theater',
  },
  {
    userId: FAKE_USER_IDS.hugh,
    type: 'admin_alert' as const,
    category: 'crawl.blocked',
    title: 'Venue blocked: Gothic Theatre',
    body: 'Gothic Theatre returned 429 Too Many Requests. Venue flagged as blocked.',
    actionUrl: '/admin/venues/gothic-theatre',
  },
  {
    userId: FAKE_USER_IDS.hugh,
    type: 'admin_alert' as const,
    category: 'crawl.low_confidence',
    title: 'Low-confidence events: Ogden Theatre',
    body: '3 events extracted with confidence < 0.6. Manual review recommended.',
    actionUrl: '/admin/events?venue=ogden-theatre&filter=low-confidence',
  },
  {
    userId: null,
    type: 'admin_alert' as const,
    category: 'system.health',
    title: 'Daily crawl completed',
    body: 'All 10 venues crawled. 8 succeeded, 1 partial, 1 failed.',
    actionUrl: '/admin/crawls',
  },
]
```

- [ ] **Step 3: Add user-data seeding inside the seed() function**

Inside the `seed()` function, **after** the existing venue + event + price_retrieval_log block (before `process.exit(0)`), add:

```typescript
  // ── USER PROFILES ──────────────────────────────────────────────────────────
  await db.insert(userProfiles).values(FAKE_USER_PROFILES).onConflictDoNothing()
  console.warn(`Seeded ${FAKE_USER_PROFILES.length} user profiles.`)

  // ── USER ROLES ──────────────────────────────────────────────────────────────
  const existingRoles = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(userRoles)
  if ((existingRoles[0]?.count ?? 0) === 0) {
    await db.insert(userRoles).values(FAKE_USER_ROLES)
    console.warn(`Seeded ${FAKE_USER_ROLES.length} user roles.`)
  } else {
    console.warn('User roles already seeded, skipping.')
  }

  // ── INVITE CODES ────────────────────────────────────────────────────────────
  await db.insert(inviteCodes).values(SEED_INVITE_CODES).onConflictDoNothing()
  console.warn(`Seeded ${SEED_INVITE_CODES.length} invite codes.`)

  // ── WAITLIST ENTRIES ────────────────────────────────────────────────────────
  await db
    .insert(waitlistEntries)
    .values(
      Array.from({ length: 8 }, (_unused, idx) => ({
        email: `test+${idx + 1}@example.com`,
        ip: `192.168.1.${10 + idx}`,
      })),
    )
    .onConflictDoNothing()
  console.warn('Seeded 8 waitlist entries.')

  // ── FEEDBACK ────────────────────────────────────────────────────────────────
  const existingFeedback = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(feedback)
  if ((existingFeedback[0]?.count ?? 0) === 0) {
    await db.insert(feedback).values(SEED_FEEDBACK)
    console.warn(`Seeded ${SEED_FEEDBACK.length} feedback entries.`)
  } else {
    console.warn('Feedback already seeded, skipping.')
  }

  // ── NOTIFICATIONS ───────────────────────────────────────────────────────────
  const existingNotifs = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(notifications)
  if ((existingNotifs[0]?.count ?? 0) === 0) {
    await db.insert(notifications).values(SEED_NOTIFICATIONS)
    console.warn(`Seeded ${SEED_NOTIFICATIONS.length} notifications.`)
  } else {
    console.warn('Notifications already seeded, skipping.')
  }

  // ── EVENT-LINKED DATA (requires events from staging snapshot) ───────────────
  const liveEvents = await db
    .select({ id: eventsTable.id })
    .from(eventsTable)
    .orderBy(desc(eventsTable.date))
    .limit(50)

  if (liveEvents.length === 0) {
    console.warn(
      '⚠  No events found — skipping user_events and price_submissions.\n' +
        '   Apply the staging snapshot first: pnpm db:sync-local',
    )
  } else {
    const ids = liveEvents.map((evt) => evt.id)

    // USER EVENTS (watching / going / interested)
    await db
      .insert(userEvents)
      .values([
        { userId: FAKE_USER_IDS.hugh, eventId: ids[0], status: 'watching' as const },
        { userId: FAKE_USER_IDS.hugh, eventId: ids[1], status: 'going' as const },
        { userId: FAKE_USER_IDS.hugh, eventId: ids[2], status: 'watching' as const },
        { userId: FAKE_USER_IDS.hugh, eventId: ids[3], status: 'interested' as const },
        { userId: FAKE_USER_IDS.hugh, eventId: ids[4], status: 'going' as const },
        { userId: FAKE_USER_IDS.hugh, eventId: ids[5], status: 'watching' as const },
        { userId: FAKE_USER_IDS.jess, eventId: ids[0], status: 'going' as const },
        { userId: FAKE_USER_IDS.jess, eventId: ids[6], status: 'watching' as const },
        { userId: FAKE_USER_IDS.jess, eventId: ids[7], status: 'interested' as const },
        { userId: FAKE_USER_IDS.jess, eventId: ids[8], status: 'watching' as const },
        { userId: FAKE_USER_IDS.jess, eventId: ids[9], status: 'going' as const },
        { userId: FAKE_USER_IDS.marco, eventId: ids[2], status: 'interested' as const },
        { userId: FAKE_USER_IDS.marco, eventId: ids[10], status: 'watching' as const },
        { userId: FAKE_USER_IDS.marco, eventId: ids[11], status: 'watching' as const },
        { userId: FAKE_USER_IDS.amy, eventId: ids[4], status: 'going' as const },
        { userId: FAKE_USER_IDS.amy, eventId: ids[12], status: 'interested' as const },
      ])
      .onConflictDoNothing()
    console.warn('Seeded 16 user_events.')

    // PRICE SUBMISSIONS
    const existingSubs = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(priceSubmissions)
    if ((existingSubs[0]?.count ?? 0) === 0) {
      const insertedSubs = await db
        .insert(priceSubmissions)
        .values([
          { eventId: ids[0], userId: FAKE_USER_IDS.jess, priceMin: '35.00', priceMax: '55.00', tier: 'GA' as const, vendor: 'AXS' as const, howFound: 'bought_myself' as const, status: 'corroborated' as const, corroborationCount: 3 },
          { eventId: ids[1], userId: FAKE_USER_IDS.marco, priceMin: '45.00', priceMax: '75.00', tier: 'Reserved' as const, vendor: 'Ticketmaster' as const, howFound: 'saw_listing' as const, status: 'corroborated' as const, corroborationCount: 2 },
          { eventId: ids[2], userId: FAKE_USER_IDS.hugh, priceMin: '25.00', priceMax: null, tier: 'GA' as const, vendor: 'SeatGeek' as const, howFound: 'saw_listing' as const, status: 'pending' as const, corroborationCount: 0 },
          { eventId: ids[3], userId: FAKE_USER_IDS.jess, priceMin: '150.00', priceMax: '250.00', tier: 'VIP' as const, vendor: 'AXS' as const, howFound: 'bought_myself' as const, status: 'pending' as const, corroborationCount: 1 },
          { eventId: ids[4], userId: FAKE_USER_IDS.marco, priceMin: '30.00', priceMax: '50.00', tier: 'GA' as const, vendor: 'Ticketmaster' as const, howFound: 'at_the_venue' as const, status: 'disputed' as const, corroborationCount: 0 },
          { eventId: ids[5], userId: FAKE_USER_IDS.amy, priceMin: '65.00', priceMax: '95.00', tier: 'Reserved' as const, vendor: 'SeatGeek' as const, howFound: 'saw_listing' as const, status: 'pending' as const, corroborationCount: 0 },
          { eventId: ids[6], userId: FAKE_USER_IDS.jess, priceMin: '20.00', priceMax: '35.00', tier: 'Lawn' as const, vendor: 'Eventbrite' as const, howFound: 'saw_listing' as const, status: 'pending' as const, corroborationCount: 0 },
          { eventId: ids[7], userId: FAKE_USER_IDS.marco, priceMin: '85.00', priceMax: '120.00', tier: 'Pit' as const, vendor: 'DICE' as const, howFound: 'bought_myself' as const, status: 'corroborated' as const, corroborationCount: 4 },
          { eventId: ids[8], userId: FAKE_USER_IDS.hugh, priceMin: '40.00', priceMax: '60.00', tier: 'GA' as const, vendor: 'VenueBoxOffice' as const, howFound: 'at_the_venue' as const, status: 'stale' as const, corroborationCount: 0 },
          { eventId: ids[9], userId: FAKE_USER_IDS.jess, priceMin: '55.00', priceMax: '90.00', tier: 'Reserved' as const, vendor: 'AXS' as const, howFound: 'saw_listing' as const, status: 'pending' as const, corroborationCount: 2 },
        ])
        .returning()
      console.warn(`Seeded ${insertedSubs.length} price submissions.`)

      // SUBMISSION CONFIRMS (corroborate the corroborated ones)
      const corroboratedIds = insertedSubs
        .filter((sub) => sub.status === 'corroborated')
        .map((sub) => sub.id)

      if (corroboratedIds.length > 0) {
        await db
          .insert(submissionConfirms)
          .values([
            { submissionId: corroboratedIds[0], userId: FAKE_USER_IDS.hugh },
            { submissionId: corroboratedIds[0], userId: FAKE_USER_IDS.marco },
            { submissionId: corroboratedIds[1], userId: FAKE_USER_IDS.hugh },
            { submissionId: corroboratedIds[2], userId: FAKE_USER_IDS.jess },
          ])
          .onConflictDoNothing()
        console.warn('Seeded 4 submission confirms.')
      }
    } else {
      console.warn('Price submissions already seeded, skipping.')
    }
  }
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
cd packages/db && pnpm test
```

Expected: All tests pass, including the 5 new describe blocks.

- [ ] **Step 5: Run typecheck**

```bash
cd packages/db && pnpm typecheck
```

Expected: No errors.

- [ ] **Step 6: Commit**

```bash
git add packages/db/seed.ts packages/db/src/seed.test.ts
git commit -m "feat(db): expand seed with synthetic user data for local dev"
```

---

## Task 4: Add pnpm db:sync-local script

**Files:**
- Modify: `package.json` (root)

- [ ] **Step 1: Add script to root package.json**

In the root `package.json`, add to the `"scripts"` block:

```json
"db:sync-local": "docker exec -i concert-crawl-db psql -U postgres -d concert_crawl_db < scripts/staging-snapshot.sql && pnpm db:seed"
```

The full scripts block after the change:

```json
"scripts": {
  "dev": "turbo run dev",
  "build": "turbo run build",
  "test": "turbo run test",
  "lint": "turbo run lint",
  "format": "prettier --write .",
  "typecheck": "turbo run typecheck",
  "db:generate": "turbo run db:generate --filter=@concert-crawl/db",
  "db:migrate": "turbo run db:migrate --filter=@concert-crawl/db",
  "db:seed": "turbo run db:seed --filter=@concert-crawl/db",
  "db:sync-local": "docker exec -i concert-crawl-db psql -U postgres -d concert_crawl_db < scripts/staging-snapshot.sql && pnpm db:seed",
  "prepare": "husky"
}
```

- [ ] **Step 2: Smoke test the script (requires Docker running)**

```bash
docker compose up -d
pnpm db:migrate
pnpm db:sync-local
```

Expected output ends with lines like:
```
Seeded X user profiles.
Seeded X user roles.
Seeded 7 invite codes.
Seeded 8 waitlist entries.
Seeded 6 feedback entries.
Seeded 4 notifications.
Seeded 16 user_events.
Seeded 10 price submissions.
Seeded 4 submission confirms.
```

If Docker isn't running in this session, skip the smoke test and note it needs manual verification.

- [ ] **Step 3: Commit**

```bash
git add package.json
git commit -m "feat(db): add db:sync-local convenience script"
```

---

## Task 5: Update README

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Add staging sync section**

Find the `## Architecture` heading in README.md. Insert the following section immediately **before** it:

```markdown
## Local Development

### Full setup

```bash
# 1. Start local services
docker compose up -d

# 2. Install dependencies
pnpm install

# 3. Run migrations
pnpm db:migrate

# 4. Seed with staging data (real venues + events + synthetic user data)
pnpm db:sync-local
```

`pnpm db:sync-local` applies `scripts/staging-snapshot.sql` (a snapshot of core staging tables) then runs `pnpm db:seed` to add representative user data (profiles, watching, price submissions, feedback, notifications).

If you only want minimal dev data without the staging snapshot:
```bash
pnpm db:seed
```

Note: `user_events` and `price_submissions` are skipped if no events exist — run `pnpm db:sync-local` first for those tables to populate.
```

- [ ] **Step 2: Verify README renders correctly**

```bash
cat README.md | head -60
```

Confirm the new section appears before `## Architecture` and the code fences are balanced.

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "docs: add local dev seeding section to README"
```

---

## Self-Review

**Spec coverage check:**

| Spec requirement | Covered by |
|---|---|
| Sync venues, events, crawl_runs, price_retrieval_log from staging | Task 1 |
| Skip waitlist_entries, crawl_triggers, audit_log, notifications, user tables | Task 1 (TRUNCATE list + query list) |
| ≤50 events per venue | Task 1 Step 2 (PARTITION BY + ROW_NUMBER) |
| Last 5 crawl_runs per venue | Task 1 Step 3 |
| Last 10 price_retrieval_log per venue | Task 1 Step 4 |
| 5 fake users with specified roles + cred scores | Task 3 (FAKE_USER_ROLES constant) |
| Varied themes in user_profiles | Task 3 (FAKE_USER_PROFILES constant) |
| 7 invite codes (5 unused, 2 used) | Task 3 (SEED_INVITE_CODES constant) |
| 15+ user_events across users with mixed statuses | Task 3 (16 rows) |
| 10 price_submissions (mixed status/tier/vendor) | Task 3 |
| Submission confirms for corroborated submissions | Task 3 |
| 6 feedback entries (2 bug, 2 idea, 2 praise) | Task 3 (SEED_FEEDBACK constant) |
| 4 notifications (admin alerts) | Task 3 (SEED_NOTIFICATIONS constant) |
| 8 waitlist entries | Task 3 |
| cred score seeded per user | Task 3 (FAKE_USER_ROLES.priceCredScore) |
| Graceful skip if no events (warning message) | Task 3 (liveEvents.length === 0 guard) |
| pnpm db:sync-local convenience script | Task 4 |
| README documentation | Task 5 |
| Tests for new constants | Task 2 |

**Placeholder scan:** No TBD/TODO found.

**Type consistency:** All enum values cast with `as const`; `FAKE_USER_IDS` values referenced consistently throughout seed function.
