// @vitest-environment jsdom

import '@testing-library/jest-dom'
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import {
  render,
  screen,
  fireEvent,
  cleanup,
  waitFor,
} from '@testing-library/react'

vi.mock('@clerk/nextjs', () => ({
  useAuth: () => ({ getToken: async () => 'tok' }),
}))

const createCrew = vi.fn()
vi.mock('@/lib/crews', () => ({
  createCrew: (...args: unknown[]) => createCrew(...args),
}))

import { CreateCrewSheet } from './CreateCrewSheet'
import { CREWS_COPY } from './definitions/copy'

const COPY = CREWS_COPY.create

afterEach(cleanup)

let uuidCounter = 0
beforeEach(() => {
  createCrew.mockReset()
  uuidCounter = 0
  vi.stubGlobal('crypto', {
    randomUUID: () => `uuid-${++uuidCounter}`,
  })
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }))
})

// The shell portals to the body, so the patch is never inside the container
// RTL hands back. The uid is React-generated and changes per render, so it is
// normalised out before the two markups are compared.
const patchMarkup = (): string => {
  const svg = document.body.querySelector('svg')
  if (svg === null) throw new Error('no patch rendered')
  return svg.innerHTML.replace(/cp[A-Za-z0-9_]+?(?=-clip|-w)/g, 'UID')
}

const open = () =>
  render(<CreateCrewSheet open onClose={vi.fn()} onCreated={vi.fn()} />)

describe('CreateCrewSheet (#1226)', () => {
  it('disables submit until the name has non-whitespace content', () => {
    open()
    const submit = screen.getByRole('button', { name: COPY.submit })
    expect(submit).toBeDisabled()
    fireEvent.change(screen.getByLabelText(COPY.nameLabel), {
      target: { value: '   ' },
    })
    expect(submit).toBeDisabled()
    fireEvent.change(screen.getByLabelText(COPY.nameLabel), {
      target: { value: 'Thursdays' },
    })
    expect(submit).toBeEnabled()
  })

  it('caps the name at the API length and shows no counter', () => {
    open()
    expect(screen.getByLabelText(COPY.nameLabel)).toHaveAttribute(
      'maxlength',
      '40',
    )
    expect(screen.queryByText(/\/\s*40/)).not.toBeInTheDocument()
  })

  it('rerolls by minting a fresh id rather than bumping a salt', () => {
    open()
    const before = patchMarkup()
    fireEvent.click(
      screen.getByRole('button', { name: CREWS_COPY.a11y.reroll }),
    )
    expect(patchMarkup()).not.toBe(before)
  })

  it('submits the trimmed name with the previewed id', async () => {
    createCrew.mockResolvedValue({ id: 'uuid-1', name: 'Thursdays' })
    open()
    fireEvent.change(screen.getByLabelText(COPY.nameLabel), {
      target: { value: '  Thursdays  ' },
    })
    fireEvent.click(screen.getByRole('button', { name: COPY.submit }))
    await waitFor(() =>
      expect(createCrew).toHaveBeenCalledWith('tok', {
        id: 'uuid-1',
        name: 'Thursdays',
      }),
    )
  })

  it('swaps the label and disables the button in flight, with no spinner', async () => {
    createCrew.mockImplementation(() => new Promise(() => {}))
    open()
    fireEvent.change(screen.getByLabelText(COPY.nameLabel), {
      target: { value: 'Thursdays' },
    })
    fireEvent.click(screen.getByRole('button', { name: COPY.submit }))
    const inFlight = await screen.findByRole('button', {
      name: COPY.submitting,
    })
    expect(inFlight).toBeDisabled()
    expect(document.querySelector('[role="progressbar"]')).toBeNull()
  })

  it('surfaces a failure without losing the previewed id', async () => {
    createCrew.mockRejectedValue(new Error('nope'))
    open()
    const before = patchMarkup()
    fireEvent.change(screen.getByLabelText(COPY.nameLabel), {
      target: { value: 'Thursdays' },
    })
    fireEvent.click(screen.getByRole('button', { name: COPY.submit }))
    expect(await screen.findByRole('alert')).toHaveTextContent(COPY.failed)
    expect(patchMarkup()).toBe(before)
  })
})
