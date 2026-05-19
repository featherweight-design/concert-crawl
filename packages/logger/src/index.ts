import pino, { type Logger } from 'pino'
import type {} from 'hono'

// Extend Hono's context type map so c.get('requestId') is typed everywhere.
declare module 'hono' {
  interface ContextVariableMap {
    requestId: string
  }
}

export type { Logger }
export { requestLogger } from './middleware.js'

export function createLogger(name: string): Logger {
  const level = process.env['LOG_LEVEL'] ?? 'info'

  // Skip pretty-printing in tests (pino-pretty spawns a ThreadStream that
  // causes instability in Vitest) and in production (raw JSON is captured
  // by Render's log aggregator).
  const isProduction = process.env['NODE_ENV'] === 'production'
  const isTest = process.env['NODE_ENV'] === 'test'

  // pino.transport returns ThreadStream (typed as `any` in pino's own .d.ts),
  // so we annotate explicitly to keep the call-site type-safe.
  const transport: pino.DestinationStream | undefined =
    !isProduction && !isTest
      ? pino.transport({ target: 'pino-pretty', options: { colorize: true } })
      : undefined

  return pino({ name, level }, transport)
}
