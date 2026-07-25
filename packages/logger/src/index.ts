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
  /**
   * Arbitrary structured context. Forwarded to Sentry `extra` verbatim.
   *
   * Avoid key names containing `token`, `password`, `secret`, `auth`, or
   * `apikey` — Sentry's default data scrubbing matches those substrings and
   * nulls the value out, so the field arrives empty on the issue page.
   */
  [key: string]: unknown
}

export function reportFailure(report: FailureReport): void {
  // Console side: preserve the historic structured-log JSON shape. The
  // helper standardizes onto stderr — callsites that previously used
  // `console.log` (stdout) now route through `console.error`; callsites
  // that used `console.warn` keep the same stream. Both methods write to
  // stderr in Node, so the severity distinction is NOT a stdout-vs-stderr
  // distinction — it's encoded in the console method (warn vs error,
  // which Pino-style log aggregators can tier on) and in the explicit
  // `severity` field on the JSON payload (which log-search filters and
  // dashboards key off). The stdout→stderr migration is the only behavior
  // change for previously-`console.log` callsites; downstream consumers
  // keyed on the structured `event:` field are unaffected.
  //
  // This function is called from failure-handling paths — including
  // `catch` blocks — so it must never throw. JSON.stringify can fail on
  // circular references or BigInt values in `extra`, and the Sentry SDK
  // can in principle raise; both are wrapped so a logging failure cannot
  // mask the original error.
  const { event, severity, ...extra } = report
  try {
    let json: string
    try {
      json = JSON.stringify(report)
    } catch {
      // Fall back to a minimal payload that's guaranteed to serialize.
      // We lose `extra` here but preserve the event identifier so the
      // original failure is still visible in logs/dashboards.
      json = JSON.stringify({ event, severity, extraSerializationFailed: true })
    }
    if (severity === 'error') {
      console.error(json)
    } else {
      console.warn(json)
    }
  } catch {
    // console.error/warn themselves shouldn't throw, but if the runtime
    // is hostile (e.g. console patched to throw in tests) we still
    // refuse to propagate.
  }

  // Sentry side: forward as a captureMessage. The 'severity' and 'event'
  // fields are unpacked off the extra payload because they're already
  // represented in the message + level; everything else flows as 'extra'
  // context (visible on the Sentry issue page). Sentry.captureMessage
  // is a no-op when Sentry isn't initialized but is wrapped defensively
  // in case the SDK ever raises — see the no-throw contract above.
  try {
    Sentry.captureMessage(event, {
      level: severity === 'error' ? 'error' : 'warning',
      extra,
    })
  } catch {
    // Swallow per the no-throw contract.
  }
}
