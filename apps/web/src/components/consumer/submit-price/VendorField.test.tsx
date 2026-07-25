// @vitest-environment jsdom

import '@testing-library/jest-dom'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'

import { VendorField } from './VendorField'
import { VENDOR_PICKER_COPY } from '@/components/consumer/definitions/copy'

function setViewport(width: number) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: query.includes('max-width: 519px') ? width < 520 : false,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
    onchange: null,
  }))
}

// jsdom has no layout, so the two reads the flip depends on — the chip's rect
// and the popover's rendered height — have to be supplied.
function stubGeometry({
  triggerBottom,
  popoverHeight,
}: {
  triggerBottom: number
  popoverHeight: number
}) {
  window.innerHeight = 800
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue({
    ...new DOMRect(),
    top: triggerBottom - 38,
    bottom: triggerBottom,
  })
  vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(
    popoverHeight,
  )
}

const trigger = () =>
  screen.getByRole('button', { name: VENDOR_PICKER_COPY.moreTriggerLabel })

const openDropdown = () => fireEvent.click(trigger())

// The listbox handler lives on the container; keys reach it by bubbling from
// whichever option currently holds focus.
const press = (key: string) =>
  fireEvent.keyDown(document.activeElement ?? document.body, { key })

beforeEach(() => {
  vi.restoreAllMocks()
  setViewport(1024)
})

describe('VendorField', () => {
  it('renders the three pinned vendors as a labelled radiogroup', () => {
    render(<VendorField value={null} onChange={vi.fn()} />)

    const group = screen.getByRole('radiogroup', {
      name: VENDOR_PICKER_COPY.label,
    })
    const radios = within(group).getAllByRole('radio')
    expect(radios.map((node) => node.textContent)).toEqual([
      VENDOR_PICKER_COPY.vendors.VenueBoxOffice,
      VENDOR_PICKER_COPY.vendors.AXS,
      VENDOR_PICKER_COPY.vendors.Ticketmaster,
    ])
  })

  it('reports the selected pinned vendor via aria-checked', () => {
    render(<VendorField value="AXS" onChange={vi.fn()} />)

    expect(screen.getByRole('radio', { name: 'AXS' })).toBeChecked()
  })

  // ARIA radiogroups are a single tab stop: one radio is tabbable, the rest
  // are reached with arrows.
  it('gives the radiogroup a single tab stop', () => {
    render(<VendorField value={null} onChange={vi.fn()} />)

    const radios = screen.getAllByRole('radio')
    expect(radios.map((node) => node.getAttribute('tabindex'))).toEqual([
      '0',
      '-1',
      '-1',
    ])
  })

  it('makes the checked radio the tab stop', () => {
    render(<VendorField value="Ticketmaster" onChange={vi.fn()} />)

    expect(screen.getByRole('radio', { name: 'Ticketmaster' })).toHaveAttribute(
      'tabindex',
      '0',
    )
  })

  it('moves and selects with the arrow keys, wrapping at the end', () => {
    const onChange = vi.fn()
    render(<VendorField value="Ticketmaster" onChange={onChange} />)

    const last = screen.getByRole('radio', { name: 'Ticketmaster' })
    last.focus()
    fireEvent.keyDown(last, { key: 'ArrowRight' })

    // Arrow selection in a radiogroup commits as it moves.
    expect(onChange).toHaveBeenCalledWith('VenueBoxOffice')
    expect(
      screen.getByRole('radio', {
        name: VENDOR_PICKER_COPY.vendors.VenueBoxOffice,
      }),
    ).toHaveFocus()
  })

  it('walks backwards with ArrowLeft', () => {
    const onChange = vi.fn()
    render(<VendorField value="AXS" onChange={onChange} />)

    const axs = screen.getByRole('radio', { name: 'AXS' })
    axs.focus()
    fireEvent.keyDown(axs, { key: 'ArrowLeft' })

    expect(onChange).toHaveBeenCalledWith('VenueBoxOffice')
  })

  it('keeps the disclosure trigger outside the radiogroup', () => {
    render(<VendorField value={null} onChange={vi.fn()} />)

    const group = screen.getByRole('radiogroup', {
      name: VENDOR_PICKER_COPY.label,
    })
    // A button can't be a radio — the fourth control is a disclosure.
    expect(group).not.toContainElement(trigger())
    expect(trigger()).toHaveAttribute('aria-haspopup', 'listbox')
    expect(trigger()).toHaveAttribute('aria-expanded', 'false')
  })

  it('shows an ellipsis on the chip but names it in full', () => {
    render(<VendorField value={null} onChange={vi.fn()} />)

    expect(trigger()).toHaveTextContent(VENDOR_PICKER_COPY.moreTrigger)
  })

  it('opens a grouped listbox naming resale in words', () => {
    render(<VendorField value={null} onChange={vi.fn()} />)

    openDropdown()

    expect(screen.getByRole('listbox')).toBeInTheDocument()
    const resale = screen.getByRole('group', {
      name: `${VENDOR_PICKER_COPY.groups.resale.label}, ${VENDOR_PICKER_COPY.groups.resale.caption}`,
    })
    expect(
      within(resale).getByRole('option', { name: 'StubHub' }),
    ).toBeInTheDocument()
    expect(
      within(resale).getByRole('option', { name: 'SeatGeek' }),
    ).toBeInTheDocument()
  })

  it('offers Etix, the vendor the flat list was missing', () => {
    render(<VendorField value={null} onChange={vi.fn()} />)

    openDropdown()

    expect(screen.getByRole('option', { name: 'Etix' })).toBeInTheDocument()
  })

  it('drops the popover below the chip when there is room', () => {
    stubGeometry({ triggerBottom: 200, popoverHeight: 380 })
    render(<VendorField value={null} onChange={vi.fn()} />)

    openDropdown()

    const popover = screen.getByRole('group', {
      name: VENDOR_PICKER_COPY.popoverTitle,
    })
    expect(popover.style.top).toBe('calc(100% + 8px)')
    expect(popover.style.bottom).toBe('')
  })

  it('flips the popover above the chip when it would run off the bottom', () => {
    // Trigger sits 40px off the bottom of an 800px viewport — a 380px list
    // cannot open downwards, but clears easily going up.
    stubGeometry({ triggerBottom: 760, popoverHeight: 380 })
    render(<VendorField value={null} onChange={vi.fn()} />)

    openDropdown()

    const popover = screen.getByRole('group', {
      name: VENDOR_PICKER_COPY.popoverTitle,
    })
    expect(popover.style.bottom).toBe('calc(100% + 8px)')
    expect(popover.style.top).toBe('')
  })

  it('commits a dropdown choice and closes', () => {
    const onChange = vi.fn()
    render(<VendorField value={null} onChange={onChange} />)

    openDropdown()
    fireEvent.click(screen.getByRole('option', { name: 'Etix' }))

    expect(onChange).toHaveBeenCalledWith('Etix')
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })

  it('lands the selection in place as the fourth chip, with a clear button', () => {
    const onChange = vi.fn()
    render(<VendorField value="Etix" onChange={onChange} />)

    // The row never grows — More… becomes the selected vendor.
    expect(
      screen.queryByRole('button', {
        name: VENDOR_PICKER_COPY.moreTriggerLabel,
      }),
    ).not.toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /Where it's listed: Etix/ }),
    ).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Clear Etix' }))
    expect(onChange).toHaveBeenCalledWith(null)
  })

  it('dismisses an open dropdown when the field becomes disabled', () => {
    const { rerender } = render(<VendorField value={null} onChange={vi.fn()} />)

    openDropdown()
    expect(screen.getByRole('listbox')).toBeInTheDocument()

    // What happens when the submitter switches to box office mid-pick.
    rerender(<VendorField value={null} onChange={vi.fn()} disabled />)

    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })

  // pointerdown rather than mousedown: touch and pen never fire the latter on
  // some devices, which would strand the popover open.
  it('dismisses the popover on an outside pointer press', () => {
    render(<VendorField value={null} onChange={vi.fn()} />)

    openDropdown()
    expect(screen.getByRole('listbox')).toBeInTheDocument()

    fireEvent.pointerDown(document.body)

    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })

  it('dismisses an open dropdown when a pinned vendor is picked', () => {
    const onChange = vi.fn()
    render(<VendorField value={null} onChange={onChange} />)

    openDropdown()
    fireEvent.click(screen.getByRole('radio', { name: 'AXS' }))

    expect(onChange).toHaveBeenCalledWith('AXS')
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })

  it('closes and restores focus when the selection is cleared', () => {
    const onChange = vi.fn()
    render(<VendorField value="Etix" onChange={onChange} />)

    const selected = screen.getByRole('button', {
      name: /Where it's listed: Etix/,
    })
    fireEvent.click(selected)
    fireEvent.click(screen.getByRole('button', { name: 'Clear Etix' }))

    expect(onChange).toHaveBeenCalledWith(null)
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    expect(selected).toHaveFocus()
  })

  it('renders the catch-all as "Somewhere else" but stores Other', () => {
    const onChange = vi.fn()
    render(<VendorField value={null} onChange={onChange} />)

    openDropdown()
    fireEvent.click(
      screen.getByRole('option', { name: VENDOR_PICKER_COPY.vendors.Other }),
    )

    expect(onChange).toHaveBeenCalledWith('Other')
  })

  // The trigger sits outside the radiogroup, so its accessible name is the
  // only place a screen reader hears which question it answers.
  it('names the question in the unselected trigger, not just "More vendors"', () => {
    render(<VendorField value={null} onChange={vi.fn()} />)

    expect(trigger()).toHaveAccessibleName(
      expect.stringContaining(VENDOR_PICKER_COPY.label),
    )
  })

  // ModalShell listens for Escape at the document level, so an un-stopped
  // Escape from the trigger would tear down the whole submit modal.
  it('stops an Escape on the trigger from reaching the modal while open', () => {
    render(<VendorField value={null} onChange={vi.fn()} />)

    const onDocumentEscape = vi.fn()
    document.addEventListener('keydown', onDocumentEscape)

    openDropdown()
    // Focus can land back on the trigger while the list is still open — a
    // Shift+Tab out of the options, for instance.
    fireEvent.keyDown(trigger(), { key: 'Escape' })

    document.removeEventListener('keydown', onDocumentEscape)
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    expect(onDocumentEscape).not.toHaveBeenCalled()
  })

  it('stops the listbox Escape from reaching the modal listener', () => {
    const onDocumentEscape = vi.fn()
    document.addEventListener('keydown', onDocumentEscape)
    render(<VendorField value={null} onChange={vi.fn()} />)

    openDropdown()
    press('Escape')

    document.removeEventListener('keydown', onDocumentEscape)
    expect(onDocumentEscape).not.toHaveBeenCalled()
  })

  it('closes on Escape and returns focus to the trigger', () => {
    render(<VendorField value={null} onChange={vi.fn()} />)

    openDropdown()
    press('Escape')

    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    expect(trigger()).toHaveFocus()
  })

  it('moves the active option with the arrow keys', () => {
    render(<VendorField value={null} onChange={vi.fn()} />)

    openDropdown()
    // Opens focused on the first option (Etix); ArrowDown advances.
    expect(screen.getByRole('option', { name: 'Etix' })).toHaveFocus()
    press('ArrowDown')
    expect(screen.getByRole('option', { name: 'Eventbrite' })).toHaveFocus()
  })

  it('jumps to a vendor by typeahead', () => {
    render(<VendorField value={null} onChange={vi.fn()} />)

    openDropdown()
    press('s')
    press('t')

    expect(screen.getByRole('option', { name: 'StubHub' })).toHaveFocus()
  })

  it('surfaces the validation error', () => {
    render(
      <VendorField
        value={null}
        onChange={vi.fn()}
        error="Pick where it's listed."
      />,
    )

    expect(screen.getByText("Pick where it's listed.")).toBeInTheDocument()
  })

  it('locks every control when disabled', () => {
    render(<VendorField value={null} onChange={vi.fn()} disabled />)

    for (const radio of screen.getAllByRole('radio')) {
      expect(radio).toBeDisabled()
    }
    expect(trigger()).toBeDisabled()
  })
})
