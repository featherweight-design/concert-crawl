/**
 * One-time repair script for staging: applies migration 0008_price_transparency_v2
 * and records it in drizzle.__drizzle_migrations.
 *
 * Why this exists: the migration's `when` timestamp in _journal.json was set to a
 * value earlier than migration 0007, causing Drizzle to sort it before an already-
 * applied migration and silently skip it. Migration 0009 ran normally, leaving the
 * DB in an inconsistent state (0009 applied, 0008 not applied).
 *
 * Run against staging:
 *   DATABASE_URL="<staging-external-url>" pnpm tsx scripts/repair-migration-0008.ts
 *
 * The external Render Postgres URL is the internal URL with the host suffix added:
 *   internal:  dpg-xxx-a/dbname
 *   external:  dpg-xxx-a.oregon-postgres.render.com/dbname
 */

import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import postgres from 'postgres'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const connectionString = process.env['DATABASE_URL']
if (!connectionString) {
  console.error('ERROR: DATABASE_URL env var is required')
  process.exit(1)
}

const MIGRATION_TAG = '0008_price_transparency_v2'
const MIGRATION_WHEN = 1778264000000 // corrected timestamp, between 0007 and 0009

const migrationPath = path.join(
  __dirname,
  '../packages/db/migrations',
  `${MIGRATION_TAG}.sql`,
)

const migrationSql = readFileSync(migrationPath, 'utf8')
const statements = migrationSql
  .split('--> statement-breakpoint')
  .map((stmt) => stmt.trim())
  .filter(Boolean)

const migrationHash = createHash('sha256')
  .update(statements.join('\n'))
  .digest('hex')

async function repair() {
  const isLocal = connectionString.includes('localhost') || connectionString.includes('127.0.0.1')
  const client = postgres(connectionString, {
    max: 1,
    ssl: isLocal ? false : 'require',
  })

  try {
    console.log(`Connecting to database...`)
    console.log(`Migration hash: ${migrationHash}`)

    // Check if already recorded
    const existing = await client`
      SELECT hash FROM drizzle.__drizzle_migrations WHERE hash = ${migrationHash}
    `
    if (existing.length > 0) {
      console.log('Migration 0008 is already recorded in __drizzle_migrations. Nothing to do.')
      return
    }

    // Check whether schema changes are already applied
    const tierColumn = await client`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'price_submissions' AND column_name = 'tier'
    `

    if (tierColumn.length > 0) {
      console.log('`tier` column already exists — schema is up to date.')
      console.log('Inserting migration record only...')
      await client`
        INSERT INTO drizzle.__drizzle_migrations (hash, created_at)
        VALUES (${migrationHash}, ${MIGRATION_WHEN})
      `
      console.log('Done.')
      return
    }

    console.log(`Applying ${statements.length} SQL statements...`)
    await client.begin(async (sql) => {
      for (const [idx, statement] of statements.entries()) {
        const preview = statement.substring(0, 72).replace(/\n/g, ' ')
        console.log(`  [${idx + 1}/${statements.length}] ${preview}...`)
        await sql.unsafe(statement)
      }

      await sql`
        INSERT INTO drizzle.__drizzle_migrations (hash, created_at)
        VALUES (${migrationHash}, ${MIGRATION_WHEN})
      `
      console.log('  Migration record inserted.')
    })

    console.log('Migration 0008 applied and recorded successfully.')

    // Verify
    const tierCheck = await client`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'price_submissions' AND column_name = 'tier'
    `
    if (tierCheck.length > 0) {
      console.log('Verification: `tier` column confirmed present.')
    } else {
      console.error('Verification FAILED: `tier` column not found after migration.')
      process.exit(1)
    }
  } finally {
    await client.end()
  }
}

repair().catch((err: unknown) => {
  console.error('Repair failed:', err)
  process.exit(1)
})
