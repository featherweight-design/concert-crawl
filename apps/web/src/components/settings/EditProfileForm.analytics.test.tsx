// @vitest-environment jsdom
import '@testing-library/jest-dom'
import { describe, it, expect, vi, afterEach } from 'vitest'
import {
  render,
  screen,
  cleanup,
  fireEvent,
  waitFor,
} from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { UserProfileResponse } from '@concert-crawl/types'

const { mockPatchMe } = vi.hoisted(() => ({ mockPatchMe: vi.fn() }))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
}))
vi.mock('@clerk/nextjs', () => ({
  useAuth: () => ({
    getToken: () => Promise.resolve('token'),
    userId: 'user_1',
  }),
}))
vi.mock('@/lib/users', () => ({
  patchMe: mockPatchMe,
  checkHandleAvailability: vi.fn(),
}))

import { EditProfileForm } from './EditProfileForm'
import { analyticsHandleQueryKey } from '@/lib/analytics/PostHogProvider'
import { CONSUMER_COPY } from '@/components/consumer/definitions/copy'

const PROFILE: UserProfileResponse = {
  id: 'user_1',
  email: 'ada@example.com',
  handle: 'adal',
  city: null,
  avatarColor: 'signal',
  theme: 'electric',
  planState: {
    plan: 'free',
    onTrial: false,
    trialEndsAt: null,
    status: null,
    cancelAtPeriodEnd: false,
    currentPeriodEnd: null,
    roleComped: false,
  },
  displayRole: 'fan',
  roleBadge: null,
  joined: 'Apr 2026',
  submissionCount: 0,
  cred: 0,
  showTrialEndedTakeover: false,
  showDayThirteenBanner: false,
  showPastDueBanner: false,
  founderWindow: { state: 'pre-launch', seatsTotal: 100, closesAt: null },
}

describe('EditProfileForm and the analytics name', () => {
  afterEach(cleanup)

  it('hands a cleared handle to the analytics provider after a save', async () => {
    mockPatchMe.mockResolvedValue(undefined)
    const client = new QueryClient()
    client.setQueryData(analyticsHandleQueryKey('user_1'), 'adal')
    render(
      <QueryClientProvider client={client}>
        <EditProfileForm profile={PROFILE} onClose={vi.fn()} />
      </QueryClientProvider>,
    )
    fireEvent.change(
      screen.getByLabelText(CONSUMER_COPY.settings.handleLabel),
      { target: { value: '' } },
    )
    fireEvent.click(
      screen.getByRole('button', {
        name: CONSUMER_COPY.settings.editSaveButton,
      }),
    )
    await waitFor(() => expect(mockPatchMe).toHaveBeenCalledTimes(1))
    await waitFor(() =>
      expect(client.getQueryData(analyticsHandleQueryKey('user_1'))).toBeNull(),
    )
  })

  it('does not let a profile read sent before the save restore the old handle', async () => {
    mockPatchMe.mockResolvedValue(undefined)
    const client = new QueryClient()
    const key = analyticsHandleQueryKey('user_1')
    let answerLateRead: (handle: string) => void = () => {}
    void client.prefetchQuery({
      queryKey: key,
      queryFn: () =>
        new Promise<string>((resolve) => {
          answerLateRead = resolve
        }),
    })
    render(
      <QueryClientProvider client={client}>
        <EditProfileForm profile={PROFILE} onClose={vi.fn()} />
      </QueryClientProvider>,
    )
    fireEvent.change(
      screen.getByLabelText(CONSUMER_COPY.settings.handleLabel),
      { target: { value: '' } },
    )
    fireEvent.click(
      screen.getByRole('button', {
        name: CONSUMER_COPY.settings.editSaveButton,
      }),
    )
    await waitFor(() => expect(client.getQueryData(key)).toBeNull())
    answerLateRead('adal')
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(client.getQueryData(key)).toBeNull()
  })
})
