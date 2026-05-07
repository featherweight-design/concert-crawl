import { drizzle } from 'drizzle-orm/postgres-js'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import postgres from 'postgres'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const MIGRATIONS_FOLDER = path.resolve(
  __dirname,
  '../../../../../packages/db/migrations',
)

export async function setup(): Promise<void> {
  const testDbUrl =
    process.env['DATABASE_URL_TEST'] ??
    'postgresql://postgres:postgres@localhost:5433/concert_crawl_test'

  console.log('[test] Running migrations on test DB...')

  const client = postgres(testDbUrl, { max: 1 })
  const db = drizzle(client)

  await migrate(db, { migrationsFolder: MIGRATIONS_FOLDER })

  await client.end()

  console.log('[test] Migrations complete.')
}

export async function teardown(): Promise<void> {
  // Leave the DB in place for post-failure inspection
}
