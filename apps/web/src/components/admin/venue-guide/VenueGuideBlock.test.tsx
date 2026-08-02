// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  render,
  screen,
  fireEvent,
  waitFor,
  cleanup,
} from '@testing-library/react'
import { GUIDE_FIELD_MAX_LENGTH, type VenueGuide } from '@concert-crawl/types'
import { ADMIN_COPY } from '../definitions/copy'
import { VenueGuideBlock } from './VenueGuideBlock'

const GUIDE_COPY = ADMIN_COPY.venueDetailsClient.guide

const saveVenueGuide = vi.fn()
const publishVenueGuide = vi.fn()
const unpublishVenueGuide = vi.fn()

vi.mock('@/lib/actions/venues', () => ({
  saveVenueGuide: (...args: unknown[]) => saveVenueGuide(...args),
  publishVenueGuide: (...args: unknown[]) => publishVenueGuide(...args),
  unpublishVenueGuide: (...args: unknown[]) => unpublishVenueGuide(...args),
}))

const emptyGuide: VenueGuide = {
  chips: [],
  insiderTip: null,
  publishedAt: null,
}

const populatedGuide: VenueGuide = {
  chips: [
    {
      chipType: 'accessibility',
      body: 'Step-free entry.',
      isPlaceholder: false,
    },
    { chipType: 'parking', body: '$15 cash on Blake.', isPlaceholder: false },
  ],
  insiderTip: 'Runs loud — earplugs at the bar.',
  publishedAt: null,
}

const renderBlock = (guide: VenueGuide = emptyGuide, loadFailed = false) =>
  render(
    <VenueGuideBlock
      venueId="venue-1"
      venueName="The Roxy"
      initialGuide={guide}
      loadFailed={loadFailed}
    />,
  )

const addLabelFor = (label: string) => `${GUIDE_COPY.picker.addLabel} ${label}`
const pickerRemoveLabelFor = (label: string) =>
  `${GUIDE_COPY.picker.removeLabel} ${label}`

beforeEach(() => {
  saveVenueGuide.mockReset().mockResolvedValue({ success: true })
  publishVenueGuide.mockReset().mockResolvedValue({ success: true })
  unpublishVenueGuide.mockReset().mockResolvedValue({ success: true })
})

afterEach(() => cleanup())

describe('VenueGuideBlock (#764)', () => {
  it('renders the empty state blocked, with no chip fields', () => {
    renderBlock()
    expect(screen.getByText(GUIDE_COPY.badge.blocked)).toBeTruthy()
    expect(screen.queryByLabelText(GUIDE_COPY.chipLabel.parking)).toBeNull()
  })

  it('renders a populated guide as ready to publish', () => {
    renderBlock(populatedGuide)
    expect(screen.getByText(GUIDE_COPY.badge.ready)).toBeTruthy()
    const parking = screen.getByLabelText<HTMLTextAreaElement>(
      GUIDE_COPY.chipLabel.parking,
    )
    expect(parking.value).toBe('$15 cash on Blake.')
  })

  it('puts the insider tip first in DOM order', () => {
    renderBlock(populatedGuide)
    const boxes = screen.getAllByRole('textbox')
    expect(boxes[0]).toBe(screen.getByLabelText(GUIDE_COPY.insiderTip.label))
  })

  it('associates a real <label> element with every textarea', () => {
    renderBlock(populatedGuide)
    for (const box of screen.getAllByRole('textbox')) {
      expect(box.id).not.toBe('')
      expect(document.querySelector(`label[for="${box.id}"]`)).not.toBeNull()
    }
  })

  it('renders the authored admin hint as help text under each chip field', () => {
    renderBlock(populatedGuide)
    expect(screen.getByText(GUIDE_COPY.chipHint.parking)).toBeTruthy()
  })

  it('shows an alert banner and marks accessibility invalid when publish is blocked', async () => {
    renderBlock()

    fireEvent.click(
      screen.getByRole('button', { name: GUIDE_COPY.footer.publish }),
    )

    const banner = await screen.findByRole('alert')
    expect(banner.textContent).toContain(GUIDE_COPY.banner.title)

    const access = screen.getByLabelText(GUIDE_COPY.accessibility.label)
    expect(access.getAttribute('aria-invalid')).toBe('true')
    const describedBy = access.getAttribute('aria-describedby')
    expect(describedBy).toBeTruthy()
    expect(document.getElementById(describedBy ?? '')?.textContent).toBe(
      GUIDE_COPY.accessibility.error,
    )
    expect(publishVenueGuide).not.toHaveBeenCalled()
  })

  it('flipping the placeholder switch satisfies the gate', () => {
    renderBlock()

    fireEvent.click(
      screen.getByRole('switch', {
        name: GUIDE_COPY.accessibility.toggleLabel,
      }),
    )

    expect(screen.getByText(GUIDE_COPY.badge.readyWithPlaceholder)).toBeTruthy()
    expect(
      screen.getByText(GUIDE_COPY.accessibility.previewBody, { exact: false }),
    ).toBeTruthy()
  })

  it('exposes chip state as text, not colour alone', () => {
    renderBlock(populatedGuide)
    expect(
      screen.getAllByText(GUIDE_COPY.state.authored).length,
    ).toBeGreaterThan(1)
  })

  it('picker toggles are pressable, labelled, and add a field', () => {
    renderBlock()

    const toggle = screen.getByRole('button', {
      name: addLabelFor(GUIDE_COPY.chipLabel.coat_check),
    })
    expect(toggle.getAttribute('aria-pressed')).toBe('false')

    fireEvent.click(toggle)
    expect(screen.getByLabelText(GUIDE_COPY.chipLabel.coat_check)).toBeTruthy()
    expect(
      screen
        .getByRole('button', {
          name: pickerRemoveLabelFor(GUIDE_COPY.chipLabel.coat_check),
        })
        .getAttribute('aria-pressed'),
    ).toBe('true')
  })

  it('drops a blank chip from the save payload', async () => {
    renderBlock()

    fireEvent.click(
      screen.getByRole('button', {
        name: addLabelFor(GUIDE_COPY.chipLabel.parking),
      }),
    )
    fireEvent.click(
      screen.getByRole('button', { name: GUIDE_COPY.footer.saveDraft }),
    )

    await waitFor(() => expect(saveVenueGuide).toHaveBeenCalled())
    expect(saveVenueGuide.mock.calls[0]?.[1]).toEqual({
      insiderTip: null,
      chips: [],
    })
  })

  it("removing a chip clears it from the field's payload", async () => {
    renderBlock(populatedGuide)

    fireEvent.click(
      screen.getByRole('button', {
        name: `${GUIDE_COPY.picker.removeLabel} ${GUIDE_COPY.chipLabel.parking} ${GUIDE_COPY.field.removeSuffix}`,
      }),
    )
    fireEvent.click(
      screen.getByRole('button', { name: GUIDE_COPY.footer.saveDraft }),
    )

    await waitFor(() => expect(saveVenueGuide).toHaveBeenCalled())
    const payload = saveVenueGuide.mock.calls[0]?.[1]
    expect(
      payload.chips.map((chip: { chipType: string }) => chip.chipType),
    ).toEqual(['accessibility'])
  })

  it('publishes when the gate is satisfied', async () => {
    publishVenueGuide.mockResolvedValue({
      success: true,
      data: { ...populatedGuide, publishedAt: '2026-08-01T00:00:00.000Z' },
    })
    renderBlock(populatedGuide)

    fireEvent.click(
      screen.getByRole('button', { name: GUIDE_COPY.footer.publish }),
    )

    await waitFor(() =>
      expect(publishVenueGuide).toHaveBeenCalledWith('venue-1'),
    )
  })

  it('hides Unpublish until the guide is live', () => {
    renderBlock(populatedGuide)
    expect(
      screen.queryByRole('button', { name: GUIDE_COPY.unpublish.action }),
    ).toBeNull()
  })

  it('confirms before unpublishing a live guide', async () => {
    renderBlock({ ...populatedGuide, publishedAt: '2026-08-01T00:00:00.000Z' })

    fireEvent.click(
      screen.getByRole('button', { name: GUIDE_COPY.unpublish.action }),
    )

    expect(unpublishVenueGuide).not.toHaveBeenCalled()
    expect(screen.getByText(GUIDE_COPY.unpublish.confirmPrompt)).toBeTruthy()

    fireEvent.click(
      screen.getByRole('button', { name: GUIDE_COPY.unpublish.confirmAction }),
    )
    await waitFor(() =>
      expect(unpublishVenueGuide).toHaveBeenCalledWith('venue-1'),
    )
  })

  // A failed guide fetch hands the block an EMPTY draft. Saving that would
  // send `chips: []`, which the PUT handler reads as "delete every chip for
  // this venue" — so a transient 500 must not be able to wipe real content.
  it('disables authoring and warns when the guide failed to load', () => {
    renderBlock(emptyGuide, true)

    expect(screen.getByText(GUIDE_COPY.loadError)).toBeTruthy()

    const save = screen.getByRole('button', {
      name: GUIDE_COPY.footer.saveDraft,
    })
    fireEvent.click(save)
    expect(saveVenueGuide).not.toHaveBeenCalled()

    const publish = screen.getByRole('button', {
      name: GUIDE_COPY.footer.publish,
    })
    fireEvent.click(publish)
    expect(publishVenueGuide).not.toHaveBeenCalled()
  })

  it('caps every authored field at the shared max length', () => {
    renderBlock(populatedGuide)
    for (const field of screen.getAllByRole('textbox')) {
      expect(field.getAttribute('maxLength')).toBe(
        String(GUIDE_FIELD_MAX_LENGTH),
      )
    }
  })

  it('publishes on ⌘↵', async () => {
    renderBlock(populatedGuide)
    fireEvent.keyDown(screen.getByText(GUIDE_COPY.blockSub), {
      key: 'Enter',
      metaKey: true,
    })
    await waitFor(() =>
      expect(publishVenueGuide).toHaveBeenCalledWith('venue-1'),
    )
  })

  // A failed save and a successful one both land in the same role="status"
  // line. Rendered identically, "Could not save the guide" reads as
  // reassurance — the admin walks away believing the draft is stored.
  it('distinguishes a failed save from a successful one', async () => {
    saveVenueGuide.mockResolvedValue({ success: false })
    renderBlock(populatedGuide)

    fireEvent.click(
      screen.getByRole('button', { name: GUIDE_COPY.footer.saveDraft }),
    )

    const failure = await screen.findByText(GUIDE_COPY.status.saveError)
    expect(failure.style.color).toBe('var(--danger)')

    saveVenueGuide.mockResolvedValue({ success: true })
    fireEvent.click(
      screen.getByRole('button', { name: GUIDE_COPY.footer.saveDraft }),
    )

    const success = await screen.findByText(GUIDE_COPY.status.saved)
    expect(success.style.color).not.toBe('var(--danger)')
  })

  it('renders the legend with a text equivalent for every dot', () => {
    renderBlock()
    expect(screen.getByText(GUIDE_COPY.legend.heading)).toBeTruthy()
    expect(screen.getByText(GUIDE_COPY.legend.blankBody)).toBeTruthy()
    expect(screen.getByText(GUIDE_COPY.legend.authoredBody)).toBeTruthy()
    expect(screen.getByText(GUIDE_COPY.legend.placeholderBody)).toBeTruthy()
  })
})
