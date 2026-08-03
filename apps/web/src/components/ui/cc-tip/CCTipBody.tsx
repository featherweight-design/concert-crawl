'use client'

// Renders a TipContent record. Six shapes, one entry point, so a call site
// never authors tooltip markup.

import type { ReactNode } from 'react'
import { TIP_CHROME_COPY } from './definitions/copy'
import type { TipContent, TipTone } from './definitions/types'

const UI_FONT = { fontFamily: 'var(--font-ui)' }
const MONO_FONT = { fontFamily: 'var(--font-mono)' }

const TipParagraph = ({ children }: { children: ReactNode }) => (
  <p
    className="m-0 text-[13px] leading-[1.55] text-[var(--fg-muted)]"
    style={{ ...UI_FONT, textWrap: 'pretty' }}
  >
    {children}
  </p>
)

const TipRowTitle = ({ children }: { children: ReactNode }) => (
  <div
    className="text-[12.5px] font-bold tracking-[-0.005em] text-[var(--fg)]"
    style={UI_FONT}
  >
    {children}
  </div>
)

const TipRowBody = ({ children }: { children: ReactNode }) => (
  <div
    className="text-[12px] leading-[1.5] text-[var(--fg-muted)]"
    style={{ ...UI_FONT, textWrap: 'pretty' }}
  >
    {children}
  </div>
)

// Mirrors ChipStateDot's tones without pulling in the admin bundle.
const TONE_COLOR: Record<TipTone, string | null> = {
  neutral: null,
  good: 'var(--success)',
  warn: 'var(--warning)',
  bad: 'var(--danger)',
}

const TipDot = ({ tone }: { tone: TipTone }) => {
  const color = TONE_COLOR[tone]
  return (
    <span
      aria-hidden
      className="block h-[9px] w-[9px] flex-shrink-0 rounded-full"
      style={{
        background: color ?? 'transparent',
        border: `1.5px solid ${color ?? 'var(--border-strong)'}`,
        boxShadow:
          color === null
            ? 'none'
            : `0 0 0 3px color-mix(in oklab, ${color} 16%, transparent)`,
      }}
    />
  )
}

const TipGlyph = ({ good }: { good: boolean }) =>
  good ? (
    <svg width={11} height={11} viewBox="0 0 12 12" fill="none" aria-hidden>
      <path
        d="M2.2 6.4L4.8 9L9.8 3.2"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ) : (
    <svg width={10} height={10} viewBox="0 0 12 12" fill="none" aria-hidden>
      <path
        d="M2.5 2.5l7 7M9.5 2.5l-7 7"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  )

const TipSnippet = ({ good, text }: { good: boolean; text: string }) => {
  const color = good ? 'var(--success)' : 'var(--danger)'
  return (
    <div
      className="flex items-start gap-[7px] rounded-[7px] px-[9px] py-[6px]"
      style={{
        background: `color-mix(in oklab, ${color} 8%, var(--surface-1))`,
        border: `1px solid color-mix(in oklab, ${color} 26%, transparent)`,
      }}
    >
      <span
        className="mt-[1.5px] inline-flex flex-shrink-0"
        style={{ color }}
        aria-hidden
      >
        <TipGlyph good={good} />
      </span>
      <span
        className="text-[11px] leading-[1.45] tracking-[0.01em] text-[var(--fg)]"
        style={MONO_FONT}
      >
        {text}
      </span>
    </div>
  )
}

const TipList = ({
  heading,
  items,
  good,
}: {
  heading: string
  items: readonly string[]
  good: boolean
}) => {
  const color = good ? 'var(--success)' : 'var(--danger)'
  return (
    <div className="flex flex-col gap-[6px]">
      <span
        className="text-[9.5px] font-bold uppercase tracking-[0.14em]"
        style={{ ...MONO_FONT, color }}
      >
        {heading}
      </span>
      <ul className="m-0 flex list-none flex-col gap-[5px] p-0">
        {items.map((item) => (
          <li key={item} className="flex items-start gap-2">
            <span
              className="mt-[2px] inline-flex flex-shrink-0"
              style={{ color }}
              aria-hidden
            >
              <TipGlyph good={good} />
            </span>
            <span
              className="text-[12.5px] leading-[1.45] text-[var(--fg-muted)]"
              style={{ ...UI_FONT, textWrap: 'pretty' }}
            >
              {item}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export const CCTipBody = ({ tip }: { tip: TipContent }) => {
  if (tip.variant === 'text') return <TipParagraph>{tip.body}</TipParagraph>

  if (tip.variant === 'titled')
    return (
      <div className="flex flex-col gap-[5px]">
        <div
          className="text-[13.5px] font-extrabold tracking-[-0.01em] text-[var(--fg)]"
          style={UI_FONT}
        >
          {tip.title}
        </div>
        <TipParagraph>{tip.body}</TipParagraph>
      </div>
    )

  if (tip.variant === 'defs')
    return (
      <div className="flex flex-col gap-[10px]">
        {tip.intro !== undefined && <TipParagraph>{tip.intro}</TipParagraph>}
        <div className="flex flex-col">
          {tip.rows.map((row, idx) => (
            <div
              key={row.title}
              className={`flex gap-[10px] py-[10px] ${idx > 0 ? 'border-t border-[var(--border)]' : ''}`}
            >
              <span className="pt-1">
                <TipDot tone={row.tone} />
              </span>
              <div className="flex min-w-0 flex-col gap-[2px]">
                <TipRowTitle>{row.title}</TipRowTitle>
                <TipRowBody>{row.body}</TipRowBody>
              </div>
            </div>
          ))}
        </div>
      </div>
    )

  if (tip.variant === 'steps')
    return (
      <div className="flex flex-col gap-[10px]">
        <ol className="m-0 flex list-none flex-col gap-[9px] p-0">
          {tip.steps.map((step, idx) => (
            <li key={step} className="flex items-start gap-[10px]">
              <span
                aria-hidden
                className="mt-px inline-flex h-[19px] w-[19px] flex-shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-[var(--signal)]"
                style={{
                  ...MONO_FONT,
                  border:
                    '1px solid color-mix(in oklab, var(--signal) 45%, transparent)',
                  background:
                    'color-mix(in oklab, var(--signal) 12%, transparent)',
                }}
              >
                {idx + 1}
              </span>
              <span
                className="text-[12.5px] leading-[1.5] text-[var(--fg-muted)]"
                style={{ ...UI_FONT, textWrap: 'pretty' }}
              >
                {step}
              </span>
            </li>
          ))}
        </ol>
        {tip.footer !== undefined && (
          <div
            className="border-t border-[var(--border)] pt-[9px] text-[10.5px] leading-[1.5] tracking-[0.02em] text-[var(--fg-subtle)]"
            style={MONO_FONT}
          >
            {tip.footer}
          </div>
        )}
      </div>
    )

  if (tip.variant === 'example')
    return (
      <div className="flex flex-col">
        {tip.rows.map((row, idx) => (
          <div
            key={row.title}
            className={`flex flex-col gap-[7px] py-[11px] ${idx > 0 ? 'border-t border-[var(--border)]' : ''}`}
          >
            <TipRowTitle>{row.title}</TipRowTitle>
            <TipRowBody>{row.body}</TipRowBody>
            <div className="flex flex-col gap-1">
              <TipSnippet good text={row.say} />
              <TipSnippet good={false} text={row.not} />
            </div>
          </div>
        ))}
      </div>
    )

  return (
    <div className="flex flex-col gap-3">
      <TipList heading={TIP_CHROME_COPY.do} items={tip.dos} good />
      <TipList heading={TIP_CHROME_COPY.dont} items={tip.donts} good={false} />
    </div>
  )
}
