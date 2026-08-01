// @vitest-environment jsdom

import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import { AddVenueButton } from './AddVenueButton'
import { ADMIN_COPY } from '@/components/admin/definitions/copy'
import { ADMIN_MOBILE_VIEWPORT_QUERY } from '@/components/admin/definitions/constants'

// The real modal pulls in server actions and Base UI's dialog; the trigger's
// label is all this component's contract needs.
vi.mock('@/components/admin/AddVenueModal', () => ({
  AddVenueModal: ({ fullWidth }: { fullWidth?: boolean }) => (
    <button data-full-width={fullWidth ? 'true' : 'false'}>
      {ADMIN_COPY.addVenueModal.trigger}
    </button>
  ),
}))

let isMobileViewport = false

beforeEach(() => {
  isMobileViewport = false
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: isMobileViewport,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  })
})

const trigger = () => screen.queryByText(ADMIN_COPY.addVenueModal.trigger)

describe('AddVenueButton', () => {
  it('renders the desktop placement above the mobile breakpoint', () => {
    render(<AddVenueButton placement="desktop" />)
    expect(trigger()?.getAttribute('data-full-width')).toBe('false')
  })

  it('hides the mobile placement above the mobile breakpoint', () => {
    render(<AddVenueButton placement="mobile" />)
    expect(trigger()).toBeNull()
  })

  it('renders the mobile placement full-width below the breakpoint', () => {
    isMobileViewport = true
    render(<AddVenueButton placement="mobile" />)
    expect(trigger()?.getAttribute('data-full-width')).toBe('true')
  })

  it('hides the desktop placement below the breakpoint', () => {
    isMobileViewport = true
    render(<AddVenueButton placement="desktop" />)
    expect(trigger()).toBeNull()
  })

  // The venues table switches to its card stack off the same constant. A local
  // copy of the query here would let the two drift by a pixel.
  it('subscribes to the shared admin mobile breakpoint', () => {
    render(<AddVenueButton placement="desktop" />)
    expect(window.matchMedia).toHaveBeenCalledWith(ADMIN_MOBILE_VIEWPORT_QUERY)
  })
})
