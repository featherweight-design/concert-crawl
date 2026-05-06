import pino, { type Logger } from 'pino'

// Extend Hono's context type map so c.get('requestId') is typed everywhere.
declare module 'hono' {
  interface ContextVariableMap {
    requestId: string
  }
}

export type { Logger }

export function createLogger(name: string): Logger {
  const level = process.env['LOG_LEVEL'] ?? 'info'

  // Skip pretty-printing in tests (avoids worker thread spawning issues)
  // and in production (raw JSON is captured by Render's log aggregator).
  const isProduction = process.env['NODE_ENV'] === 'production'
  const isTest = process.env['NODE_ENV'] === 'test'

  const transport =
    !isProduction && !isTest
      ? pino.transport({ target: 'pino-pretty', options: { colorize: true } })
      : undefined

  return pino({ name, level }, transport)
}
