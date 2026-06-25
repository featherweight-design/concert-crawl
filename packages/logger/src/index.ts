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

// Operational-failure reporter: emits a structured stdout log AND forwards
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
// 'error' fires `Sentry.captureMessage(event, { level: 'error', extra })`;
// severity 'warn' fires the same with `level: 'warning'`. The stdout log
// shape is preserved (existing `{event, ...extra}` JSON line) so log-search
// dashboards and alert rules built on the old pattern keep working.
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
  // Console side (stderr): preserve the historic structured-log JSON
  // shape and standardize the stream to stderr regardless of which
  // console method the callsite used to call. Severity drives the
  // method choice — 'error' → console.error, 'warn' → console.warn —
  // so dashboards / routers that distinguish severity can still do so
  // by stream-level filter, and tooling that scans stderr for both is
  // unaffected. (Some prior callsites used console.log for errors,
  // which was a stdout/stderr inconsistency this helper resolves.)
  // The 'severity' field is also included in the JSON payload so
  // log-search consumers can distinguish without re-deriving from
  // the event name.
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
