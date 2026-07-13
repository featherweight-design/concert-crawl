// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  render,
  screen,
  cleanup,
  fireEvent,
  type RenderResult,
} from '@testing-library/react'
import { type ReactElement, type ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { InboxItem, InboxResponse } from '@concert-crawl/types'
import type * as UseAdminInboxModule from '@/lib/queries/use-admin-inbox'

// The query hook has its own coverage; here we mock it so the client's
// filter / mark-all branches run against a fixed payload.
const mockUseAdminInbox = vi.fn<(...args: unknown[]) => unknown>()
const mockMarkAllMutate = vi.fn()
const mockMarkReadMutate = vi.fn()
vi.mock('@/lib/queries/use-admin-inbox', async () => {
  const actual = await vi.importActual<typeof UseAdminInboxModule>(
    '@/lib/queries/use-admin-inbox',
  )
  return {
    ...actual,
    useAdminInbox: (...args: unknown[]) => mockUseAdminInbox(...args),
    useMarkInboxRead: () => ({
      mutate: mockMarkReadMutate,
      isPending: false,
    }),
    useMarkAllInboxRead: () => ({
      mutate: mockMarkAllMutate,
      isPending: false,
    }),
  }
})

vi.mock('@clerk/nextjs', () => ({
  useAuth: () => ({ getToken: vi.fn().mockResolvedValue('test-token') }),
}))

import { AdminInboxClient } from './AdminInboxClient'
import { ADMIN_COPY } from '@/components/admin/definitions/copy'

const COPY = ADMIN_COPY.adminInbox

const item = (overrides: Partial<InboxItem>): InboxItem => ({
  itemType: 'event_flag',
  itemId: 'evt-1',
  title: 'Flagged event',
  body: 'Needs review',
  actionUrl: '/admin/review',
  sourceCreatedAt: '2026-07-01T00:00:00.000Z',
  readAt: null,
  ...overrides,
})

const response = (overrides: Partial<InboxResponse>): InboxResponse => ({
  items: [item({})],
  total: 1,
  unreadCounts: {
    event_flag: 3,
    price_submission: 0,
    blocked_venue: 0,
    crawl_failure: 0,
  },
  ...overrides,
})

const renderClient = (ui: ReactElement): RenderResult => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
  return render(ui, { wrapper: Wrapper })
}

describe('AdminInboxClient', () => {
  beforeEach(() => {
    cleanup()
    mockUseAdminInbox.mockReset()
    mockMarkAllMutate.mockReset()
    mockMarkReadMutate.mockReset()
    mockUseAdminInbox.mockReturnValue({
      data: response({}),
      isFetching: false,
      isError: false,
    })
  })

  it('shows the mark-all button in the default unread view when unread items exist', () => {
    renderClient(<AdminInboxClient initialData={response({})} />)
    expect(screen.getByRole('button', { name: COPY.markAll })).toBeTruthy()
  })

  it('hides the mark-all button on the read filter even when unread items exist', () => {
    // The 'read' view renders only already-read rows, so mark-all would be a
    // no-op there. Regression: the button was leaking through because it keyed
    // off unreadCounts (still > 0) rather than the active status filter.
    renderClient(<AdminInboxClient initialData={response({})} />)
    fireEvent.click(screen.getByRole('button', { name: COPY.status.read }))
    expect(screen.queryByRole('button', { name: COPY.markAll })).toBeNull()
  })

  it('keeps the mark-all button on the all-status filter when unread items exist', () => {
    renderClient(<AdminInboxClient initialData={response({})} />)
    fireEvent.click(screen.getByRole('button', { name: COPY.status.all }))
    expect(screen.getByRole('button', { name: COPY.markAll })).toBeTruthy()
  })
})
