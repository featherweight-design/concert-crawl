import { afterAll, afterEach, beforeAll, vi } from 'vitest'
import { drainBackgroundTasks } from '../../lib/background-tasks.js'

// Integration tests drive the API in-memory via `app.request`, so no test needs
// real outbound HTTP. Background tasks, however, do: `detectTicketVendor` fetches
// the venue's `websiteUrl` with an 8s timeout. Because `afterEach` now awaits
// those tasks (see below), an unstubbed fetch would make the suite hit the
// network — slow, flaky, and dependent on outbound access. Reject fetch up front
// so background network calls fail fast; the tasks own their error handling
// (`detectTicketVendor` catches and returns 'unknown'), so the drain stays quick.
// `vi.stubGlobal` swaps in the fake (its value is untyped, so a zero-arg reject
// is fine); `vi.unstubAllGlobals()` in afterAll restores the real fetch.
beforeAll(() => {
  vi.stubGlobal('fetch', () =>
    Promise.reject(
      new Error('Network access is disabled in integration tests'),
    ),
  )
})

afterAll(() => {
  vi.unstubAllGlobals()
})

// Route handlers kick off fire-and-forget work (vendor detection, price
// pipelines, invite emails) that continues after the response is sent. Awaiting
// every in-flight task after each test guarantees no background DB write commits
// during a later test's setup window — the cross-file pollution behind #941.
afterEach(async () => {
  await drainBackgroundTasks()
})
