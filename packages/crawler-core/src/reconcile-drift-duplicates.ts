import { sql } from 'drizzle-orm'
import { db } from '@concert-crawl/db'
import { createLogger } from '@concert-crawl/logger'

const logger = createLogger('reconcile-drift-duplicates')

/**
 * FK tables referencing events.id. Kept in sync with the DB by the
 * "EVENT_FK_TABLES matches …" integration test — the CI analogue of the
 * one-shot sweep's RAISE EXCEPTION FK-sanity block. A schema drift fails the
 * build, never a crawl.
 */
export const EVENT_FK_TABLES = [
  'event_reports',
  'price_retrieval_log',
  'price_submissions',
  'spotify_alert_log',
  'user_events',
] as const

/**
 * Runtime analogue of scripts/2026-07-19-missing-event-orphan-cleanup.sql,
 * scoped to a single venue and run after each crawl's stale-detection pass.
 * Deletes false-missing "drift duplicate" orphans (a title-variant row whose
 * live sibling is still being crawled) and reassigns their FK rows onto the
 * live sibling. Match rule is byte-identical to the sweep for parity.
 */
export const reconcileDriftDuplicates = async (
  venueId: string,
): Promise<{ reconciledLosers: number }> =>
  db.transaction(async (tx) => {
    // MAP — one deterministic live sibling per orphan, scoped to this venue.
    await tx.execute(sql`
      CREATE TEMP TABLE orphan_map ON COMMIT DROP AS
      WITH missing_orphans AS (
        SELECT id, venue_id, date, canonical_title, canonical_artist, show_time
        FROM events
        WHERE status = 'upcoming'
          AND first_missing_at IS NOT NULL
          AND venue_id = ${venueId}
          AND date >= (NOW() AT TIME ZONE 'America/Denver')::date
      ),
      candidates AS (
        SELECT
          o.id AS loser_id,
          s.id AS winner_id,
          ROW_NUMBER() OVER (
            PARTITION BY o.id
            ORDER BY
              (s.canonical_title = o.canonical_title)          DESC,
              (s.show_time IS NOT DISTINCT FROM o.show_time)    DESC,
              s.last_seen_at DESC NULLS LAST,
              s.id ASC
          ) AS rn
        FROM missing_orphans o
        JOIN events s
          ON s.venue_id = o.venue_id
         AND s.date = o.date
         AND s.status = 'upcoming'
         AND s.first_missing_at IS NULL
         AND s.id <> o.id
         AND o.canonical_artist <> '' AND s.canonical_artist <> ''
         AND o.canonical_title  <> '' AND s.canonical_title  <> ''
         AND ( strpos(s.canonical_title, o.canonical_artist) > 0
            OR strpos(o.canonical_title, s.canonical_artist) > 0 )
      )
      SELECT loser_id, winner_id FROM candidates WHERE rn = 1
    `)

    const countRows = [
      ...(await tx.execute(
        sql`SELECT COUNT(*)::int AS loser_count FROM orphan_map`,
      )),
    ]
    const rawCount = countRows[0]?.['loser_count']
    const loserCount = typeof rawCount === 'number' ? rawCount : 0

    if (loserCount === 0) {
      // Temp table is ON COMMIT DROP — nothing to clean up, just return.
      return { reconciledLosers: 0 }
    }

    await tx.execute(sql`
      CREATE TEMP TABLE event_target ON COMMIT DROP AS
      SELECT loser_id AS event_id, winner_id AS target_id FROM orphan_map
      UNION
      SELECT DISTINCT winner_id AS event_id, winner_id AS target_id FROM orphan_map
    `)

    // user_events — dedup on (user_id, target_id) then redirect.
    await tx.execute(sql`
      WITH target_user_rows AS (
        SELECT ue.id AS ue_id,
          ROW_NUMBER() OVER (PARTITION BY ue.user_id, et.target_id
            ORDER BY ue.created_at DESC, ue.id DESC) AS rn,
          COUNT(*) OVER (PARTITION BY ue.user_id, et.target_id) AS group_size
        FROM user_events ue
        JOIN event_target et ON et.event_id = ue.event_id
      )
      DELETE FROM user_events ue USING target_user_rows tur
      WHERE ue.id = tur.ue_id AND tur.group_size > 1 AND tur.rn > 1
    `)
    await tx.execute(sql`
      UPDATE user_events ue SET event_id = om.winner_id
      FROM orphan_map om WHERE ue.event_id = om.loser_id
    `)

    // spotify_alert_log — dedup on (user_id, kind, target_id) then redirect.
    await tx.execute(sql`
      WITH target_alert_rows AS (
        SELECT sal.id AS sal_id,
          ROW_NUMBER() OVER (PARTITION BY sal.user_id, sal.kind, et.target_id
            ORDER BY sal.created_at DESC, sal.id DESC) AS rn,
          COUNT(*) OVER (PARTITION BY sal.user_id, sal.kind, et.target_id) AS group_size
        FROM spotify_alert_log sal
        JOIN event_target et ON et.event_id = sal.event_id
      )
      DELETE FROM spotify_alert_log sal USING target_alert_rows tar
      WHERE sal.id = tar.sal_id AND tar.group_size > 1 AND tar.rn > 1
    `)
    await tx.execute(sql`
      UPDATE spotify_alert_log sal SET event_id = om.winner_id
      FROM orphan_map om WHERE sal.event_id = om.loser_id
    `)

    // No user-uniqueness — plain redirect.
    await tx.execute(sql`
      UPDATE price_submissions ps SET event_id = om.winner_id
      FROM orphan_map om WHERE ps.event_id = om.loser_id
    `)
    await tx.execute(sql`
      UPDATE price_retrieval_log prl SET event_id = om.winner_id
      FROM orphan_map om WHERE prl.event_id = om.loser_id
    `)
    await tx.execute(sql`
      UPDATE event_reports er SET event_id = om.winner_id
      FROM orphan_map om WHERE er.event_id = om.loser_id
    `)

    // DELETE losers — FK rows reassigned, CASCADE has nothing to chase.
    await tx.execute(sql`
      DELETE FROM events e USING orphan_map om WHERE e.id = om.loser_id
    `)

    logger.info(
      { venueId, reconciledLosers: loserCount },
      'reconciled drift-duplicate orphans',
    )
    return { reconciledLosers: loserCount }
  })
