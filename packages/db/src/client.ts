import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema/index.js'
import { poolOptions } from './connection.js'

const connectionString =
  process.env['DATABASE_URL'] ??
  'postgresql://postgres:postgres@localhost:5433/concert_crawl_db'

// SSL, prepared statements and the two socket timeouts all live in
// `poolOptions` — see the note there on why the pool must retire a socket
// before Neon's 300s suspend does.
const queryClient = postgres(connectionString, poolOptions(connectionString))

export const db = drizzle(queryClient, { schema })

export type Database = typeof db
