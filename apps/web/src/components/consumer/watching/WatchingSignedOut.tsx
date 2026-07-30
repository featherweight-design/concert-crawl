import Link from 'next/link'
import { Eye } from 'lucide-react'
import { CONSUMER_COPY } from '@/components/consumer/definitions/copy'

const copy = CONSUMER_COPY.watching.signedOut

/**
 * The teaching state a visitor lands on when they tap the Watching tab with no
 * session. Takes no props and issues no fetch — a watch list is per-user
 * authenticated data, and this component exists precisely so the route can be
 * public while the payload stays gated.
 *
 * It teaches twice, in words and by example, because "Watching" is two features
 * in one word: a shortlist and a price tracker. Copy alone lands the shortlist
 * and drops the tracker.
 */

/**
 * The worked example. Marked as a sample three redundant ways — the dashed
 * container, the visible caption, and `aria-hidden` plus a screen-reader
 * alternative — because a screen-reader user mistaking these rows for their own
 * shows is the worst failure available on this page.
 */
function ExampleList() {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: '0.14em',
            color: 'var(--fg-subtle)',
          }}
        >
          {copy.exampleCaption}
        </span>
        <span className="h-px flex-1" style={{ background: 'var(--border)' }} />
      </div>

      <span className="sr-only">{copy.exampleAlt}</span>

      <div
        data-testid="watching-example"
        aria-hidden="true"
        className="flex flex-col gap-[7px] rounded-xl p-[9px]"
        style={{ border: '1px dashed var(--border-strong)' }}
      >
        {copy.exampleRows.map((row) => (
          <div
            key={row.artist}
            className="grid grid-cols-[34px_1fr_auto] items-center gap-2.5 rounded-[10px] px-2.5 py-2 sm:grid-cols-[40px_1fr_auto]"
            style={{
              background: 'var(--surface-1)',
              border: '1px solid var(--border)',
            }}
          >
            <span
              className="size-[34px] rounded-[7px] sm:size-10"
              style={{
                background:
                  'color-mix(in oklch, var(--signal) 12%, var(--surface-2))',
              }}
            />
            <span className="flex min-w-0 flex-col gap-0.5">
              <span
                className="truncate"
                style={{
                  fontFamily: 'var(--font-ui)',
                  fontSize: 13.5,
                  fontWeight: 700,
                  letterSpacing: '-0.01em',
                  color: 'var(--fg)',
                }}
              >
                {row.artist}
              </span>
              <span
                className="truncate"
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 9.5,
                  letterSpacing: '0.02em',
                  color: 'var(--fg-muted)',
                }}
              >
                {row.meta}
              </span>
            </span>
            <span className="flex flex-col items-end gap-0.5">
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 13,
                  fontWeight: 700,
                  color: 'var(--fg)',
                }}
              >
                {row.price}
              </span>
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 9.5,
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  color: row.tone,
                }}
              >
                {row.delta}
              </span>
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function FactList() {
  return (
    <div className="flex flex-col gap-[13px]">
      {copy.facts.map((fact) => (
        <div
          key={fact.key}
          className="grid grid-cols-[22px_1fr] items-start gap-2.5"
        >
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.12em',
              color: 'var(--signal)',
              paddingTop: 2,
            }}
          >
            {fact.key}
          </span>
          <span className="flex flex-col gap-[3px]">
            <span
              style={{
                fontFamily: 'var(--font-ui)',
                fontSize: 14,
                fontWeight: 700,
                letterSpacing: '-0.015em',
                color: 'var(--fg)',
              }}
            >
              {fact.title}
            </span>
            <span
              style={{
                fontFamily: 'var(--font-ui)',
                fontSize: 13,
                fontWeight: 500,
                lineHeight: 1.5,
                color: 'var(--fg-muted)',
              }}
            >
              {fact.body}
            </span>
          </span>
        </div>
      ))}
    </div>
  )
}

function Head() {
  return (
    <div className="flex flex-col gap-[9px]">
      <div className="flex items-center gap-[9px]">
        <span
          className="flex size-[34px] shrink-0 items-center justify-center rounded-[10px]"
          style={{
            background:
              'color-mix(in oklch, var(--signal) 14%, var(--surface-1))',
            border:
              '1px solid color-mix(in oklch, var(--signal) 34%, var(--border))',
            color: 'var(--signal)',
          }}
        >
          <Eye size={17} aria-hidden />
        </span>
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '0.14em',
            color: 'var(--fg-subtle)',
          }}
        >
          {copy.eyebrow}
        </span>
      </div>
      <h1
        style={{
          fontFamily: 'var(--font-ui)',
          fontSize: 32,
          fontWeight: 900,
          letterSpacing: '-0.035em',
          lineHeight: 1.08,
          color: 'var(--fg)',
        }}
      >
        {copy.title}
      </h1>
      <p
        style={{
          fontFamily: 'var(--font-ui)',
          fontSize: 14.5,
          fontWeight: 500,
          lineHeight: 1.55,
          color: 'var(--fg-muted)',
        }}
      >
        {copy.lede}
      </p>
    </div>
  )
}

function Cta() {
  return (
    <div className="flex flex-col gap-[9px]">
      <Link
        href={copy.signUpHref}
        className="flex min-h-11 items-center justify-center rounded-[10px]"
        style={{
          background: 'var(--signal)',
          color: 'var(--fg-on-accent)',
          fontFamily: 'var(--font-ui)',
          fontSize: 14,
          fontWeight: 700,
          letterSpacing: '-0.005em',
        }}
      >
        {copy.signUp}
      </Link>
      <span
        className="text-center"
        style={{
          fontFamily: 'var(--font-ui)',
          fontSize: 12.5,
          fontWeight: 500,
          color: 'var(--fg-muted)',
        }}
      >
        {copy.alreadyHaveAccount}{' '}
        <Link
          href={copy.signInHref}
          style={{
            color: 'var(--signal)',
            fontWeight: 700,
          }}
        >
          {copy.signIn}
        </Link>
      </span>
      <Link
        href={copy.keepBrowsingHref}
        className="flex min-h-11 items-center justify-center"
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: '0.1em',
          color: 'var(--fg-subtle)',
        }}
      >
        {copy.keepBrowsing}
      </Link>
    </div>
  )
}

export function WatchingSignedOut() {
  return (
    <main className="mx-auto w-full max-w-[880px] flex-1 px-4 pb-20 pt-4 sm:px-8 sm:pb-10 sm:pt-8">
      {/* DOM order matches reading order at both breakpoints: the two desktop
          columns are head+CTA and example+facts, so the CTA lands before the
          example in source and the visual order is a column reflow, not a
          reorder. */}
      <div className="grid grid-cols-1 items-start gap-5 sm:grid-cols-2 sm:gap-10">
        <div className="flex flex-col gap-5 sm:gap-[22px]">
          <Head />
          <Cta />
        </div>
        <div className="flex flex-col gap-5 sm:gap-[22px]">
          <ExampleList />
          <FactList />
        </div>
      </div>
    </main>
  )
}
