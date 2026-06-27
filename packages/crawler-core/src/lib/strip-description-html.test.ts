import { describe, it, expect } from 'vitest'
import { stripDescriptionHtml } from './strip-description-html.js'

describe('stripDescriptionHtml', () => {
  it('returns empty string for empty input', () => {
    expect(stripDescriptionHtml('')).toBe('')
  })

  it('returns empty string for null-like input safely', () => {
    // The helper is typed as (html: string) — but defensive callers will
    // pass through undefined/null via the description-optional chain. The
    // function must not throw on falsy input.
    // @ts-expect-error — exercising defensive runtime behaviour
    expect(stripDescriptionHtml(null)).toBe('')
    // @ts-expect-error — exercising defensive runtime behaviour
    expect(stripDescriptionHtml(undefined)).toBe('')
  })

  it('is a no-op on already-clean plaintext', () => {
    const clean =
      'An evening with The Cure For Paranoia. Doors at 7pm, show at 8pm.'
    expect(stripDescriptionHtml(clean)).toBe(clean)
  })

  it('strips <p> tags around prose (Gothic Theatre prod example)', () => {
    const input = "<p>NPR's Tiny Desk Contest is back on the road in 2026!</p>"
    expect(stripDescriptionHtml(input)).toBe(
      "NPR's Tiny Desk Contest is back on the road in 2026!",
    )
  })

  it('preserves paragraph breaks between <p> blocks as blank lines', () => {
    const input = '<p>First paragraph here.</p><p>Second paragraph here.</p>'
    expect(stripDescriptionHtml(input)).toBe(
      'First paragraph here.\n\nSecond paragraph here.',
    )
  })

  it('handles mixed plaintext + HTML (Gothic "Supporting: …" shape)', () => {
    const input = [
      'Supporting: DOGTAGS, Lauren Frihauf',
      '',
      "<p>NPR's Tiny Desk Contest is back on the road in 2026!</p>",
      "<p>This year's winner is Cure For Paranoia.</p>",
    ].join('\n')
    expect(stripDescriptionHtml(input)).toBe(
      [
        'Supporting: DOGTAGS, Lauren Frihauf',
        '',
        "NPR's Tiny Desk Contest is back on the road in 2026!",
        '',
        "This year's winner is Cure For Paranoia.",
      ].join('\n'),
    )
  })

  it('decodes named HTML entities (&amp;, &nbsp;, &quot;, &lt;, &gt;, &apos;)', () => {
    expect(stripDescriptionHtml('Sleater-Kinney &amp; Bikini Kill')).toBe(
      'Sleater-Kinney & Bikini Kill',
    )
    // &nbsp; collapses to a regular space (and any extra runs collapse).
    expect(stripDescriptionHtml('Big&nbsp;Thief')).toBe('Big Thief')
    expect(stripDescriptionHtml('&quot;Live&quot;')).toBe('"Live"')
    expect(stripDescriptionHtml('&lt;heart&gt;')).toBe('<heart>')
    expect(stripDescriptionHtml('rock &apos;n&apos; roll')).toBe(
      "rock 'n' roll",
    )
  })

  it('decodes numeric HTML entities (decimal and hex)', () => {
    // &#38; = &, &#039; = ', &#x27; = ', &#x2014; = em dash
    expect(stripDescriptionHtml('Earth&#38;Fire')).toBe('Earth&Fire')
    expect(stripDescriptionHtml('Hugh&#039;s Set')).toBe("Hugh's Set")
    expect(stripDescriptionHtml('Hugh&#x27;s Set')).toBe("Hugh's Set")
    expect(stripDescriptionHtml('Foo &#x2014; Bar')).toBe('Foo — Bar')
  })

  it('treats <br> and <br /> as newlines', () => {
    expect(stripDescriptionHtml('line one<br>line two')).toBe(
      'line one\nline two',
    )
    expect(stripDescriptionHtml('line one<br />line two')).toBe(
      'line one\nline two',
    )
    expect(stripDescriptionHtml('line one<br/>line two')).toBe(
      'line one\nline two',
    )
  })

  it('flattens nested tags but preserves inner text', () => {
    expect(stripDescriptionHtml('<p><strong>Headliner</strong> show</p>')).toBe(
      'Headliner show',
    )
  })

  it('treats <li> as a tight block (single newline between items)', () => {
    expect(
      stripDescriptionHtml(
        '<ul><li>first</li><li>second</li><li>third</li></ul>',
      ),
    ).toBe('first\nsecond\nthird')
  })

  it('treats <div> as a paragraph-level block (blank line between blocks)', () => {
    expect(stripDescriptionHtml('<div>top</div><div>bottom</div>')).toBe(
      'top\n\nbottom',
    )
  })

  it('collapses runs of inline whitespace inside a line', () => {
    expect(stripDescriptionHtml('foo    bar\t\tbaz')).toBe('foo bar baz')
  })

  it('trims leading and trailing whitespace + tag droppings', () => {
    expect(stripDescriptionHtml('  <p>  hello  </p>  ')).toBe('hello')
  })

  it('is idempotent — running twice yields the same output as once', () => {
    const input = '<p>NPR&#039;s Tiny Desk &amp; Friends</p><br><p>Round 2</p>'
    const once = stripDescriptionHtml(input)
    const twice = stripDescriptionHtml(once)
    expect(twice).toBe(once)
  })

  it('preserves Unicode characters (emoji, accented letters)', () => {
    expect(stripDescriptionHtml('<p>Beyoncé &amp; friends 🎶</p>')).toBe(
      'Beyoncé & friends 🎶',
    )
  })

  it('handles empty tags without producing stray whitespace', () => {
    expect(stripDescriptionHtml('<p></p><p>real content</p>')).toBe(
      'real content',
    )
  })

  // #844 Copilot R1 — entity decode in step 3 can promote `&lt;heart&gt;`
  // to literal `<heart>` in the output. The remaining-tag strip in step 2
  // must NOT then delete `<heart>` on a subsequent pass, since it isn't
  // a known HTML tag — it's plausible user content (ASCII-art emoji,
  // lyrics, etc.). Restricting step 2 to a known-tag whitelist preserves
  // the round-trip / idempotency contract for this class of input.
  it("preserves angle-bracketed text that isn't a known HTML tag", () => {
    const input = 'love &lt;heart&gt; you'
    const once = stripDescriptionHtml(input)
    expect(once).toBe('love <heart> you')
    const twice = stripDescriptionHtml(once)
    expect(twice).toBe(once)
  })

  it('preserves common non-HTML angle-bracket text like <3 / <- after decode', () => {
    expect(stripDescriptionHtml('feeling &lt;3 tonight')).toBe(
      'feeling <3 tonight',
    )
    expect(stripDescriptionHtml('arrow &lt;-- here')).toBe('arrow <-- here')
  })

  // #844 Copilot R2 — entity-escaped HTML tags (e.g. `&lt;p&gt;Hello&lt;/p&gt;`)
  // used to survive the pipeline because the prior order stripped tags
  // BEFORE decoding entities, leaving literal `<p>` tags in the output.
  // Decoding first promotes the entities to real tags so the block-strip
  // catches them.
  it('strips entity-escaped block tags after decoding (e.g. &lt;p&gt;)', () => {
    expect(stripDescriptionHtml('&lt;p&gt;Hello&lt;/p&gt;')).toBe('Hello')
    expect(
      stripDescriptionHtml('&lt;p&gt;One&lt;/p&gt;&lt;p&gt;Two&lt;/p&gt;'),
    ).toBe('One\n\nTwo')
  })

  it('decodes uppercase hex entities (&#X...;)', () => {
    expect(stripDescriptionHtml('Foo &#X2014; Bar')).toBe('Foo — Bar')
  })
})
