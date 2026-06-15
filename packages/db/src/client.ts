import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema/index.js'
import { isLocalConnectionString } from './connection.js'

const connectionString =
  process.env['DATABASE_URL'] ??
  'postgresql://postgres:postgres@localhost:5433/concert_crawl_db'

// Disable prepared statements for compatibility with serverless connection
// poolers (Neon's pooler, Render's pgbouncer). Require SSL for non-local connections.
const queryClient = postgres(connectionString, {
  prepare: false,
  ssl: isLocalConnectionString(connectionString) ? false : 'require',
})

export const db = drizzle(queryClient, { schema })

export type Database = typeof db
