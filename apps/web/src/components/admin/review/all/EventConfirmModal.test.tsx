// @vitest-environment jsdom
import { afterEach, describe, it, expect, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { EventConfirmModal } from './EventConfirmModal'

afterEach(cleanup)

describe('EventConfirmModal — mark-as-concert kind', () => {
  it('renders the Mark as concert confirm copy', () => {
    render(
      <EventConfirmModal
        kind="mark-as-concert"
        event={{
          title: 'Borderline',
          venueName: 'X',
          date: '2026-08-01',
          showTime: null,
        }}
        onCancel={vi.fn()}
        onConfirm={vi.fn()}
      />,
    )
    expect(
      screen.getByRole('heading', { name: 'Mark as concert?' }),
    ).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Mark as concert' })).toBeTruthy()
  })
})
