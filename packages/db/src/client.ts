import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema/index.js'

const connectionString =
  process.env['DATABASE_URL'] ?? 'postgresql://postgres:postgres@localhost:5433/concert_crawl_db'

// Disable prefetch for compatibility with Render's connection pooler
const queryClient = postgres(connectionString, { prepare: false })

export const db = drizzle(queryClient, { schema })

export type Database = typeof db
