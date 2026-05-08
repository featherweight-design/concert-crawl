import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema/index.js'

const connectionString =
  process.env['DATABASE_URL'] ??
  'postgresql://postgres:postgres@localhost:5433/concert_crawl_db'

const isLocal =
  connectionString.includes('localhost') ||
  connectionString.includes('127.0.0.1')

// Disable prefetch for compatibility with Render's connection pooler
// Require SSL for non-local connections (Render enforces it)
const queryClient = postgres(connectionString, {
  prepare: false,
  ssl: isLocal ? false : 'require',
})

export const db = drizzle(queryClient, { schema })

export type Database = typeof db
