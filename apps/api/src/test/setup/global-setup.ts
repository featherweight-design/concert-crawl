import { drizzle } from 'drizzle-orm/postgres-js'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import postgres from 'postgres'
import path from 'path'
import { fileURLToPath } from 'url'
import { resolveTestDbUrl } from './test-db.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const MIGRATIONS_FOLDER = path.resolve(
  __dirname,
  '../../../../../packages/db/migrations',
)

export async function setup(): Promise<void> {
  const testDbUrl = resolveTestDbUrl()
  const dbName = new URL(testDbUrl).pathname.replace(/^\//, '')
  // testDbUrl may come from DATABASE_URL_TEST (a system boundary); fail loudly
  // if it carries no database name rather than trying to CREATE DATABASE "".
  if (dbName === '') {
    throw new Error(
      `[test] Resolved test DB URL has no database name: ${testDbUrl}`,
    )
  }

  // Create the target DB if missing, via the postgres maintenance DB.
  const adminUrl = new URL(testDbUrl)
  adminUrl.pathname = '/postgres'
  const admin = postgres(adminUrl.toString(), { max: 1 })
  try {
    const existing = await admin<
      { datname: string }[]
    >`SELECT datname FROM pg_database WHERE datname = ${dbName}`
    if (existing.length === 0) {
      console.log(`[test] Creating test DB "${dbName}"...`)
      // dbName is derived from our own worktree path, but double any embedded
      // quote so a quoted identifier can't break out of the literal.
      const ident = dbName.replace(/"/g, '""')
      try {
        await admin.unsafe(`CREATE DATABASE "${ident}"`)
      } catch (error) {
        // 42P04 = duplicate_database: a concurrent runner created it between
        // our existence check and CREATE. Harmless — proceed to migrate.
        if (
          error instanceof Error &&
          'code' in error &&
          error.code === '42P04'
        ) {
          console.log(`[test] Test DB "${dbName}" already created by a peer.`)
        } else {
          throw error
        }
      }
    }
  } finally {
    await admin.end()
  }

  console.log('[test] Running migrations on test DB...')

  const client = postgres(testDbUrl, { max: 1 })
  const db = drizzle(client)

  try {
    await migrate(db, { migrationsFolder: MIGRATIONS_FOLDER })
    await client.end()
    console.log('[test] Migrations complete.')
  } catch (error) {
    console.error('[test] Migration failed:', error)
    await client.end()
    throw error
  }
}

export async function teardown(): Promise<void> {
  // Leave the DB in place for post-failure inspection
}
