// @vitest-environment jsdom

import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render } from '@testing-library/react'

import { AvatarSlot } from '../AvatarSlot'
import { FlexArt } from '../FlexArt'
import { Panel, type PanelProps } from '../Panel'
import { SLOT_HAIRLINE, SLOT_RADIUS } from '../definitions/constants'
import { slotScaleFor } from '../lib/slot-metrics'

afterEach(cleanup)

const box = (root: HTMLElement) => {
  const first = root.firstElementChild
  if (!(first instanceof HTMLElement)) {
    throw new Error('the slot rendered no element')
  }
  return first
}
const photo = (root: HTMLElement) => root.querySelector('img')
const tint = (root: HTMLElement) =>
  Array.from(root.querySelectorAll('div')).find((node) =>
    node.getAttribute('style')?.includes('--image-tint'),
  ) ?? null

const artwork = 'https://example.test/poster.jpg'
const portrait = 'https://example.test/press.jpg'

describe('slotScaleFor', () => {
  // `scale` is a detail-density knob, so the boundaries are the whole contract.
  it.each([
    [40, 'micro'],
    [56, 'micro'],
    [63, 'micro'],
    [64, 'tile'],
    [111, 'tile'],
    [112, 'hero'],
    [208, 'hero'],
  ])('maps %ipx to %s', (size, scale) => {
    expect(slotScaleFor(size)).toBe(scale)
  })

  it('takes the middle when the slot fills its parent and cannot know', () => {
    expect(slotScaleFor('100%')).toBe('tile')
  })
})

describe('<Panel />', () => {
  it('is square by default and wears the hairline', () => {
    const { container } = render(
      <Panel surface="artist" name="Ada" photoUrl={null} size={56} />,
    )
    expect(box(container).style.width).toBe('56px')
    expect(box(container).style.height).toBe('56px')
    expect(box(container).style.boxShadow).toBe(SLOT_HAIRLINE)
  })

  it('honours an explicit ratio when it fills its parent', () => {
    const { container } = render(
      <Panel
        surface="artist"
        name="Ada"
        photoUrl={null}
        size="100%"
        ratio="3 / 4"
      />,
    )
    expect(box(container).style.width).toBe('100%')
    expect(box(container).style.height).toBe('')
    expect(box(container).style.aspectRatio).toBe('3 / 4')
  })

  it('takes the row radius below 64px and the panel radius above', () => {
    const { container: small } = render(
      <Panel surface="artist" name="Ada" photoUrl={null} size={40} />,
    )
    expect(box(small).style.borderRadius).toBe(`${SLOT_RADIUS.row}px`)

    // 64 is the boundary and belongs to the row class: `slotRadiusFor` is
    // `<= 64`. It deliberately does not line up with `slotScaleFor`'s `>= 64`,
    // which is the density knob and a separate question.
    const { container: edge } = render(
      <Panel surface="artist" name="Ada" photoUrl={null} size={64} />,
    )
    expect(box(edge).style.borderRadius).toBe(`${SLOT_RADIUS.row}px`)

    const { container: large } = render(
      <Panel surface="artist" name="Ada" photoUrl={null} size={112} />,
    )
    expect(box(large).style.borderRadius).toBe(`${SLOT_RADIUS.panel}px`)

    // A slot that fills its parent cannot be in the row class.
    const { container: filled } = render(
      <Panel surface="artist" name="Ada" photoUrl={null} size="100%" />,
    )
    expect(box(filled).style.borderRadius).toBe(`${SLOT_RADIUS.panel}px`)
  })

  it('tints a photograph and leaves generated art alone', () => {
    const { container: shot } = render(
      <Panel surface="artist" name="Ada" photoUrl={portrait} size={56} />,
    )
    expect(photo(shot)?.getAttribute('src')).toBe(portrait)
    expect(tint(shot)).not.toBeNull()

    const { container: drawn } = render(
      <Panel surface="artist" name="Ada" photoUrl={null} size={56} />,
    )
    expect(photo(drawn)).toBeNull()
    expect(tint(drawn)).toBeNull()
  })

  it('prefers event artwork over the portrait on an event surface', () => {
    const { container } = render(
      <Panel
        surface="event"
        name="Ada"
        artworkUrl={artwork}
        photoUrl={portrait}
        alt="Ada at the Bluebird"
        size={56}
      />,
    )
    expect(photo(container)?.getAttribute('src')).toBe(artwork)
  })

  // The locked rule: an artist surface has no artwork field to be handed, so
  // borrowing an event graphic is a compile error. This is the runtime half —
  // the type half is the @ts-expect-error, which fails the build if the
  // discriminator ever stops rejecting the field.
  it('never renders event artwork on an artist surface', () => {
    const smuggled: PanelProps = {
      surface: 'artist',
      name: 'Ada',
      photoUrl: null,
      size: 56,
      // @ts-expect-error An artist surface has no artwork field to be handed.
      artworkUrl: artwork,
    }
    const { container } = render(<Panel {...smuggled} />)
    expect(photo(container)).toBeNull()
    expect(container.innerHTML).not.toContain(artwork)
  })

  it('is decorative unless given an alt', () => {
    const { container: bare } = render(
      <Panel surface="artist" name="Ada" photoUrl={null} size={56} />,
    )
    expect(box(bare).getAttribute('aria-hidden')).toBe('true')

    const { container: labelled } = render(
      <Panel surface="artist" name="Ada" photoUrl={null} alt="Ada" size={56} />,
    )
    expect(labelled.firstElementChild?.getAttribute('aria-hidden')).toBeNull()
  })
})

describe('<FlexArt />', () => {
  it('grows into the row it is given and declares no ratio', () => {
    const { container } = render(
      <FlexArt surface="artist" name="Ada" photoUrl={null} />,
    )
    // A ratio here re-opens the taste-pick overflow of #763 r4.
    expect(box(container).style.aspectRatio).toBe('')
    expect(box(container).style.flex).toBe('1 1 0%')
    expect(box(container).style.minHeight).toBe('116px')
    expect(box(container).style.boxShadow).toBe(SLOT_HAIRLINE)
  })
})

describe('<AvatarSlot />', () => {
  it('is a 40px circle', () => {
    const { container } = render(<AvatarSlot name="Ada" photoUrl={null} />)
    expect(box(container).style.width).toBe('40px')
    expect(box(container).style.borderRadius).toBe(`${SLOT_RADIUS.avatar}px`)
  })
})
