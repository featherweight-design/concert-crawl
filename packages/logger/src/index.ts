import pino, { type Logger } from 'pino'
import * as Sentry from '@sentry/node'
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

// Operational-failure reporter: emits a structured stderr log AND forwards
// to Sentry. Crawler/API code historically called
// `console.log(JSON.stringify({event: '...', ...}))` directly for operational
// failures (LLM tool-call invalidation, email send errors, alert pipeline
// crashes). Those logs were captured by Render's log aggregator but never
// reached Sentry — the Sentry Node SDK does not auto-capture `console.log`
// (only unhandled exceptions and, with `captureConsoleIntegration`,
// `console.error`). The Red Rocks went-dark incident on 2026-06-25 made
// this gap concrete: the `llm.invalid_tool_input` failure that silently
// caused 0-event extractions for hours was invisible in Sentry.
//
// `reportFailure` is the new canonical helper for those callsites. Severity
// 'error' fires `Sentry.captureMessage(event, { level: 'error', extra })`
// and writes the JSON line via `console.error`; severity 'warn' fires the
// same with `level: 'warning'` and writes via `console.warn`. Both console
// methods write to stderr in Node — the severity distinction is preserved
// via the explicit `severity` field on the JSON payload (log-search
// consumers can filter on that) and via the console method itself (some
// log routers / Pino-style aggregators distinguish on method, not stream).
// The structured `{event, ...extra}` JSON shape is preserved verbatim so
// existing search dashboards and alert rules keep working.
//
// Sentry.captureMessage is a no-op when Sentry has not been initialized in
// the current process (e.g. local dev, unit tests), so callers do not need
// to gate on environment.
export type FailureSeverity = 'error' | 'warn'

export interface FailureReport {
  /** Structured event identifier, e.g. 'llm.invalid_tool_input'. */
  event: string
  /** Routing severity. 'error' maps to Sentry level 'error'; 'warn' maps to 'warning'. */
  severity: FailureSeverity
  /** Arbitrary structured context. Forwarded to Sentry `extra` verbatim. */
  [key: string]: unknown
}

export function reportFailure(report: FailureReport): void {
  // Console side: preserve the historic structured-log JSON shape and
  // standardize on stderr regardless of which console method the original
  // callsite used. Severity drives the method choice — 'error' →
  // console.error, 'warn' → console.warn — so routers / Pino-style log
  // aggregators that distinguish on console method (rather than stream)
  // can still tier severity, and the explicit `severity` field on the
  // JSON payload covers the rest (log-search filters, dashboards). Both
  // console.warn and console.error write to stderr in Node, so this is
  // NOT a stdout-vs-stderr distinction; the prior comment wording on
  // that was wrong.
  const json = JSON.stringify(report)
  if (report.severity === 'error') {
    console.error(json)
  } else {
    console.warn(json)
  }

  // Sentry side: forward as a captureMessage. The 'severity' and 'event'
  // fields are unpacked off the extra payload because they're already
  // represented in the message + level; everything else flows as 'extra'
  // context (visible on the Sentry issue page).
  const { event, severity, ...extra } = report
  Sentry.captureMessage(event, {
    level: severity === 'error' ? 'error' : 'warning',
    extra,
  })
}
