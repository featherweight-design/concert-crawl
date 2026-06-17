import { drizzle } from 'drizzle-orm/postgres-js'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import postgres from 'postgres'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Mirrors apps/api/src/test/setup/global-setup.ts — run migrations against
// the shared test DB before any integration test executes. We deliberately
// hit the same Postgres + same database used by the API integration tests so
// the schema is migrated once per test run regardless of which package
// owns the suite.
const MIGRATIONS_FOLDER = path.resolve(
  __dirname,
  '../../../../../packages/db/migrations',
)

export async function setup(): Promise<void> {
  const testDbUrl =
    process.env['DATABASE_URL_TEST'] ??
    'postgresql://postgres:postgres@localhost:5433/concert_crawl_test'

  console.log('[crawler-test] Running migrations on test DB...')

  const client = postgres(testDbUrl, { max: 1 })
  const dbInstance = drizzle(client)

  try {
    await migrate(dbInstance, { migrationsFolder: MIGRATIONS_FOLDER })
    await client.end()
    console.log('[crawler-test] Migrations complete.')
  } catch (error) {
    console.error('[crawler-test] Migration failed:', error)
    await client.end()
    throw error
  }
}

export async function teardown(): Promise<void> {
  // Leave the DB in place for post-failure inspection.
}
