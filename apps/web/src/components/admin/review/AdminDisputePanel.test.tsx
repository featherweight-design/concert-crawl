// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { type ReactElement, type ReactNode } from 'react'
import {
  render,
  screen,
  fireEvent,
  waitFor,
  cleanup,
} from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ContestDetailData } from '@/lib/queries/admin-contests'

// ───── Mocks ─────────────────────────────────────────────────────────────────

const mockGetToken = vi.fn().mockResolvedValue('test-token')
vi.mock('@clerk/nextjs', () => ({
  useAuth: () => ({ getToken: mockGetToken }),
}))

const mockRouterPush = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockRouterPush, refresh: vi.fn() }),
}))

const mockApiGet = vi.fn()
const mockApiPost = vi.fn()
// ApiError class kept inside the vi.mock factory so vi.mock's hoisting
// can't trip on top-level access. The mocked class carries status +
// code + message so `instanceof ApiError` checks inside
// AdminDisputePanel narrow correctly (404 path, mutation error path).
vi.mock('@/lib/api', () => {
  class ApiError extends Error {
    constructor(
      public readonly status: number,
      message: string,
      public readonly code?: string,
    ) {
      super(message)
      this.name = 'ApiError'
    }
  }
  return {
    apiClient: {
      get: (...args: unknown[]) => mockApiGet(...args),
      post: (...args: unknown[]) => mockApiPost(...args),
    },
    ApiError,
  }
})

// Re-import the mocked ApiError for use in test factories. Importing
// AFTER the vi.mock call ensures we receive the mock's class, not the
// real one.
import { ApiError as MockApiError } from '@/lib/api'

import { AdminDisputePanel } from './AdminDisputePanel'

// jsdom + Vitest do not ship the @testing-library/jest-dom matchers in
// this repo (memory:feedback_no_type_casting bans `as` casts but the
// existing tests still rely on raw DOM property reads). Helpers below
// keep the assertions reading like jest-dom without an `as` shim.
const buttonByName = (name: string): HTMLButtonElement => {
  const btn = screen.getByRole('button', { name })
  if (!(btn instanceof HTMLButtonElement)) {
    throw new Error(`Expected button "${name}" to be an HTMLButtonElement`)
  }
  return btn
}

// ───── Helpers ───────────────────────────────────────────────────────────────

const buildContest = (
  overrides: Partial<ContestDetailData> = {},
): ContestDetailData => ({
  contestId: 'c1',
  eventId: 'e1',
  eventTitle: 'Electric Callboy',
  venueName: 'Mission Ballroom',
  eventDate: '2027-08-30',
  tier: 'GA',
  sourceCategory: 'standard',
  parent: {
    id: 'parent-1',
    priceMin: '48',
    priceMax: '58',
    vendor: 'AXS',
    submitter: { userId: 'u-1', handle: 'hugh' },
    confirms: { fans: 2, admin: 0 },
    observedAt: '2026-06-20T00:00:00Z',
    lastUpdatedAt: '2026-06-20T00:00:00Z',
    note: null,
    status: 'disputed',
    archivedReason: null,
  },
  counter: {
    id: 'counter-1',
    priceMin: '65',
    priceMax: '80',
    vendor: 'AXS',
    submitter: { userId: 'u-2', handle: 'kel' },
    confirms: { fans: 1, admin: 0 },
    observedAt: '2026-06-22T00:00:00Z',
    note: null,
    status: 'pending',
    lastAdminActionAt: null,
    lastAdminActionKind: null,
    archivedReason: null,
  },
  filedAt: '2026-06-22T00:00:00Z',
  history: [],
  ...overrides,
})

const renderWithClient = (ui: ReactElement) => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
  return render(ui, { wrapper: Wrapper })
}

beforeEach(() => {
  mockApiGet.mockReset()
  mockApiPost.mockReset()
  mockRouterPush.mockReset()
  mockGetToken.mockReset()
  mockGetToken.mockResolvedValue('test-token')
  cleanup()
})

// ───── Tests ─────────────────────────────────────────────────────────────────

describe('AdminDisputePanel', () => {
  it('renders the loading state on initial mount', () => {
    // Pending fetch — never resolves during this test.
    mockApiGet.mockReturnValue(new Promise(() => {}))
    renderWithClient(<AdminDisputePanel contestId="c1" />)
    expect(screen.getByText('Loading contest…')).toBeTruthy()
  })

  it('renders the error state with a retry button when the fetch fails', async () => {
    mockApiGet.mockRejectedValue(new Error('boom'))
    renderWithClient(<AdminDisputePanel contestId="c1" />)
    await waitFor(() => {
      expect(screen.getByText('Failed to load contest.')).toBeTruthy()
    })
    expect(screen.getByRole('button', { name: /retry/i })).toBeTruthy()
  })

  it('renders both AdminEntry cards (parent + counter) once data loads', async () => {
    mockApiGet.mockResolvedValue(buildContest())
    renderWithClient(<AdminDisputePanel contestId="c1" />)
    await waitFor(() => {
      expect(screen.getByText('hugh')).toBeTruthy()
    })
    expect(screen.getByText('kel')).toBeTruthy()
  })

  it('renders the event title and venue in the header', async () => {
    mockApiGet.mockResolvedValue(buildContest())
    renderWithClient(<AdminDisputePanel contestId="c1" />)
    await waitFor(() => {
      // Header concatenates `{eventTitle} · {venueName} · {eventDate}` —
      // assert each segment renders in the same heading element.
      expect(screen.getByText(/Electric Callboy/)).toBeTruthy()
    })
    expect(screen.getByText(/Mission Ballroom/)).toBeTruthy()
  })

  it('disables all three action buttons when reason is empty', async () => {
    mockApiGet.mockResolvedValue(buildContest())
    renderWithClient(<AdminDisputePanel contestId="c1" />)
    await waitFor(() => {
      expect(screen.getByText('hugh')).toBeTruthy()
    })
    expect(buttonByName('Need more info').disabled).toBe(true)
    expect(buttonByName('Keep original').disabled).toBe(true)
    expect(buttonByName('Promote counter').disabled).toBe(true)
  })

  it('keeps buttons disabled when reason is shorter than 10 characters', async () => {
    mockApiGet.mockResolvedValue(buildContest())
    renderWithClient(<AdminDisputePanel contestId="c1" />)
    await waitFor(() => {
      expect(screen.getByText('hugh')).toBeTruthy()
    })
    fireEvent.change(screen.getByLabelText(/reason/i), {
      target: { value: 'short' },
    })
    expect(buttonByName('Keep original').disabled).toBe(true)
  })

  it('enables all three action buttons once reason >= 10 characters', async () => {
    mockApiGet.mockResolvedValue(buildContest())
    renderWithClient(<AdminDisputePanel contestId="c1" />)
    await waitFor(() => {
      expect(screen.getByText('hugh')).toBeTruthy()
    })
    fireEvent.change(screen.getByLabelText(/reason/i), {
      target: { value: 'this is a long enough reason' },
    })
    expect(buttonByName('Need more info').disabled).toBe(false)
    expect(buttonByName('Keep original').disabled).toBe(false)
    expect(buttonByName('Promote counter').disabled).toBe(false)
  })

  it('updates the character count as the user types', async () => {
    mockApiGet.mockResolvedValue(buildContest())
    renderWithClient(<AdminDisputePanel contestId="c1" />)
    await waitFor(() => {
      expect(screen.getByText('hugh')).toBeTruthy()
    })
    // Empty initial state — 0 / 2000.
    expect(screen.getByText('0 / 2000')).toBeTruthy()
    fireEvent.change(screen.getByLabelText(/reason/i), {
      target: { value: 'twelve chars' },
    })
    expect(screen.getByText('12 / 2000')).toBeTruthy()
  })

  it('caps the reason textarea at 2000 characters via maxLength', async () => {
    mockApiGet.mockResolvedValue(buildContest())
    renderWithClient(<AdminDisputePanel contestId="c1" />)
    await waitFor(() => {
      expect(screen.getByText('hugh')).toBeTruthy()
    })
    const textarea = screen.getByLabelText(/reason/i)
    if (!(textarea instanceof HTMLTextAreaElement)) {
      throw new Error('Expected a textarea element for the reason field')
    }
    expect(textarea.maxLength).toBe(2000)
  })

  // R2-1 regression: spec §6.3 + plan locks reason at min(10).max(2000).
  // The UI previously capped at 280 (confused with the `note` field),
  // blocking admins from writing the long paragraphs the backend accepts.
  // Pin the new bound so we don't regress: a 280-character reason is now
  // ACCEPTED (not rejected), and a reason at the 2000 char ceiling is
  // also accepted.
  it('accepts a 280-character reason (no longer rejected as too long)', async () => {
    mockApiGet.mockResolvedValue(buildContest())
    mockApiPost.mockResolvedValue({ success: true })
    renderWithClient(<AdminDisputePanel contestId="c1" />)
    await waitFor(() => {
      expect(screen.getByText('hugh')).toBeTruthy()
    })
    const longReason = 'x'.repeat(280)
    fireEvent.change(screen.getByLabelText(/reason/i), {
      target: { value: longReason },
    })
    // Buttons enabled — the 280-char reason clears the min(10) gate and
    // does NOT trip the (now 2000) max.
    expect(buttonByName('Keep original').disabled).toBe(false)
    fireEvent.click(screen.getByRole('button', { name: 'Keep original' }))
    await waitFor(() => {
      expect(mockApiPost).toHaveBeenCalled()
    })
    const [, , body] = mockApiPost.mock.calls[0] ?? []
    expect(body).toEqual({ resolution: 'parent_wins', reason: longReason })
  })

  it('Keep original calls resolve with parent_wins and the reason', async () => {
    mockApiGet.mockResolvedValue(buildContest())
    mockApiPost.mockResolvedValue({ success: true })
    renderWithClient(<AdminDisputePanel contestId="c1" />)
    await waitFor(() => {
      expect(screen.getByText('hugh')).toBeTruthy()
    })
    fireEvent.change(screen.getByLabelText(/reason/i), {
      target: { value: 'keeping the original because…' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Keep original' }))
    await waitFor(() => {
      expect(mockApiPost).toHaveBeenCalled()
    })
    const [path, , body] = mockApiPost.mock.calls[0] ?? []
    expect(path).toBe('/v1/admin/contests/prices/c1/resolve')
    expect(body).toEqual({
      resolution: 'parent_wins',
      reason: 'keeping the original because…',
    })
  })

  it('Promote counter calls resolve with challenger_wins and the reason', async () => {
    mockApiGet.mockResolvedValue(buildContest())
    mockApiPost.mockResolvedValue({ success: true })
    renderWithClient(<AdminDisputePanel contestId="c1" />)
    await waitFor(() => {
      expect(screen.getByText('hugh')).toBeTruthy()
    })
    fireEvent.change(screen.getByLabelText(/reason/i), {
      target: { value: 'promoting the counter because…' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Promote counter' }))
    await waitFor(() => {
      expect(mockApiPost).toHaveBeenCalled()
    })
    const [path, , body] = mockApiPost.mock.calls[0] ?? []
    expect(path).toBe('/v1/admin/contests/prices/c1/resolve')
    expect(body).toEqual({
      resolution: 'challenger_wins',
      reason: 'promoting the counter because…',
    })
  })

  it('Need more info calls the defer endpoint with the reason', async () => {
    mockApiGet.mockResolvedValue(buildContest())
    mockApiPost.mockResolvedValue({ success: true })
    renderWithClient(<AdminDisputePanel contestId="c1" />)
    await waitFor(() => {
      expect(screen.getByText('hugh')).toBeTruthy()
    })
    fireEvent.change(screen.getByLabelText(/reason/i), {
      target: { value: 'need to ask the submitter…' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Need more info' }))
    await waitFor(() => {
      expect(mockApiPost).toHaveBeenCalled()
    })
    const [path, , body] = mockApiPost.mock.calls[0] ?? []
    expect(path).toBe('/v1/admin/contests/prices/c1/defer')
    expect(body).toEqual({ reason: 'need to ask the submitter…' })
  })

  it('navigates to /admin/review?tab=contests after a successful resolve', async () => {
    mockApiGet.mockResolvedValue(buildContest())
    mockApiPost.mockResolvedValue({ success: true })
    renderWithClient(<AdminDisputePanel contestId="c1" />)
    await waitFor(() => {
      expect(screen.getByText('hugh')).toBeTruthy()
    })
    fireEvent.change(screen.getByLabelText(/reason/i), {
      target: { value: 'keeping the original because…' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Keep original' }))
    await waitFor(() => {
      expect(mockRouterPush).toHaveBeenCalledWith('/admin/review?tab=contests')
    })
  })

  it('navigates to /admin/review?tab=contests after a successful defer', async () => {
    mockApiGet.mockResolvedValue(buildContest())
    mockApiPost.mockResolvedValue({ success: true })
    renderWithClient(<AdminDisputePanel contestId="c1" />)
    await waitFor(() => {
      expect(screen.getByText('hugh')).toBeTruthy()
    })
    fireEvent.change(screen.getByLabelText(/reason/i), {
      target: { value: 'need to ask the submitter…' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Need more info' }))
    await waitFor(() => {
      expect(mockRouterPush).toHaveBeenCalledWith('/admin/review?tab=contests')
    })
  })

  it('surfaces the mutation error inline when resolve rejects (generic fallback)', async () => {
    mockApiGet.mockResolvedValue(buildContest())
    // Reject with an error that has no readable message so the panel
    // falls back to the generic copy. (Errors with messages flow
    // through; see the ApiError-specific test below.)
    mockApiPost.mockRejectedValue(new Error(''))
    renderWithClient(<AdminDisputePanel contestId="c1" />)
    await waitFor(() => {
      expect(screen.getByText('hugh')).toBeTruthy()
    })
    fireEvent.change(screen.getByLabelText(/reason/i), {
      target: { value: 'keeping the original because…' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Keep original' }))
    await waitFor(() => {
      expect(
        screen.getByText('That action failed. Please try again.'),
      ).toBeTruthy()
    })
    // Failed mutation does NOT navigate.
    expect(mockRouterPush).not.toHaveBeenCalled()
  })

  // Read-only states: counter.status !== 'pending' OR parent.status ===
  // 'archived' → no reason field, no buttons, banner shows.

  it('renders read-only banner when counter.status is corroborated', async () => {
    mockApiGet.mockResolvedValue(
      buildContest({
        parent: { ...buildContest().parent, status: 'archived' },
        counter: {
          ...buildContest().counter,
          status: 'corroborated',
        },
      }),
    )
    renderWithClient(<AdminDisputePanel contestId="c1" />)
    await waitFor(() => {
      expect(screen.getByText(/already resolved/i)).toBeTruthy()
    })
    expect(screen.queryByLabelText(/reason/i)).toBeNull()
    expect(screen.queryByRole('button', { name: 'Keep original' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Promote counter' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Need more info' })).toBeNull()
  })

  it('renders read-only banner when parent.status is archived', async () => {
    mockApiGet.mockResolvedValue(
      buildContest({
        parent: { ...buildContest().parent, status: 'archived' },
        counter: { ...buildContest().counter, status: 'pending' },
      }),
    )
    renderWithClient(<AdminDisputePanel contestId="c1" />)
    await waitFor(() => {
      expect(screen.getByText(/already resolved/i)).toBeTruthy()
    })
    expect(screen.queryByLabelText(/reason/i)).toBeNull()
  })

  it('marks the counter as winner when counter status is corroborated', async () => {
    mockApiGet.mockResolvedValue(
      buildContest({
        parent: { ...buildContest().parent, status: 'archived' },
        counter: {
          ...buildContest().counter,
          status: 'corroborated',
        },
      }),
    )
    renderWithClient(<AdminDisputePanel contestId="c1" />)
    await waitFor(() => {
      expect(screen.getByText(/winner/i)).toBeTruthy()
    })
  })

  it('still renders both AdminEntry cards in the read-only state', async () => {
    mockApiGet.mockResolvedValue(
      buildContest({
        parent: { ...buildContest().parent, status: 'archived' },
        counter: {
          ...buildContest().counter,
          status: 'corroborated',
        },
      }),
    )
    renderWithClient(<AdminDisputePanel contestId="c1" />)
    await waitFor(() => {
      // Both submitter handles must still surface so the admin can audit
      // history.
      expect(screen.getByText('hugh')).toBeTruthy()
    })
    expect(screen.getByText('kel')).toBeTruthy()
  })

  it('renders the deferred chip when counter.lastAdminActionKind is "defer"', async () => {
    mockApiGet.mockResolvedValue(
      buildContest({
        counter: {
          ...buildContest().counter,
          status: 'pending',
          lastAdminActionKind: 'defer',
          lastAdminActionAt: '2026-06-22T12:00:00Z',
        },
      }),
    )
    renderWithClient(<AdminDisputePanel contestId="c1" />)
    await waitFor(() => {
      expect(screen.getByText(/previously deferred/i)).toBeTruthy()
    })
    // Deferred contests stay actionable — reason field + buttons render.
    expect(screen.getByLabelText(/reason/i)).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Promote counter' })).toBeTruthy()
  })

  // G1 — read-only banner surfaces the archived side's archivedReason
  // so admins re-visiting a resolved contest see WHY the side was
  // archived (spec §4 line 245).
  it('surfaces the counter archivedReason in the read-only banner', async () => {
    mockApiGet.mockResolvedValue(
      buildContest({
        parent: {
          ...buildContest().parent,
          status: 'corroborated',
        },
        counter: {
          ...buildContest().counter,
          status: 'archived',
          archivedReason: 'Original held — box-office confirmed.',
        },
      }),
    )
    renderWithClient(<AdminDisputePanel contestId="c1" />)
    await waitFor(() => {
      expect(screen.getByText(/already resolved/i)).toBeTruthy()
    })
    expect(screen.getByText('Admin reason')).toBeTruthy()
    expect(
      screen.getByText(/original held — box-office confirmed/i),
    ).toBeTruthy()
  })

  it('surfaces the parent archivedReason when parent is the archived side', async () => {
    mockApiGet.mockResolvedValue(
      buildContest({
        parent: {
          ...buildContest().parent,
          status: 'archived',
          archivedReason: 'Counter promoted — checkout screenshot verified.',
        },
        counter: {
          ...buildContest().counter,
          status: 'corroborated',
        },
      }),
    )
    renderWithClient(<AdminDisputePanel contestId="c1" />)
    await waitFor(() => {
      expect(screen.getByText(/already resolved/i)).toBeTruthy()
    })
    expect(screen.getByText('Admin reason')).toBeTruthy()
    expect(screen.getByText(/checkout screenshot verified/i)).toBeTruthy()
  })

  // G2 — server-supplied error message surfaces in the inline alert
  // when an ApiError carries a usable message.
  it('surfaces the server error message when mutation rejects with ApiError', async () => {
    mockApiGet.mockResolvedValue(buildContest())
    mockApiPost.mockRejectedValue(
      new MockApiError(
        409,
        'Parent tier GA does not match challenger tier VIP.',
        'precondition_failed',
      ),
    )
    renderWithClient(<AdminDisputePanel contestId="c1" />)
    await waitFor(() => {
      expect(screen.getByText('hugh')).toBeTruthy()
    })
    fireEvent.change(screen.getByLabelText(/reason/i), {
      target: { value: 'keeping the original because…' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Keep original' }))
    await waitFor(() => {
      expect(
        screen.getByText(/parent tier GA does not match challenger tier VIP/i),
      ).toBeTruthy()
    })
    // The generic fallback copy must NOT appear when a specific message
    // is available.
    expect(
      screen.queryByText('That action failed. Please try again.'),
    ).toBeNull()
  })

  // G4 — mutation error alert renders below the reason textarea, NOT
  // above it. The action button row sits below the alert.
  it('renders mutation error alert below the textarea and above the action row', async () => {
    mockApiGet.mockResolvedValue(buildContest())
    mockApiPost.mockRejectedValue(new Error('mutation boom'))
    renderWithClient(<AdminDisputePanel contestId="c1" />)
    await waitFor(() => {
      expect(screen.getByText('hugh')).toBeTruthy()
    })
    fireEvent.change(screen.getByLabelText(/reason/i), {
      target: { value: 'keeping the original because…' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Keep original' }))
    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeTruthy()
    })
    const alert = screen.getByRole('alert')
    const textarea = screen.getByLabelText(/reason/i)
    const keepBtn = screen.getByRole('button', { name: 'Keep original' })
    // DOCUMENT_POSITION_FOLLOWING = 4 — alert appears AFTER the textarea
    // in document order (i.e. below it).
    expect(
      textarea.compareDocumentPosition(alert) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
    // And BEFORE the action button row.
    expect(
      keepBtn.compareDocumentPosition(alert) & Node.DOCUMENT_POSITION_PRECEDING,
    ).toBeTruthy()
  })

  // G5 — 404 differentiation renders the contest-specific notFound copy
  // without a retry affordance.
  it('renders the notFound copy when the detail fetch rejects with 404', async () => {
    mockApiGet.mockRejectedValue(new MockApiError(404, 'Contest not found'))
    renderWithClient(<AdminDisputePanel contestId="c1" />)
    await waitFor(() => {
      expect(screen.getByText('Contest not found.')).toBeTruthy()
    })
    // A 404 has no retry button — retrying a hard-deleted contest never
    // succeeds.
    expect(screen.queryByRole('button', { name: /retry/i })).toBeNull()
  })

  // R9-1/2/3 — surrounding whitespace must be trimmed before the reason
  // hits the API so persisted rationale matches the validation semantics
  // (the disabled-state check uses `reason.trim()`). Without the trim, an
  // admin who types valid content with leading/trailing whitespace would
  // persist that whitespace into the audit log even though the UI treats
  // it as semantically invisible.
  it('trims whitespace from reason before sending to API on resolve', async () => {
    mockApiGet.mockResolvedValue(buildContest())
    mockApiPost.mockResolvedValue({ success: true })
    renderWithClient(<AdminDisputePanel contestId="c1" />)
    await waitFor(() => {
      expect(screen.getByText('hugh')).toBeTruthy()
    })
    fireEvent.change(screen.getByLabelText(/reason/i), {
      target: { value: '   keeping the original because…   ' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Keep original' }))
    await waitFor(() => {
      expect(mockApiPost).toHaveBeenCalled()
    })
    const [, , body] = mockApiPost.mock.calls[0] ?? []
    expect(body).toEqual({
      resolution: 'parent_wins',
      reason: 'keeping the original because…',
    })
  })

  it('trims whitespace from reason before sending to API on promote', async () => {
    mockApiGet.mockResolvedValue(buildContest())
    mockApiPost.mockResolvedValue({ success: true })
    renderWithClient(<AdminDisputePanel contestId="c1" />)
    await waitFor(() => {
      expect(screen.getByText('hugh')).toBeTruthy()
    })
    fireEvent.change(screen.getByLabelText(/reason/i), {
      target: { value: '   promoting the counter because…   ' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Promote counter' }))
    await waitFor(() => {
      expect(mockApiPost).toHaveBeenCalled()
    })
    const [, , body] = mockApiPost.mock.calls[0] ?? []
    expect(body).toEqual({
      resolution: 'challenger_wins',
      reason: 'promoting the counter because…',
    })
  })

  it('trims whitespace from reason before sending to API on defer', async () => {
    mockApiGet.mockResolvedValue(buildContest())
    mockApiPost.mockResolvedValue({ success: true })
    renderWithClient(<AdminDisputePanel contestId="c1" />)
    await waitFor(() => {
      expect(screen.getByText('hugh')).toBeTruthy()
    })
    fireEvent.change(screen.getByLabelText(/reason/i), {
      target: { value: '   need to ask the submitter…   ' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Need more info' }))
    await waitFor(() => {
      expect(mockApiPost).toHaveBeenCalled()
    })
    const [, , body] = mockApiPost.mock.calls[0] ?? []
    expect(body).toEqual({ reason: 'need to ask the submitter…' })
  })

  // G5 — non-404 errors keep the generic banner + retry behavior.
  it('renders the generic error banner with retry for non-404 errors', async () => {
    mockApiGet.mockRejectedValue(new MockApiError(500, 'server boom'))
    renderWithClient(<AdminDisputePanel contestId="c1" />)
    await waitFor(() => {
      expect(screen.getByText('Failed to load contest.')).toBeTruthy()
    })
    expect(screen.getByRole('button', { name: /retry/i })).toBeTruthy()
  })
})
