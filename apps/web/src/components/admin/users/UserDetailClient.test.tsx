// @vitest-environment jsdom

import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import type { AdminUserDetail } from '@concert-crawl/types'
import { UserDetailClient } from './UserDetailClient'
import { ADMIN_COPY } from '@/components/admin/definitions/copy'

const COPY = ADMIN_COPY.users.detail

const baseUser = (
  overrides: Partial<AdminUserDetail> = {},
): AdminUserDetail => ({
  id: 'user_target',
  email: 'target@example.com',
  handle: 'targethandle',
  city: 'Denver',
  theme: 'jade',
  avatarColor: 'signal',
  role: 'beta',
  joinedAt: '2026-04-01T00:00:00.000Z',
  clerkAccountMissing: false,
  stats: {
    feedback: 1,
    trackedEvents: 1,
    priceSubmissions: 2,
    artistFollows: 3,
  },
  feedback: [
    {
      id: 'fb-1',
      category: 'bug',
      status: 'unread',
      message: 'Something broke',
      pageUrl: 'https://concertcrawl.app/events',
      issueUrl: 'https://github.com/HartiganHM/concert-crawl/issues/1',
      createdAt: '2026-05-01T00:00:00.000Z',
    },
  ],
  trackedEvents: [
    {
      eventId: 'evt-1',
      eventTitle: 'Night One',
      eventDate: '2026-06-01',
      venueName: 'Ogden Theatre',
      status: 'going',
      createdAt: '2026-05-02T00:00:00.000Z',
    },
  ],
  ...overrides,
})

afterEach(cleanup)

describe('UserDetailClient', () => {
  it('renders identity, stats, feedback, and watchlist for a full user', () => {
    render(<UserDetailClient user={baseUser()} />)
    expect(screen.getByText('@targethandle')).toBeTruthy()
    expect(screen.getByText('target@example.com')).toBeTruthy()
    expect(screen.getByText('beta')).toBeTruthy()
    expect(screen.getByText('Something broke')).toBeTruthy()
    expect(screen.getByText('Night One')).toBeTruthy()
    expect(screen.getByText('Ogden Theatre')).toBeTruthy()
    expect(screen.getByText('user_target')).toBeTruthy()
    // theme + avatarColor are returned by the API and must be surfaced, not
    // silently dropped.
    expect(screen.getByText('jade')).toBeTruthy()
    expect(screen.getByText('signal')).toBeTruthy()
  })

  it('hides the appearance line when theme and avatarColor are both null', () => {
    render(
      <UserDetailClient user={baseUser({ theme: null, avatarColor: null })} />,
    )
    expect(screen.queryByText(COPY.identity.themePrefix)).toBeNull()
    expect(screen.queryByText(COPY.identity.avatarPrefix)).toBeNull()
  })

  it('links a feedback item with an issueUrl out to the tracker', () => {
    render(<UserDetailClient user={baseUser()} />)
    const issueLink = screen.getByText(COPY.feedback.viewIssue).closest('a')
    expect(issueLink).toBeTruthy()
    expect(issueLink?.getAttribute('href')).toBe(
      'https://github.com/HartiganHM/concert-crawl/issues/1',
    )
  })

  it('does not render the issue link for a non-http(s) issueUrl scheme', () => {
    render(
      <UserDetailClient
        user={baseUser({
          feedback: [
            {
              id: 'fb-xss',
              category: 'bug',
              status: 'unread',
              message: 'Malicious link',
              pageUrl: 'https://concertcrawl.app/events',
              issueUrl: 'javascript:alert(1)',
              createdAt: '2026-05-01T00:00:00.000Z',
            },
          ],
        })}
      />,
    )
    expect(screen.getByText('Malicious link')).toBeTruthy()
    expect(screen.queryByText(COPY.feedback.viewIssue)).toBeNull()
  })

  it('shows empty copy when the user has no feedback or watchlist', () => {
    render(
      <UserDetailClient
        user={baseUser({
          feedback: [],
          trackedEvents: [],
          stats: {
            feedback: 0,
            trackedEvents: 0,
            priceSubmissions: 0,
            artistFollows: 0,
          },
        })}
      />,
    )
    expect(screen.getByText(COPY.feedback.empty)).toBeTruthy()
    expect(screen.getByText(COPY.watching.empty)).toBeTruthy()
  })

  it('surfaces the deleted-account note and null-email fallback', () => {
    render(
      <UserDetailClient
        user={baseUser({
          email: null,
          role: null,
          handle: 'orphan',
          joinedAt: null,
          city: null,
          clerkAccountMissing: true,
        })}
      />,
    )
    expect(screen.getByText(COPY.identity.deletedNote)).toBeTruthy()
    expect(screen.getByText(COPY.identity.noEmail)).toBeTruthy()
    expect(screen.getByText(COPY.identity.noRole)).toBeTruthy()
    expect(screen.getByText(COPY.identity.unknownJoined)).toBeTruthy()
  })

  it('renders the issue_opened feedback status with the danger token, matching the inbox', () => {
    render(
      <UserDetailClient
        user={baseUser({
          feedback: [
            {
              id: 'fb-2',
              category: 'bug',
              status: 'issue_opened',
              message: 'Tracked bug',
              pageUrl: 'https://concertcrawl.app/events',
              issueUrl: null,
              createdAt: '2026-05-01T00:00:00.000Z',
            },
          ],
        })}
      />,
    )
    const badge = screen.getByText('issue_opened')
    expect(badge.style.color).toBe('var(--danger)')
  })

  it('hides the deleted-account note for a live Clerk user with no email', () => {
    render(
      <UserDetailClient
        user={baseUser({ email: null, clerkAccountMissing: false })}
      />,
    )
    expect(screen.queryByText(COPY.identity.deletedNote)).toBeNull()
  })

  it('renders only the load-error banner when user is null', () => {
    render(<UserDetailClient user={null} />)
    expect(screen.getByRole('alert').textContent).toContain(COPY.loadError)
    expect(screen.queryByText(COPY.feedback.title)).toBeNull()
  })

  it('falls back to the unknown-venue label when venueName is null', () => {
    render(
      <UserDetailClient
        user={baseUser({
          trackedEvents: [
            {
              eventId: 'evt-2',
              eventTitle: 'Orphan Event',
              eventDate: '2026-07-01',
              venueName: null,
              status: 'watching',
              createdAt: '2026-05-03T00:00:00.000Z',
            },
          ],
        })}
      />,
    )
    expect(screen.getByText(COPY.watching.unknownVenue)).toBeTruthy()
  })
})
