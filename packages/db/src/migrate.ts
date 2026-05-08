import { drizzle } from 'drizzle-orm/postgres-js'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import postgres from 'postgres'
import path from 'path'
import { fileURLToPath } from 'url'
import { isLocalConnectionString } from './connection.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const connectionString =
  process.env['DATABASE_URL'] ??
  'postgresql://postgres:postgres@localhost:5433/concert_crawl_db'

const migrationClient = postgres(connectionString, {
  max: 1,
  ssl: isLocalConnectionString(connectionString) ? false : 'require',
})

async function runMigrations() {
  const db = drizzle(migrationClient)
  console.warn('Running migrations...')
  await migrate(db, {
    migrationsFolder: path.join(__dirname, '..', 'migrations'),
  })
  console.warn('Migrations complete.')
  await migrationClient.end()
}

runMigrations().catch((err) => {
  console.error('Migration failed:', err)
  process.exit(1)
})
