// @vitest-environment jsdom

import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render } from '@testing-library/react'

import { AvatarSlot } from '../AvatarSlot'
import { FlexArt } from '../FlexArt'
import { HeroBand } from '../HeroBand'
import { Panel, type PanelProps } from '../Panel'
import { SLOT_HAIRLINE, SLOT_RADIUS } from '../definitions/constants'
import { bandField } from '../lib/band-field'
import { slotScaleFor } from '../lib/slot-metrics'
import { identityFor } from '../../identity-art/IdentityArt'

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

  it('takes an explicit scale when it is sized in CSS rather than px', () => {
    // `'100%'` alone derives `tile`. A band panel is 128/208 and says `hero`.
    // Scale no longer changes WHICH template a name resolves to (that made
    // Browse and the detail hero draw different artwork for one artist), so
    // the observable is density: `tpl_stripes` walks 8 slots at hero against 6
    // at tile, keeps the even ones, and draws each kept stripe twice over a
    // background rect. The rect count is what that works out to, 9 against 7,
    // not the slot count and not the visible stripe count.
    const striped = Array.from({ length: 200 }, (_, i) => `Band ${i}`).find(
      (name) => identityFor(name, 'artist').template.id === 'stripes',
    )
    if (!striped) throw new Error('no name in the sample resolves to stripes')

    const { container: derived } = render(
      <Panel surface="artist" name={striped} photoUrl={null} size="100%" />,
    )
    const { container: stated } = render(
      <Panel
        surface="artist"
        name={striped}
        photoUrl={null}
        size="100%"
        scale="hero"
      />,
    )
    const bands = (root: HTMLElement) => root.querySelectorAll('rect').length

    expect(bands(stated)).toBe(9)
    expect(bands(derived)).toBe(7)
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

describe('bandField', () => {
  it('draws from the art palette when nothing but generated art resolves', () => {
    const { palette } = identityFor('Ada', 'artist', { scale: 'hero' })
    const field = bandField('Ada', { surface: 'artist', photoUrl: null })
    expect(field).toContain(palette.primary)
    expect(field).toContain('in srgb')
  })

  it('falls back to tokens for a photograph, which cannot be sampled', () => {
    const field = bandField('Ada', { surface: 'artist', photoUrl: portrait })
    expect(field).toContain('var(--surface-2)')
    expect(field).not.toContain('#')
  })

  it('treats an event with only a portrait as a photograph too', () => {
    const field = bandField('Ada', {
      surface: 'event',
      artworkUrl: null,
      photoUrl: portrait,
    })
    expect(field).toContain('var(--surface-2)')
  })
})

describe('<HeroBand />', () => {
  const band = (root: HTMLElement) => {
    const found = root.querySelector('[data-testid="hero-band"]')
    if (!(found instanceof HTMLElement)) throw new Error('no band rendered')
    return found
  }

  it.each([
    ['generated', { surface: 'artist', photoUrl: null } as const],
    ['portrait', { surface: 'artist', photoUrl: portrait } as const],
    [
      'artwork',
      { surface: 'event', artworkUrl: artwork, photoUrl: null } as const,
    ],
  ])('renders a band from a %s source', (_label, source) => {
    const { container } = render(
      <HeroBand name="Ada" {...source}>
        <h1>{'Ada'}</h1>
      </HeroBand>,
    )
    expect(band(container).style.background).not.toBe('')
    expect(container.querySelector('h1')?.textContent).toBe('Ada')
  })

  // The backdrop is the band's first child by design — it has to sit under
  // everything — so the content assertions below start after it.
  const leadingContent = (root: HTMLElement) => band(root).children[1] ?? null

  const backdrop = (root: HTMLElement) => {
    const found = root.querySelector('[data-testid="hero-band-art"]')
    if (!(found instanceof HTMLElement)) throw new Error('no backdrop rendered')
    return found
  }

  // The reason the backdrop exists: a photographed event used to leave the
  // band's dead space as flat ground, so the source that already has a
  // picture is the one that most needs covering.
  it.each([
    ['generated', { surface: 'artist', photoUrl: null } as const],
    ['portrait', { surface: 'artist', photoUrl: portrait } as const],
    [
      'artwork',
      { surface: 'event', artworkUrl: artwork, photoUrl: null } as const,
    ],
  ])('draws a decorative backdrop behind a %s source', (_label, source) => {
    const { container } = render(
      <HeroBand name="Ada" {...source}>
        <h1>{'Ada'}</h1>
      </HeroBand>,
    )
    const art = backdrop(container)
    expect(art.getAttribute('aria-hidden')).toBe('true')
    // Decorative twice over: hidden from AT, and inert to the pointer so it
    // can never eat a tap meant for the back control.
    expect(art.querySelector('svg')).not.toBeNull()
    expect(band(container).firstElementChild).toBe(art)
  })

  it('turns the backdrop off the panel so the two never match', () => {
    const { container } = render(
      <HeroBand surface="artist" name="Ada" photoUrl={null}>
        <h1>{'Ada'}</h1>
      </HeroBand>,
    )
    const natural = identityFor('Ada', 'artist', { scale: 'hero' }).rotate
    const expected = ((natural + 2) % 4) * 90
    const rotated = backdrop(container).querySelector('svg > g')
    expect(rotated?.getAttribute('transform')).toBe(
      `rotate(${expected} 200 200)`,
    )
    // The point of the offset — with a generated source the panel is drawing
    // the same mark, and an equal rotation would duplicate it.
    expect(expected).not.toBe(natural * 90)
  })

  it('keeps the panel from squeezing the type column at 320px', () => {
    const { container } = render(
      <HeroBand surface="artist" name="Ada" photoUrl={null}>
        <h1>{'Ada'}</h1>
      </HeroBand>,
    )
    const row = band(container).querySelector('.flex.items-start')
    const [art, type] = Array.from(row?.children ?? [])
    // The panel steps 128 → 208 in CSS; the column must be free to shrink or
    // the band overflows the 320px baseline.
    expect(art?.className).toContain('w-32')
    expect(art?.className).toContain('sm:w-52')
    expect(type?.className).toContain('min-w-0')
    expect(type?.className).toContain('flex-1')
  })

  it('draws no row above the band when it has neither control', () => {
    const { container } = render(
      <HeroBand surface="artist" name="Ada" photoUrl={null}>
        <h1>{'Ada'}</h1>
      </HeroBand>,
    )
    expect(leadingContent(container)?.className).toContain('items-start')
  })

  it('leads with back and trails with actions when both are given', () => {
    const { container } = render(
      <HeroBand
        surface="artist"
        name="Ada"
        photoUrl={null}
        back={<button type="button">{'back'}</button>}
        actions={<button type="button">{'share'}</button>}
      >
        <h1>{'Ada'}</h1>
      </HeroBand>,
    )
    const controls = leadingContent(container)
    expect(controls?.className).toContain('justify-between')
    expect(controls?.children[0]?.textContent).toBe('back')
    expect(controls?.children[1]?.textContent).toBe('share')
  })
})
